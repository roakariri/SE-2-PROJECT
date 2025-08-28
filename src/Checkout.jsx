import { UserAuth } from "./context/AuthContext";

import CheckoutPage from "./components/Order-Pages/Checkout-Page";


function Checkout() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            <CheckoutPage />
        </div>
    );
}

export default Checkout;
