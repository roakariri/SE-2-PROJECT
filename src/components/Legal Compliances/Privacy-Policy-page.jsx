import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const PrivatePolicyPage = () => {
    return (
        <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0 scroll-smooth">
            
            <div className="mt-10 max-w-[1200px] mx-auto w-full">
                <p className="text-black font-bold text-[36px] font-dm-sans">Privacy Policy</p>
            </div>

            <div className="mt-2 max-w-[1200px] mx-auto w-full">
                <p className="text-gray-600 text-[16px] font-dm-sans">Last Updated: October 6, 2025</p>
            </div>

            <div className="mt-10 max-w-[1200px] mx-auto w-full">
                <p className="text-black text-[16px] font-dm-sans">
                    Good Prints Great Prints values your privacy and complies with the <em>Data Privacy Act of 2012 (RA 10173)</em> and its Implementing Rules and Regulations.
                </p>
            </div>

            {/* TABLE OF CONTENTS */}
            <div className="mt-8 max-w-[1200px] mx-auto w-full p-6 shadow-sm border">
                <p className="text-black font-bold text-[20px] font-dm-sans mb-4">Table of Contents</p>
                <ul className="list-decimal pl-6 text-black font-dm-sans space-y-2">
                    <li><a href="#information-we-collect" className="text-blue-600 hover:underline">Information We Collect</a></li>
                    <li><a href="#how-we-use" className="text-blue-600 hover:underline">How We Use Your Information</a></li>
                    <li><a href="#consent" className="text-blue-600 hover:underline">Consent</a></li>
                    <li><a href="#your-rights" className="text-blue-600 hover:underline">Your Rights</a></li>
                    <li><a href="#retention-security" className="text-blue-600 hover:underline">Retention & Security</a></li>
                    <li><a href="#disclosure" className="text-blue-600 hover:underline">Disclosure to Third Parties</a></li>
                    <li><a href="#contact" className="text-blue-600 hover:underline">Contact Us</a></li>
                </ul>
            </div>

            {/* CONTENT SECTIONS */}
            <div id="information-we-collect" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">1. Information We Collect</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>Personal information (e.g., name, email, contact number) when you subscribe to our newsletter or contact us.</li>
                    <li>Transaction details (e.g., orders, returns, inquiries).</li>
                </ul>
            </div>

            <div id="how-we-use" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">2. How We Use Your Information</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>To provide services (e.g., updates, promotions, and order-related communication).</li>
                    <li>To process and respond to inquiries, complaints, or support requests.</li>
                    <li>To improve our website, services, and customer experience.</li>
                    <li>For legal compliance and security monitoring.</li>
                </ul>
            </div>

            <div id="consent" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">3. Consent</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>By using our website and subscribing to our newsletter, you consent to the collection and use of your personal information for the purposes stated above.</li>
                </ul>
            </div>

            <div id="your-rights" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">4. Your Rights</p>
                <p className="text-black font-dm-sans mt-4">Under the Data Privacy Act, you have the right to:</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-2">
                    <li>Access, correct, or update your personal data.</li>
                    <li>Withdraw consent and unsubscribe from communications.</li>
                    <li>Request deletion of your data, subject to legal obligations.</li>
                    <li>Lodge complaints with the National Privacy Commission.</li>
                </ul>
            </div>

            <div id="retention-security" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">5. Retention & Security</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>We retain personal information only as long as necessary for the stated purposes or as required by law.</li>
                    <li>We implement administrative and technical safeguards to protect your data.</li>
                </ul>
            </div>

            <div id="disclosure" className="mt-10 max-w-[1200px] mx-auto w-full scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">6. Disclosure to Third Parties</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>We do not sell or trade your personal data.</li>
                    <li>We may share it with service providers (e.g., email platforms, analytics tools) strictly for operational purposes, subject to confidentiality agreements.</li>
                </ul>
            </div>

            <div id="contact" className="mt-10 max-w-[1200px] mx-auto w-full mb-20 scroll-mt-[140px]">
                <p className="text-black font-bold text-[24px] font-dm-sans">7. Contact Us</p>
                <ul className="list-disc list-inside text-black font-dm-sans space-y-2 pl-6 mt-4">
                    <li>For privacy concerns, please contact: <a href="mailto:goodprintsgreatprints@gmail.com" className="text-blue-600 hover:underline">goodprintsgreatprints@gmail.com</a></li>
                </ul>
            </div>
        </div>
    );
};

export default PrivatePolicyPage;
