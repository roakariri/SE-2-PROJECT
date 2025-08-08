import React from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";

const AccountPage = () => {
  const [activeTab, setActiveTab] = React.useState("homebase");
  const navigate = useNavigate();
  const { signOut } = UserAuth();
  const [userName, setUserName] = React.useState("");
  const [session, setSession] = React.useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await import("../../supabaseClient").then(m => m.supabase.auth.getSession());
      setSession(session);
      if (session?.user) {
        // Adjust table/column names as needed
        const { data, error } = await import("../../supabaseClient").then(m => m.supabase)
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();
        if (data && data.name) {
          setUserName(data.name);
        } else {
          setUserName("User");
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen w-full bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <div className="flex flex-row justify-center gap-[100px]  h-full p-4 px-[100px]">
            {/*Account Page Nav*/}
            <div className=" flex flex-col  rounded-lg border p-4 ">
                <div className="flex flex-col  justify-center p-0">
                    <h1 className="text-2xl font-bold mb-4 text-black">
                      Welcome, {session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.full_name || userName}.
                    </h1>
                </div>
                <div className="flex flex-col border border-black rounded w-[300px]  justify-center">
                    <div className="border border-black rounded w-[300px] h-[244px] " style={{ lineHeight: "50px" }}>
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
                          className="w-full border  text-left text-[18px] font-dm-sans text-black font-semibold bg-transparent rounded-none  outline-none p-0 px-3 hover:bg-[#c4c4c4]"
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
              <div className="flex flex-col rounded-lg p-4 w-full max-w-3xl ">
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

        </div>
    </div>
  );
};

export default AccountPage;
