import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const TermsAndConditionsPage = () => {

    return (
        <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0 scroll-smooth">
            
            <div className="mt-10 max-w-[1200px] mx-auto w-full">
                <p className="text-black font-bold text-[36px] font-dm-sans">Terms and Conditions</p>
            </div>

            <div className="mt-2 max-w-[1200px] mx-auto w-full">
                <p className="text-gray-600 text-[16px] font-dm-sans">Last Updated: October 6, 2025</p>
            </div>

            <div className="mt-10 max-w-[1200px] mx-auto w-full">
                <p className="text-black text-[16px] font-dm-sans">
                    Welcome to Good Prints Great Prints. By accessing or using this website, you agree to the following Terms and Conditions.
                </p>
            </div>

            <div className="mt-8 max-w-[1200px] mx-auto w-full p-6 shadow-sm border">
                <p className="text-black font-bold text-[20px] font-dm-sans mb-4">Table of Contents</p>
                <ul className="list-decimal pl-6 text-black font-dm-sans space-y-2">
                    <li><a href="#use-of-website" className="text-blue-600 hover:underline">Use of the Website</a></li>
                    <li><a href="#intellectual-property" className="text-blue-600 hover:underline">Intellectual Property</a></li>
                    <li><a href="#newsletter" className="text-blue-600 hover:underline">Newsletter Subscription</a></li>
                    <li><a href="#transactions" className="text-blue-600 hover:underline">Transactions & Returns</a></li>
                    <li><a href="#liability" className="text-blue-600 hover:underline">Limitation of Liability</a></li>
                    <li><a href="#governing-law" className="text-blue-600 hover:underline">Governing Law</a></li>
                    <li><a href="#changes" className="text-blue-600 hover:underline">Changes</a></li>
                </ul>
            </div>


            <div id="use-of-website" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">1. Use of the Website</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>You agree to use the website only for lawful purposes.</li>
                    <li>You will not engage in activities that disrupt or damage the website.</li>
                </ul>
            </div>

            <div id="intellectual-property" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">2. Intellectual Property</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>
                        Good Prints Great Prints does <strong>not</strong> own the photos or images displayed on the website. All images and media are credited to their respective owners and sources.
                    </li>
                    <li>These materials are used for the <strong>purpose of the project only</strong> and are not intended for commercial use.</li>
                    <li>
                        Other content, including the website’s layout, text, and logo, are protected under the <em>Intellectual Property Code of the Philippines (RA 8293)</em>.
                    </li>
                </ul>
            </div>

 
            <div id="newsletter" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">3. Newsletter Subscription</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>By subscribing, you agree to receive updates and marketing communications.</li>
                </ul>
            </div>

   
            <div id="transactions" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">4. Transactions & Returns</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>
                        If purchases are processed through the website, all transactions shall be governed by the <em>Consumer Act of the Philippines (RA 7394)</em>.
                    </li>
                    <li>
                        Customers have the right to return eligible products in accordance with our Returns Policy.
                    </li>
                </ul>
            </div>

            <div id="liability" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">5. Limitation of Liability</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>We are not liable for indirect, incidental, or consequential damages resulting from use of the website.</li>
                    <li>Our liability, if any, shall be limited to the amount paid for the product or service in question.</li>
                </ul>
            </div>

        
            <div id="governing-law" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">6. Governing Law</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>These Terms shall be governed by and construed under the laws of the Republic of the Philippines.</li>
                </ul>
            </div>

      
            <div id="changes" className="mt-10 max-w-[1200px] mx-auto w-full mb-20 scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">7. Changes</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>We reserve the right to update these Terms at any time. Continued use of the website after changes indicates acceptance.</li>
                </ul>
            </div>
        </div>
    );
};

export default TermsAndConditionsPage;
