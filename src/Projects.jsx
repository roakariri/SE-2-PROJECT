import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ProjectsPage from "./components/registered/Projects-Page";





function Projects() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <ProjectsPage />
            <Footer />
        </div>
    );
}

export default Projects;
