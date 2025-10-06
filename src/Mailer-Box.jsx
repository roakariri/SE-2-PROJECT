import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import MailerBoxInfo from "./components/Product-Pages/packaging/Mailer-Box-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function MailerBox() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <MailerBoxInfo />
      <Footer />
    </div>
  );
}

export default MailerBox;
