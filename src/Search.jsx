
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import SearchPage from "./components/visitor/Search-page";





function Search() {
  const { session } = UserAuth();
  return (
    <>
      {session ? <Navigation /> : <Header />}
      <SearchPage />
      <Footer />
    </>
  );
}

export default Search;
