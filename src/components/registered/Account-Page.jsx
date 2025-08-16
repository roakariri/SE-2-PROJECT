import React from "react";
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";
import PH_CITIES_BY_PROVINCE from "../../PH_CITIES_BY_PROVINCE.js";
import PH_BARANGAYS from "../../PH_BARANGAYS.js";




const DEFAULT_AVATAR = "/logo-icon/profile-icon.svg";

const AccountPage = () => {
    // Use imported PH_CITIES_BY_PROVINCE from './province.js'

    const [activeTab, setActiveTab] = React.useState("homebase");
    const navigate = useNavigate();
    const { signOut } = UserAuth();
    const [userName, setUserName] = React.useState("");
    const [session, setSession] = React.useState(null);
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [profilePic, setProfilePic] = React.useState(DEFAULT_AVATAR);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [successMsg, setSuccessMsg] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [repeatPassword, setRepeatPassword] = React.useState("");
    const [isCurrentPasswordIncorrect, setIsCurrentPasswordIncorrect] = React.useState(false);
    const [passwordSuccessMsg, setPasswordSuccessMsg] = React.useState("");
    const [addressForm, setAddressForm] = React.useState({
        first_name: "",
        last_name: "",
        street_address: "",
        province: "",
        city: "",
        postal_code: "",
        phone_number: "",
        label: "Home",
        is_default: false,
        address_id: undefined,
    });
    // Province list
    const PROVINCES = [
        "Abra", "Agusan Del Norte", "Agusan Del Sur", "Aklan", "Albay", "Antique", "Apayao", "Aurora", "Basilan", "Bataan", "Batanes", "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan", "Cagayan", "Camarines Norte", "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", "Cebu", "Compostela Valley", "Cotabato", "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental", "Dinagat Islands", "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela", "Kalinga", "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte", "Maguindanao", "Marinduque", "Masbate", "Misamis Occidental", "Misamis Oriental", "Mountain Province", "Negros Occidental", "Negros Oriental", "Northern Samar", "Nueva Ecija", "Nueva Vizcaya", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Pampanga", "Pangasinan", "Quezon", "Quirino", "Rizal", "Romblon", "Samar", "Sarangani", "Siquijor", "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat", "Sulu", "Surigao del Norte", "Surigao del Sur", "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"
    ];
    // Typable province dropdown state
    const [provinceInput, setProvinceInput] = React.useState("");
    const [showProvinceDropdown, setShowProvinceDropdown] = React.useState(false);
    const provinceInputRef = React.useRef(null);
    // Typable city dropdown state
    const [cityInput, setCityInput] = React.useState("");
    const [showCityDropdown, setShowCityDropdown] = React.useState(false);
    const cityInputRef = React.useRef(null);
    // Typable barangay dropdown state
    const [barangayInput, setBarangayInput] = React.useState("");
    const [showBarangayDropdown, setShowBarangayDropdown] = React.useState(false);
    const barangayInputRef = React.useRef(null);
    // Show all provinces unless input matches a province exactly (case-insensitive), then show only that province
    const filteredProvinces = (() => {
        if (!provinceInput) return PROVINCES;
        const exactMatch = PROVINCES.find(
            p => p.toLowerCase() === provinceInput.trim().toLowerCase()
        );
        if (exactMatch) return [exactMatch];
        return PROVINCES;
    })();
    // Get city options for selected province
    const cityOptions = addressForm.province && PH_CITIES_BY_PROVINCE[addressForm.province]
        ? PH_CITIES_BY_PROVINCE[addressForm.province]
        : [];

    // Get barangay options for selected province and city
    const barangayOptions =
        addressForm.province && addressForm.city &&
        PH_BARANGAYS[addressForm.province] && PH_BARANGAYS[addressForm.province][addressForm.city]
            ? PH_BARANGAYS[addressForm.province][addressForm.city]
            : [];






    const [addresses, setAddresses] = React.useState([]);
    const [addressSuccessMsg, setAddressSuccessMsg] = React.useState("");
    const [addressErrorMsg, setAddressErrorMsg] = React.useState("");
    const [showAddressEditor, setShowAddressEditor] = React.useState(false);

    // Fetch user, profile, and addresses
    const fetchUserAndProfile = React.useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        let displayName = session?.user?.user_metadata?.display_name || "User";
        setEmail(session?.user?.email || "");
        if (session?.user) {
            await supabase
                .from("profiles")
                .upsert({ user_id: session.user.id });

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
            const nameParts = displayName.split(" ");
            setFirstName(nameParts[0] || "");
            setLastName(nameParts[1] || "");

            const { data: addressData, error: addressError } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", session.user.id);
            if (addressError) {
                console.error("Error fetching addresses:", addressError.message);
            } else {
                setAddresses(addressData || []);
            }
        }
    }, []);

    React.useEffect(() => {
        fetchUserAndProfile();
    }, [fetchUserAndProfile]);

    React.useEffect(() => {
        if (activeTab === "profile") {
            fetchUserAndProfile();
        }
    }, [activeTab, fetchUserAndProfile]);

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setProfilePic(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async () => {
        const user = session?.user;
        if (!user) return;

        let avatar_url = null;

        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, selectedFile, { upsert: true });

            if (uploadError) {
                alert("Error uploading profile picture: " + uploadError.message);
                console.error("Error uploading profile picture:", uploadError.message);
                return;
            }

            const { data: publicData } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            avatar_url = publicData?.publicUrl;
        } else {
            const { data: profileData } = await supabase
                .from("profiles")
                .select("avatar_url")
                .eq("user_id", user.id)
                .single();
            avatar_url = profileData?.avatar_url || DEFAULT_AVATAR;
        }

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
        fetchUserAndProfile();
    };

    const handleSavePasswordChanges = async () => {
        const user = session?.user;
        if (!user) return;

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

        if (newPassword !== repeatPassword) {
            alert("New password and repeat password do not match.");
            return;
        }

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

        setAddressErrorMsg("");

        // Validate required fields
        if (!addressForm.first_name || !addressForm.last_name || !addressForm.street_address) {
            setAddressErrorMsg("Please fill in all required fields: First Name, Last Name, and Street Address.");
            return;
        }

        // Ensure label is either 'Home' or 'Work'
        if (!['Home', 'Work'].includes(addressForm.label)) {
            setAddressErrorMsg("Invalid address label. Please select 'Home' or 'Work'.");
            return;
        }

        if (addressForm.is_default) {
            await supabase
                .from("addresses")
                .update({ is_default: false })
                .eq("user_id", session.user.id);
        }

        // If editing, keep the same address_id, else generate new
        const isEditing = !!addressForm.address_id;
        const upsertData = {
            ...addressForm,
            user_id: session.user.id,
            address_id: isEditing ? addressForm.address_id : uuidv4(),
        };

        const { error } = await supabase
            .from("addresses")
            .upsert(upsertData, { onConflict: ['address_id'] });

        if (error) {
            console.error("Error saving address:", error.message);
            if (error.message.includes("addresses_label_check")) {
                setAddressErrorMsg("Invalid address label. Please select 'Home' or 'Work'.");
            } else {
                setAddressErrorMsg(`Error saving address: ${error.message}`);
            }
            return;
        }

        setAddressSuccessMsg("Address saved successfully!");
        setAddressErrorMsg("");
        setTimeout(() => setAddressSuccessMsg(""), 3000);
        fetchUserAndProfile();
        setShowAddressEditor(false);
        setTimeout(() => {
            setAddressForm({
                first_name: "",
                last_name: "",
                street_address: "",
                province: "",
                city: "",
                postal_code: "",
                phone_number: "",
                label: "Home",
                is_default: false,
                address_id: undefined,
            });
        }, 100);
    };

    const handleEditAddress = (address) => {
        setAddressForm(address);
        setProvinceInput(address.province || "");
        setAddressErrorMsg("");
        setShowAddressEditor(true);
    };

    const handleDeleteAddress = async (address_id) => {
        if (!session?.user?.id) return;

        const { error } = await supabase
            .from("addresses")
            .delete()
            .eq("address_id", address_id)
            .eq("user_id", session.user.id);

        if (error) {
            setAddressErrorMsg(`Error deleting address: ${error.message}`);
            console.error("Error deleting address:", error.message);
            return;
        }

        setAddressErrorMsg("");
        fetchUserAndProfile();
    };

    const handleSetDefaultAddress = async (address_id) => {
        if (!session?.user?.id) return;

        await supabase
            .from("addresses")
            .update({ is_default: false })
            .eq("user_id", session.user.id);

        const { error } = await supabase
            .from("addresses")
            .update({ is_default: true })
            .eq("address_id", address_id)
            .eq("user_id", session.user.id);

        if (error) {
            setAddressErrorMsg(`Error setting default address: ${error.message}`);
            console.error("Error setting default address:", error.message);
            return;
        }

        setAddressErrorMsg("");
        fetchUserAndProfile();
    };

    return (
        <div className="min-h-screen w-full bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <div className="flex flex-row justify-center gap-[100px] h-full p-4 px-[100px]">
                {/* Account Page Nav */}
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

                {/* Homebase */}
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

                {/* Orders */}
                {activeTab === "orders" && (
                    <div className="flex flex-col rounded-lg p-4 w-[80vw]">
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
                                    className="w-full rounded-full border border-gray-300 py-4 pl-8 pr-12 text-[24px] text-gray-400 font-dm-sans focus:outline-none bg-white"
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

                {/* Profile */}
                {activeTab === "profile" && (
                    <div className="flex flex-col rounded-lg p-4 w-[80vw]">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                        <div className="mt-6">
                            <p className="text-[24px] text-black font-dm-sans">Personal Information</p>
                            <p className="mt-10 font-dm-sans text-black">MY INFORMATION</p>
                            <div className="flex flex-row gap-10 mt-8 items-start">
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

                        {/* Change Password */}
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

                        {/* Saved Addresses */}
                        <div>
                            <p className="mt-4 mb-4 text-black font-dm-sans">SAVED ADDRESSES</p>
                            {addressSuccessMsg && (
                                <div className="text-green-600 font-dm-sans mb-4">
                                    {addressSuccessMsg}
                                </div>
                            )}
                            {addressErrorMsg && (
                                <div className="text-red-600 font-dm-sans mb-4">
                                    {addressErrorMsg}
                                </div>
                            )}
                            <div className="w-full overflow-x-auto">
                                <div className="grid semi-biggest:grid-cols-2 biggest:grid-cols-3 semi-biggest:w-[500px] semi-biggest:gap-10 auto-cols-max justify-center gap-4 min-w-max">
                                    {addresses.map((address) => (
                                        <div key={address.address_id} className="border p-5 w-[295px] border-black rounded flex flex-col justify-between min-h-[280px]">
                                            <p className="font-dm-sans font-bold">{address.first_name} {address.last_name}</p>
                                            <p className="font-dm-sans">{address.street_address}, {address.barangay},</p>
                                            <p className="font-dm-sans">{address.city}, {address.province}.</p>
                                            <p className="font-dm-sans">{address.postal_code}</p>
                                            <p className="font-dm-sans">{address.phone_number}</p>
                                            <p className="font-dm-sans capitalize">{address.label}.</p>

                                            <div className="flex flex-row w-full p-1 mt-auto gap-[50px] items-center justify-center">

                                                {address.is_default && (
                                                    <div className="flex justify-center items-center w-full h-full">
                                                        <div className="bg-[#F19B7D] p-1 rounded">
                                                            <p className="font-dm-sans text-black text-[12px]">DEFAULT</p>

                                                       </div>
                                                       <p> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
                                                    </div>
                                                   
                                                    
                                                )}

                                                {!address.is_default && (
                                                    <div className="bg-[#F19B7D] p-1 rounded">
                                                       <p className="font-dm-sans text-black text-[12px]">ALTERNATIVE</p>
                                                    </div>
                                                )}

                                                <div className="flex flex-row gap-2">
                                                    <div>
                                                        <button
                                                            className="h-[30px] w-[58px] text-[10px] border  border-black bg-white text-black rounded hover:bg-[#3B5B92] hover:text-white"
                                                            onClick={() => handleEditAddress(address)}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <button
                                                            className="h-[30px] w-[58px] text-[10px] border border-black rounded bg-white text-black hover:bg-red-600 hover:text-white"
                                                            onClick={() => handleDeleteAddress(address.address_id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>


                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                    <div className="ml-[40px] flex flex-col justify-center align-center">
                                        <button
                                            type="button"
                                            className="border border-black rounded-full w-16 h-16 flex items-center justify-center bg-white hover:bg-[#f0f0f0] shadow-md"
                                            aria-label="Add Address"
                                            onClick={() => {
                                                setAddressForm({
                                                    first_name: "",
                                                    last_name: "",
                                                    street_address: "",
                                                    province: "",
                                                    city: "",
                                                    postal_code: "",
                                                    phone_number: "",
                                                    label: "Home",
                                                    is_default: false,
                                                    address_id: undefined,
                                                });
                                                setProvinceInput("");
                                                setAddressErrorMsg("");
                                                setAddressSuccessMsg("");
                                                setShowAddressEditor(true);
                                            }}
                                        >
                                            <img src="/logo-icon/add-icon.svg" alt="Add" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Address Editor */}
                            {showAddressEditor && (
                                <div className="w-full p-2 bg-[#F7F7F7] mt-5 border border-dashed border-[#c5c5c5] relative">
                                    {/* Close Button */}
                                    <button
                                        type="button"
                                        className="absolute top-2 right-2 text-black bg-white rounded-full p-2 shadow hover:bg-gray-200"
                                        aria-label="Close Address Editor"
                                        onClick={() => setShowAddressEditor(false)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <p className="mt-5 text-black font-dm-sans">EDIT ADDRESSES</p>
                                    <form onSubmit={handleAddressSubmit} className="w-full">
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
                                                name="street_address"
                                                value={addressForm.street_address}
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            {/* Province */}
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Province</p>
                                                <div className="relative mt-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="text"
                                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white pr-10"
                                                            placeholder="Select Province"
                                                            name="province_typable"
                                                            autoComplete="off"
                                                            value={provinceInput}
                                                            ref={provinceInputRef}
                                                            onFocus={() => setShowProvinceDropdown(true)}
                                                            onChange={e => {
                                                                const value = e.target.value;
                                                                setProvinceInput(value);
                                                                setShowProvinceDropdown(true);
                                                                if (value === "") {
                                                                    setAddressForm(f => ({ ...f, city: "", province: "" }));
                                                                }
                                                            }}
                                                            onBlur={() => setTimeout(() => setShowProvinceDropdown(false), 150)}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute right-2 top-1/2 bg-white transform -translate-y-1/2 p-1"
                                                            tabIndex={-1}
                                                            onMouseDown={e => {
                                                                e.preventDefault();
                                                                setShowProvinceDropdown(v => !v);
                                                                provinceInputRef.current && provinceInputRef.current.focus();
                                                            }}
                                                        >
                                                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                    </div>
                                                    {/* Dropdown */}
                                                    {showProvinceDropdown && filteredProvinces.length > 0 && (
                                                        <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow-lg mt-1">
                                                            {filteredProvinces.map(prov => (
                                                                <li
                                                                    key={prov}
                                                                    className={`px-4 py-2 cursor-pointer hover:bg-[#eaeaea] text-black ${addressForm.province === prov ? 'bg-[#eaeaea]' : ''}`}
                                                                    style={{ color: 'black', backgroundColor: 'white' }}
                                                                    onMouseDown={e => {
                                                                        e.preventDefault();
                                                                        setAddressForm(f => ({ ...f, province: prov, city: "" }));
                                                                        setProvinceInput(prov);
                                                                        setShowProvinceDropdown(false);
                                                                    }}
                                                                >
                                                                    {prov}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                            {/* City */}
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">City</p>
                                                <div className="relative mt-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="text"
                                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white pr-10"
                                                            placeholder={provinceInput ? (addressForm.province ? "Select City/Municipality" : "Select Province First") : "Select Province First"}
                                                            name="city_typable"
                                                            autoComplete="off"
                                                            value={addressForm.city}
                                                            ref={cityInputRef}
                                                            disabled={!provinceInput}
                                                            onFocus={() => { if (provinceInput) setShowCityDropdown(true); }}
                                                            onChange={e => {
                                                                setAddressForm(f => ({ ...f, city: e.target.value }));
                                                                setShowCityDropdown(true);
                                                            }}
                                                            onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute bg-white right-2 top-1/2 transform -translate-y-1/2 p-1"
                                                            tabIndex={-1}
                                                            disabled={!provinceInput}
                                                            onMouseDown={e => {
                                                                if (!provinceInput) return;
                                                                e.preventDefault();
                                                                setShowCityDropdown(v => !v);
                                                                cityInputRef.current && cityInputRef.current.focus();
                                                            }}
                                                        >
                                                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                    </div>
                                                    {/* Dropdown */}
                                                    {showCityDropdown && addressForm.province && cityOptions.filter(c => c.toLowerCase().includes((addressForm.city || "").toLowerCase())).length > 0 && (
                                                        <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow-lg mt-1">
                                                            {cityOptions.filter(c => c.toLowerCase().includes((addressForm.city || "").toLowerCase())).map(city => (
                                                                <li
                                                                    key={city}
                                                                    className={`px-4 py-2 cursor-pointer hover:bg-[#eaeaea] text-black ${addressForm.city === city ? 'bg-[#eaeaea]' : ''}`}
                                                                    style={{ color: 'black' }}
                                                                    onMouseDown={e => {
                                                                        e.preventDefault();
                                                                        setAddressForm(f => ({ ...f, city }));
                                                                        setShowCityDropdown(false);
                                                                    }}
                                                                >
                                                                    {city}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Barangay */}
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Barangay</p>
                                                <div className="relative mt-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="text"
                                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white pr-10"
                                                            placeholder={addressForm.city ? "Select Barangay" : "Select City First"}
                                                            name="barangay_typable"
                                                            autoComplete="off"
                                                            value={addressForm.barangay || barangayInput}
                                                            ref={barangayInputRef}
                                                            disabled={!addressForm.city}
                                                            onFocus={() => { if (addressForm.city) setShowBarangayDropdown(true); }}
                                                            onChange={e => {
                                                                setAddressForm(f => ({ ...f, barangay: e.target.value }));
                                                                setShowBarangayDropdown(true);
                                                            }}
                                                            onBlur={() => setTimeout(() => setShowBarangayDropdown(false), 150)}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute bg-white right-2 top-1/2 transform -translate-y-1/2 p-1"
                                                            tabIndex={-1}
                                                            disabled={!addressForm.city}
                                                            onMouseDown={e => {
                                                                if (!addressForm.city) return;
                                                                e.preventDefault();
                                                                setShowBarangayDropdown(v => !v);
                                                                barangayInputRef.current && barangayInputRef.current.focus();
                                                            }}
                                                        >
                                                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                    </div>
                                                    {/* Dropdown */}
                                                    {showBarangayDropdown && addressForm.city && barangayOptions.filter(b => b.toLowerCase().includes((addressForm.barangay || "").toLowerCase())).length > 0 && (
                                                        <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow-lg mt-1">
                                                            {barangayOptions.filter(b => b.toLowerCase().includes((addressForm.barangay || "").toLowerCase())).map(barangay => (
                                                                <li
                                                                    key={barangay}
                                                                    className={`px-4 py-2 cursor-pointer hover:bg-[#eaeaea] text-black ${addressForm.barangay === barangay ? 'bg-[#eaeaea]' : ''}`}
                                                                    style={{ color: 'black' }}
                                                                    onMouseDown={e => {
                                                                        e.preventDefault();
                                                                        setAddressForm(f => ({ ...f, barangay }));
                                                                        setShowBarangayDropdown(false);
                                                                    }}
                                                                >
                                                                    {barangay}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Postal Code */}
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Postal Code/Zip Code</p>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                                    placeholder="Postal Code/Zip Code"
                                                    name="postal_code"
                                                    value={addressForm.postal_code}
                                                    onChange={e => {
                                                        // Only allow numbers
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        handleAddressChange({
                                                            target: {
                                                                name: 'postal_code',
                                                                value,
                                                                type: 'text',
                                                            }
                                                        });
                                                    }}
                                                    maxLength={4}
                                                />
                                            </div>
                                            {/* Phone Number */}
                                            <div className="col-span-2">
                                                <p className="text-[16px] mt-2 font-dm-sans">Phone Number <span className="text-gray-400">(ex. 09123456789)</span></p>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                                    placeholder="Phone Number"
                                                    name="phone_number"
                                                    value={addressForm.phone_number}
                                                    onChange={e => {
                                                        // Only allow numbers
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        handleAddressChange({
                                                            target: {
                                                                name: 'phone_number',
                                                                value,
                                                                type: 'text',
                                                            }
                                                        });
                                                    }}
                                                    maxLength={11}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[16px] mt-4 font-dm-sans">Label As</p>
                                        <div className="flex justify-start mt-2 gap-4">
                                            <button
                                                type="button"
                                                className="w-[202px] h-[40px] bg-white text-black border border-black"
                                                onClick={() => setAddressForm(f => ({ ...f, label: 'Work' }))}
                                                style={{ backgroundColor: addressForm.label === 'Work' ? '#3B5B92' : 'white', color: addressForm.label === 'Work' ? 'white' : 'black' }}
                                            >Work</button>
                                            <button
                                                type="button"
                                                className="w-[202px] h-[40px] bg-white text-black border border-black"
                                                onClick={() => setAddressForm(f => ({ ...f, label: 'Home' }))}
                                                style={{ backgroundColor: addressForm.label === 'Home' ? '#3B5B92' : 'white', color: addressForm.label === 'Home' ? 'white' : 'black' }}
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
                                                type="submit"
                                                className="bg-[#3B5B92] text-white font-bold font-dm-sans px-6 py-2 rounded-md hover:bg-[#2a4370] focus:outline-none focus:ring-0"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountPage;
