import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const ReturnPolicyPage = () => {
    return (
        <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0 scroll-smooth">
            
            <div className="mt-10 max-w-[1200px] mx-auto w-full">
                <p className="text-black font-bold text-[36px] font-dm-sans">Return Policy</p>
            </div>

            <div className="mt-2 max-w-[1200px] mx-auto w-full">
                <p className="text-gray-600 text-[16px] font-dm-sans">Last Updated: October 6, 2025</p>
            </div>

            <div className="mt-10 max-w-[1200px] mx-auto w-full">
                <p className="text-black text-[16px] font-dm-sans">
                    Good Prints Great Prints is committed to complying with the <em>Consumer Act of the Philippines (RA 7394)</em> and providing a fair return and refund process.
                </p>
            </div>

            {/* TABLE OF CONTENTS */}
            <div className="mt-8 max-w-[1200px] mx-auto w-full p-6 shadow-sm border">
                <p className="text-black font-bold text-[20px] font-dm-sans mb-4">Table of Contents</p>
                <ul className="list-decimal pl-6 text-black font-dm-sans space-y-2">
                    <li><a href="#eligibility" className="text-blue-600 hover:underline">Eligibility for Returns</a></li>
                    <li><a href="#refunds" className="text-blue-600 hover:underline">Refunds</a></li>
                    <li><a href="#exchanges" className="text-blue-600 hover:underline">Exchanges</a></li>
                    <li><a href="#return-process" className="text-blue-600 hover:underline">Return Process</a></li>
                </ul>
            </div>

            {/* CONTENT SECTIONS */}
            <div id="eligibility" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">1. Eligibility for Returns</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>Products may be returned within <strong>7 days</strong> of receipt.</li>
                    <li>Items must be unused, in original packaging, and with proof of purchase.</li>
                    <li>Customized or personalized items may not be eligible unless defective.</li>
                </ul>
            </div>

            <div id="refunds" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">2. Refunds</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>Refunds will be processed within <strong>7–10 business days</strong> after approval of the return.</li>
                    <li>Refunds will be issued through the original payment method, unless otherwise agreed.</li>
                </ul>
            </div>

            <div id="exchanges" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">3. Exchanges</p>
                <p className="text-black font-dm-sans mt-4">
                    Items may be exchanged for the same product or one of equal value, subject to availability.
                </p>
            </div>

            <div id="return-process" className="mt-10 max-w-[1200px] mx-auto w-full mb-20 scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">4. Return Process</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>Contact us at <a href="mailto:goodprintsgreatprints@gmail.com" className="text-blue-600 hover:underline">goodprintsgreatprints@gmail.com</a> or via our contact number within <strong>7 days</strong> of receiving the item.</li>
                    <li>Provide order details and reason for return.</li>
                    <li>Ship the item back to our address. Shipping costs may be borne by the customer unless the return is due to our error or a defective item.</li>
                </ul>
            </div>
        </div>
    );
};

export default ReturnPolicyPage;
