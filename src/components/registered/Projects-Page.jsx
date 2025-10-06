const ProjectsPage = () => {


      return (
        <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <div className="mt-10">
                <p className="text-black font-bold text-[36px] font-dm-sans">My Projects</p>
                <div className="flex flex-col items-center font-dm-sans justify-center mt-[100px]">
                    <p className="text-[20px] font-bold text-black">No created projects yet.</p>
                    <p className="text-black font-dm-sans">Choose a product and upload your design to create one.</p>
                </div>
            </div>
        </div>



    )
}

export default ProjectsPage;