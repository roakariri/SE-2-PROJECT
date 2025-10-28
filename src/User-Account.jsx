import { UserAuth } from "./context/AuthContext";
import AccountPage from "./components/registered/Account-Page";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function UserAccount() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
  <Navigation />
  <AccountPage />
  <ChatbotPage />
  <Footer />
    </div>
 
  );
}

export default UserAccount;
