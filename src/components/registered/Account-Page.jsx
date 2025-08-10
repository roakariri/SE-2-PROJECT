import React from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";

const DEFAULT_AVATAR = "/logo-icon/profile-icon.svg";

const AccountPage = () => {
    const [activeTab, setActiveTab] = React.useState("homebase");
    const navigate = useNavigate();
    const { signOut } = UserAuth();
    const [userName, setUserName] = React.useState("");
    const [session, setSession] = React.useState(null);
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [profilePic, setProfilePic] = React.useState(DEFAULT_AVATAR);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [successMsg, setSuccessMsg] = React.useState(""); // Success message state
    const [email, setEmail] = React.useState(""); // Editable email state
    const [currentPassword, setCurrentPassword] = React.useState(""); // Current password state
    const [newPassword, setNewPassword] = React.useState(""); // New password state
    const [repeatPassword, setRepeatPassword] = React.useState(""); // Repeat password state
    const [isCurrentPasswordIncorrect, setIsCurrentPasswordIncorrect] = React.useState(false); // Current password validation state
    const [passwordSuccessMsg, setPasswordSuccessMsg] = React.useState(""); // Password change success message state
    const [addressForm, setAddressForm] = React.useState({
        first_name: "",
        last_name: "",
        street: "",
        province: "",
        city: "",
        postal_code: "",
        phone_number: "",
        address_type: "home",
        is_default: false,
    });

    // Fetch user and profile info
    const fetchUserAndProfile = React.useCallback(async () => {
        const { supabase } = await import("../../supabaseClient");
        // Get session from Supabase Auth
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        let displayName = session?.user?.user_metadata?.display_name || "User";
        setEmail(session?.user?.email || "");
        if (session?.user) {
            // Ensure a profile row exists for this user
            await supabase
                .from("profiles")
                .upsert({ user_id: session.user.id });

            // Fetch profile picture from profiles table
            const { data: profileData } = await supabase
                .from("profiles")
                .select("avatar_url")
                .eq("user_id", session.user.id)
                .single();
            if (profileData && profileData.avatar_url) {
                setProfilePic(profileData.avatar_url + "?t=" + Date.now());
            } else {
                setProfilePic(DEFAULT_AVATAR);
            }
            // Set first and last name from display_name
            const nameParts = displayName.split(" ");
            setFirstName(nameParts[0] || "");
            setLastName(nameParts[1] || "");
        }
    }, []);

    // Fetch on mount and when switching to profile tab
    React.useEffect(() => {
        fetchUserAndProfile();
    }, [fetchUserAndProfile]);

    React.useEffect(() => {
        if (activeTab === "profile") {
            fetchUserAndProfile();
        }
        // eslint-disable-next-line
    }, [activeTab]);

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setProfilePic(URL.createObjectURL(file)); // Show preview
        }
    };

    const handleSaveChanges = async () => {
        const { supabase } = await import("../../supabaseClient");
        const user = session?.user;
        if (!user) return;

        let avatar_url = null;

        // If a new file is selected, upload it
        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = fileName;

            // Upload to Supabase Storage (avatars bucket)
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, selectedFile, { upsert: true });

            if (uploadError) {
                alert("Error uploading profile picture: " + uploadError.message);
                console.error("Error uploading profile picture:", uploadError.message);
                return;
            }

            // Get public URL
            const { data: publicData } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            avatar_url = publicData?.publicUrl;
        } else {
            // If no new file, keep the current avatar_url from DB
            const { data: profileData } = await supabase
                .from("profiles")
                .select("avatar_url")
                .eq("user_id", user.id)
                .single();
            avatar_url = profileData?.avatar_url || DEFAULT_AVATAR;
        }

        // Update display_name and email in Supabase Auth
        const updates = {
            email: email,
            data: {
                display_name: `${firstName} ${lastName}`.trim(),
            },
        };
        const { error } = await supabase.auth.updateUser(updates);
        if (error) {
            alert("Error updating profile: " + error.message);
            console.error("Error updating profile:", error.message);
            if (error.message.toLowerCase().includes("expired")) {
                alert("The confirmation link has expired or is invalid. Please try updating your email again.");
            }
            return;
        }

        // Update avatar_url in profiles table (not upsert)
        if (user.id) {
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url })
                .eq("user_id", user.id);
            if (updateError) {
                alert("Error updating profile picture: " + updateError.message);
                console.error("Error updating profile picture URL to profiles table:", updateError.message);
                return;
            }
        }

        setSelectedFile(null);
        setSuccessMsg("Profile updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
        // Refetch profile to update UI in real time
        fetchUserAndProfile();
    };

    const handleSavePasswordChanges = async () => {
        const { supabase } = await import("../../supabaseClient");
        const user = session?.user;
        if (!user) return;

        // Validate current password
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword,
        });

        if (signInError) {
            setIsCurrentPasswordIncorrect(true);
            return;
        } else {
            setIsCurrentPasswordIncorrect(false);
        }

        // Validate new password and repeat password match
        if (newPassword !== repeatPassword) {
            alert("New password and repeat password do not match.");
            return;
        }

        // Update password in Supabase Auth
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) {
            alert("Error updating password: " + error.message);
            console.error("Error updating password:", error.message);
            return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setRepeatPassword("");
        setPasswordSuccessMsg("Password updated successfully!");
        setTimeout(() => setPasswordSuccessMsg(""), 3000);
    };

    const handleAddressChange = (e) => {
        const { name, value, type, checked } = e.target;
        setAddressForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleAddressSubmit = async (e) => {
        e.preventDefault();
        if (!session?.user?.id) return;
        const { error } = await supabase
            .from("addresses")
            .insert({
                ...addressForm,
                user_id: session.user.id,
            });
        if (!error) {
            setAddressForm({
                first_name: "",
                last_name: "",
                street: "",
                province: "",
                city: "",
                postal_code: "",
                phone_number: "",
                address_type: "home",
                is_default: false,
            });
        }
    };

    return (
        <div className="min-h-screen w-full bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <div className="flex flex-row justify-center gap-[100px]  h-full p-4 px-[100px]">
                {/*Account Page Nav*/}
                <div className="flex flex-col rounded-lg p-4">
                    <div className="flex flex-col justify-center p-0">
                        <h1 className="text-2xl font-bold mb-4 text-black">
                            Welcome, {session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.full_name || userName}.
                        </h1>
                    </div>
                    <div className="flex flex-col border border-black rounded w-[300px] justify-center">
                        <div className="border border-black rounded w-[300px] h-[244px]" style={{ lineHeight: "50px" }}>
                            <button
                                className={`w-full border text-left text-[18px] font-dm-sans text-black font-semibold bg-transparent rounded-none outline-none p-0 px-3 hover:bg-[#c4c4c4] ${activeTab === "homebase" ? "bg-[#eaeaea]" : ""}`}
                                onClick={() => setActiveTab("homebase")}
                            >Homebase</button>
                            <button
                                className={`w-full border text-left text-[18px] font-dm-sans text-black font-semibold bg-transparent rounded-none outline-none p-0 px-3 hover:bg-[#c4c4c4] ${activeTab === "orders" ? "bg-[#eaeaea]" : ""}`}
                                onClick={() => setActiveTab("orders")}
                            >Orders</button>
                            <button
                                className={`w-full border text-left text-[18px] font-dm-sans text-black font-semibold bg-transparent rounded-none outline-none p-0 px-3 hover:bg-[#c4c4c4] ${activeTab === "profile" ? "bg-[#eaeaea]" : ""}`}
                                onClick={() => setActiveTab("profile")}
                            >Profile</button>
                            <hr className="my-2 border-black mb-4" />
                            <button
                                className="w-full border text-left text-[18px] font-dm-sans text-black font-semibold bg-transparent rounded-none outline-none p-0 px-3 hover:bg-[#c4c4c4]"
                                onClick={async () => {
                                    await signOut();
                                    navigate("/");
                                }}
                            >Logout</button>
                        </div>
                    </div>
                </div>

                {/*Homebase*/}
                {activeTab === "homebase" && (
                    <div className="flex flex-col rounded-lg p-4 w-[80vw]">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                        <div>
                            <p className="text-[24px] text-black font-dm-sans">Your Last Order</p>
                            <p className="mt-7">You have not placed any orders.</p>
                        </div>
                        <div className="mt-[50px]">
                            <p className="text-[24px] text-black font-dm-sans">Your Last Order</p>
                            <p className="mt-7">You have not placed any orders.</p>
                        </div>
                    </div>
                )}

                {/*Orders*/}
                {activeTab === "orders" && (
                    <div className="flex flex-col rounded-lg p-4 w-[80vw] border">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                        <div>
                            <p className="text-[24px] text-black font-dm-sans">Orders</p>
                        </div>
                        <div className="mt-[50px]">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder="Search by Order # or Product Name"
                                    className="w-1000px] rounded-full border border-gray-300 py-4 pl-8 pr-12 text-[24px] text-gray-400 font-dm-sans focus:outline-none bg-white"
                                />
                                <span className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                </span>
                            </div>
                            <div className="flex justify-end mt-2">
                                <span className="text-gray-500 text-[18px] font-dm-sans">Showing 0 Orders</span>
                            </div>
                        </div>
                    </div>
                )}

                {/*Profile*/}
                {activeTab === "profile" && (
                    <div className="flex flex-col rounded-lg p-4 w-[80vw] ">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                        <div className="mt-6">
                            <p className="text-[24px] text-black font-dm-sans">Personal Information</p>
                            <p className="mt-10 font-dm-sans text-black">MY INFORMATION</p>
                            <div className="flex flex-row gap-10 mt-8 items-start">
                                {/* Profile Picture Upload */}
                                <div className="relative flex flex-col items-center">
                                    <img
                                        src={profilePic || DEFAULT_AVATAR}
                                        alt="Profile"
                                        className="w-32 h-32 rounded-full object-cover bg-gray-300"
                                    />
                                    <label htmlFor="profilePicUpload" className="absolute bottom-2 left-20 cursor-pointer bg-white rounded-full p-1 shadow-md border border-gray-300">
                                        <img src="/logo-icon/camera-icon.svg" alt="Upload" className="w-6 h-6" />
                                        <input
                                            id="profilePicUpload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleProfilePicChange}
                                        />
                                    </label>
                                </div>
                                {/* Profile Form */}
                                <form className="flex-1 grid grid-cols-2 gap-6">
                                    <div className="flex flex-col col-span-1">
                                        <label className="text-black font-dm-sans mb-2">First Name</label>
                                        <input
                                            type="text"
                                            className="border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            placeholder={session?.user?.user_metadata?.display_name?.split(' ')[0] || "User"}
                                        />
                                    </div>
                                    <div className="flex flex-col col-span-1">
                                        <label className="text-black font-dm-sans mb-2">Last Name</label>
                                        <input
                                            type="text"
                                            className="border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            placeholder={session?.user?.user_metadata?.display_name?.split(' ')[2] || "User"}
                                        />
                                    </div>
                                    <div className="flex flex-col col-span-2">
                                        <label className="text-black font-dm-sans mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            className="border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="user@gmail.com"
                                            readOnly
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="flex w-full justify-end mt-6">

                                <button
                                    type="button"
                                    className="bg-[#3B5B92] text-white font-bold font-dm-sans px-6 py-2 rounded-md hover:bg-[#2a4370] focus:outline-none focus:ring-0"
                                    onClick={handleSaveChanges}
                                >
                                    {successMsg ? successMsg : "Save Changes"}
                                </button>
                            </div>
                        </div>
                        <hr className="my-2 border-black mb-4 mt-5" />

                        {/*Change Password*/}
                        <div>
                            <p className="mt-10 font-dm-sans text-black">CHANGE PASSWORD</p>
                            <form className="mt-7 w-full">
                                <p className="font-dm-sans">Current Password</p>
                                <div className="relative">
                                    <input
                                        type="password"
                                        className="w-[49%] border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        placeholder="Enter your current password"
                                    />
                                    {isCurrentPasswordIncorrect && (
                                        <span className="ml-4 text-red-600">
                                            Incorrect password!!
                                        </span>
                                    )}
                                </div>
                            </form>

                            <a href="/forgot-password">Forgot Password?</a>

                            <form className="mt-2 w-full grid grid-cols-2 gap-4">
                                <div>
                                    <p className="font-dm-sans">New Password</p>
                                    <input
                                        type="password"
                                        className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Enter your new password"
                                    />
                                </div>
                                <div>
                                    <p className="font-dm-sans">Repeat Password</p>
                                    <input
                                        type="password"
                                        className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                        value={repeatPassword}
                                        onChange={e => setRepeatPassword(e.target.value)}
                                        placeholder="Repeat password"
                                    />
                                </div>
                            </form>

                            <div className="flex justify-end mt-4">
                                <button
                                    type="button"
                                    className="bg-[#3B5B92] text-white font-bold font-dm-sans px-6 py-2 rounded-md hover:bg-[#2a4370] focus:outline-none focus:ring-0"
                                    onClick={() => {
                                        if (!isCurrentPasswordIncorrect) {
                                            handleSavePasswordChanges();
                                        }
                                    }}
                                >
                                    {passwordSuccessMsg ? passwordSuccessMsg : "Save Changes"}
                                </button>
                            </div>
                        </div>

                        <hr className="my-2 border-black mb-4 mt-5" />


                        <div>
                            {/*Saved Address*/}
                            <p className="mt-10 text-black font-dm-sans">SAVED ADDRESSES</p>
                            <div className="grid grid-cols-3 gap-5">
                                <div className="border p-5 w-[295px] border-black rounded">
                                    <p>Users</p>
                                    <p>Philippines  </p>

                                    <div className="flex flex-row w-full">
                                        <div className="w-full">
                                            <button className="h-[30px] w-[58] text-[10px] mt-6">
                                                DEFAULT
                                            </button>
                                        </div>
                                        <div className="flex ml-[15px] flex-row justify-end gap-2">
                                            <button className="h-[30px] w-[58] text-[8px] mt-6">
                                                DEFAULT
                                            </button>
                                            <button className="h-[30px] w-[58] text-[8px] mt-6">
                                                DEFAULT
                                            </button>
                                        </div>

                                    </div>

                                </div>


                                <div className=" ml-[40px] flex flex-col justify-center align-center ">
                                    <button
                                        type="button"
                                        className="border border-black rounded-full w-16 h-16 flex items-center justify-center bg-white hover:bg-[#f0f0f0] shadow-md"
                                        aria-label="Add Address"
                                    >
                                        <img src="/logo-icon/add-icon.svg"></img>

                                    </button>
                                </div>
                            </div>

                            {/*Address Editor*/}
                            <div className="w-full p-2 bg-[#F7F7F7] mt-5 border border-dashed border-[#c5c5c5]">
                                <p className="mt-5 text-black font-dm-sans">EDIT ADDRESSES</p>
                                <form onSubmit={handleAddressSubmit} className="w-full">
                                    {/* All address fields and controls go here, preserving your layout */}
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <p className="text-[16px] mt-2 font-dm-sans">Name</p>
                                            <input
                                                type="text"
                                                className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                                placeholder="Name"
                                                name="first_name"
                                                value={addressForm.first_name}
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[16px] mt-2 font-dm-sans">Surname</p>
                                            <input
                                                type="text"
                                                className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                                placeholder="Last Name"
                                                name="last_name"
                                                value={addressForm.last_name}
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <p className="text-[16px] mt-2 font-dm-sans">Street Name/Building/House No.</p>
                                        <input
                                            type="text"
                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                            placeholder="Street Name/Building/House No."
                                            name="street"
                                            value={addressForm.street}
                                            onChange={handleAddressChange}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <p className="text-[16px] mt-2 font-dm-sans">Province</p>
                                            <input
                                                type="text"
                                                className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                                placeholder="Province"
                                                name="province"
                                                value={addressForm.province}
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[16px] mt-2 font-dm-sans">City</p>
                                            <input
                                                type="text"
                                                className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                                placeholder="City"
                                                name="city"
                                                value={addressForm.city}
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[16px] mt-2 font-dm-sans">Postal Code/Zip Code</p>
                                            <input
                                                type="text"
                                                className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                                placeholder="Postal Code/Zip Code"
                                                name="postal_code"
                                                value={addressForm.postal_code}
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[16px] mt-2 font-dm-sans">Phone Number</p>
                                            <input
                                                type="text"
                                                className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                                placeholder="Phone Number"
                                                name="phone_number"
                                                value={addressForm.phone_number}
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[16px] mt-4 font-dm-sans">Label As</p>
                                    <div className="flex justify-start mt-2 gap-4">
                                        <button type="button" className="w-[202px] h-[40px] bg-white text-black border border-black"
                                            onClick={() => setAddressForm(f => ({ ...f, address_type: 'work' }))}
                                            style={{ backgroundColor: addressForm.address_type === 'work' ? '#3B5B92' : 'white', color: addressForm.address_type === 'work' ? 'white' : 'black' }}
                                        >Work</button>
                                        <button type="button" className="w-[202px] h-[40px] bg-white text-black border border-black"
                                            onClick={() => setAddressForm(f => ({ ...f, address_type: 'home' }))}
                                            style={{ backgroundColor: addressForm.address_type === 'home' ? '#3B5B92' : 'white', color: addressForm.address_type === 'home' ? 'white' : 'black' }}
                                        >Home</button>
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 text-[#3B5B92]"
                                                name="is_default"
                                                checked={addressForm.is_default}
                                                onChange={handleAddressChange}
                                            />
                                            <span className="text-black font-dm-sans">Set as default address</span>
                                        </label>
                                    </div>
                                    <div className="flex justify-end mt-6">
                                        <button
                                            type="button"
                                            className="bg-[#3B5B92] text-white font-bold font-dm-sans px-6 py-2 rounded-md hover:bg-[#2a4370] focus:outline-none focus:ring-0"
                                            onClick={handleAddressSubmit}
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                )}


            </div>
        </div>
    );
};

export default AccountPage;
