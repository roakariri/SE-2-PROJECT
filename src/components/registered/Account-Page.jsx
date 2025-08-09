import React from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";

const AccountPage = () => {
  const [activeTab, setActiveTab] = React.useState("homebase");
  const navigate = useNavigate();
  const { signOut } = UserAuth();
  const [userName, setUserName] = React.useState("");
  const [session, setSession] = React.useState(null);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [profilePic, setProfilePic] = React.useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const { supabase } = await import("../../supabaseClient");
      // Get session from Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      let displayName = session?.user?.user_metadata?.display_name || "User";
      let profilePicUrl = null;
      if (session?.user) {
        // Fetch profile picture from profile_pictures table
        const { data: picData } = await supabase
          .from("profile_pictures")
          .select("avatar_url")
          .eq("user_id", session.user.id)
          .single();
        if (picData && picData.avatar_url) {
          profilePicUrl = picData.avatar_url;
          setProfilePic(profilePicUrl);
        }
        // Set first and last name from display_name
        const nameParts = displayName.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts[1] || "");
      }
    };
    fetchUser();
  }, []);

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (file && session?.user) {
      // Show preview instantly
      setProfilePic(URL.createObjectURL(file));
      const { supabase } = await import("../../supabaseClient");
      const userId = session.user.id;
      // Upload to Supabase Storage (avatars bucket)
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) {
        console.error("Error uploading profile picture:", uploadError.message);
        return;
      }
      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      setProfilePic(publicUrl);
      // Do NOT save to database here
      // Update session with new profile picture
      setSession(prev => ({
        ...prev,
        user: {
          ...prev.user,
          profile_picture: publicUrl
        }
      }));
    }
  };

  const handleSaveChanges = async () => {
    // Update display_name in Supabase Auth to include both first and last name
    const { supabase } = await import("../../supabaseClient");
    const user = session?.user;
    if (!user) return;
    const updates = {
      data: {
        display_name: `${firstName} ${lastName}`.trim(),
      },
    };
    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      console.error("Error updating profile:", error.message);
      // Optionally show error to user
    } else {
      // Save profile picture to database if it is a Supabase URL
      if (profilePic && profilePic.startsWith("https://")) {
        console.log("Upserting profile picture:", { user_id: user.id, avatar_url: profilePic });
        const upsertData = { user_id: user.id, avatar_url: profilePic };
        const { data, error: upsertError } = await supabase
          .from("profile_pictures")
          .upsert(upsertData);
        if (upsertError) {
          alert("Error saving profile picture: " + upsertError.message);
          console.error("Error saving profile picture URL to profile_pictures table:", upsertError.message);
        } else {
          console.log("Profile picture saved:", data);
        }
      } else {
        console.warn("profilePic is not a valid Supabase URL:", profilePic);
      }
      window.location.reload(); // Refresh the website after saving changes
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

        {/*for homebase, orders, profile, and logout*/}

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
              <p className="mt-10">MY INFORMATION</p>
              <div className="flex flex-row gap-10 mt-8 items-start">
                {/* Profile Picture Upload */}
                <div className="relative flex flex-col items-center">
                  <img
                    src={profilePic !== null ? profilePic : session?.user?.profile_picture || "/logo-icon/profile-icon.svg"}
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
                      placeholder={session?.user?.user_metadata?.display_name?.split(' ')[1] || ""}
                    />
                  </div>
                  <div className="flex flex-col col-span-2">
                    <label className="text-black font-dm-sans mb-2">Email Address</label>
                    <input
                      type="email"
                      className="border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                      value={session?.user?.email || ""}
                      readOnly
                      placeholder="user@gmail.com"
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
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AccountPage;
