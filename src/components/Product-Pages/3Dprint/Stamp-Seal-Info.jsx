import { Link } from "react-router-dom";
import { useEffect } from "react";

const StampSeal = () => {
    // Optional: Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, []);

    return (
       
        <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <p className="pt-5 font-dm-sans"><Link to ="/Homepage" className="text-gray-600">Home </Link>/ <Link to ="/3d-prints-services" className="text-gray-600">3D Prints Services </Link></p>

        </div>
    );
};

export default StampSeal;