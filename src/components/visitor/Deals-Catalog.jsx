const DealsCatalog = () => {


    return (
        <div className="w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[165px] landing-page-container z-0">
            {/* Hero Banner */}
            <div className="flex laptop:h-[425px] phone:h-[210px] flex-col items-center justify-center z-5 bg-[url('/images/deals-banner.png')] bg-cover bg-center">
            <p className="text-white"><a className="hover:underline hover:text-white text-white" href="/Homepage">Home</a> /</p>
            <h1 className="text-white font-bold">Deals</h1>
            </div>
            
            <div className="items-center justify-center max-w-[1200px] mx-auto w-full mt-10">
                <img src="/images/popular-picks-banner.png" alt="Deals Banner" className="w-[1198px] mt-10" />
            </div>

            
        </div>



    )
}

export default DealsCatalog;