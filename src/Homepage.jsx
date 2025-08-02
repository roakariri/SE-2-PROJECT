
import { UserAuth } from "./context/AuthContext";
import Navigation from "./components/registered/Navigation";
import HomepageBody from "./components/registered/HomepageBody";




function Homepage() {
  const { user } = UserAuth();
  return (
    <>
      <Navigation />
      <HomepageBody />

    </>
  );
}

export default Homepage;
