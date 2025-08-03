
import { UserAuth } from "./context/AuthContext";
import Navigation from "./components/registered/Navigation";
import HomepageBody from "./components/registered/HomepageBody";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import ErrorBoundary from "./components/ErrorBoundary";



function Homepage() {
  const { session } = UserAuth();
  return (
    <ErrorBoundary>
      {session ? <Navigation /> : <Header />}
      <HomepageBody />
      <Footer />
    </ErrorBoundary>
  );
}

export default Homepage;
