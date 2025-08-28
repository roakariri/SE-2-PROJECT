const CartPage = () => {

      return (
        <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <div className="mt-10">
                <p className="text-black font-bold text-[36px] font-dm-sans">Cart</p>
                <div className="flex flex-col items-center font-dm-sans justify-center mt-[100px]">
                    <p className="text-[20px] font-bold text-black">Your cart is empty.</p>
                    <p className="text-black font-dm-sans">Browse our products and add your first item to get started.</p>
                </div>
            </div>
        </div>



    )
}


export default CartPage;