import { useState } from "react";

const FAQsPage = () => {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    // 🟩 GENERAL
    {
      section: "General",
      questions: [
        { q: "Do you have a mobile app?", a: "Not yet — we're currently available via the web only." },
        { q: "What language is your site in?", a: "English only." },
        { q: "Do you support other currencies?", a: "No, all payments are in Philippine Peso (PHP)." },
        { q: "Do you have a physical store?", a: "No, we’re an online-based service only." },
        { q: "Can I place an order without logging in?", a: "You can browse products without an account, but checkout requires you to log in." },
        { q: "How can I contact you?", a: "email" }, // handled below
      ],
    },

    // 🟦 ORDERS & TRACKING
    {
      section: "Orders & Tracking",
      questions: [
        { q: "How do I know if my order was placed successfully?", a: "You’ll receive a confirmation email and an Order ID after checkout." },
        { q: "How can I track my order?", a: "You’ll get updates on your order status, and once it’s shipped, we’ll send you a tracking number." },
        { q: "How long will my order take?", a: "Production usually takes a few days. Delivery may take 2-5 business days within Luzon, and 3-7 business days within Visayas and Mindanao." },
        { q: "Can I cancel or change my order?", a: "You may request changes before your order goes into production." },
        { q: "What if I didn’t get any confirmation?", a: "Please check your spam folder or contact us if you still haven’t received one." },
        { q: "Can I reorder my past designs?", a: "Yes, you can easily reorder from your account’s order history." },
        { q: "Do you accept bulk orders?", a: "Yes, we accept bulk printing." },
        { q: "Will I get notified when my order status changes?", a: "Yes, you’ll receive email updates whenever your order moves." },
        { q: "Can I place multiple orders at once?", a: "Yes, you can place multiple orders. Each one will have its own Order ID." },
      ],
    },

    // 🟧 SHIPPING
    {
      section: "Shipping",
      questions: [
        { q: "What courier do you use?", a: "We ship through J&T Express and LBC." },
        { q: "Do you deliver nationwide?", a: "Yes, we ship anywhere in the Philippines." },
        { q: "Do you ship internationally?", a: "Not yet. We currently deliver only within the Philippines." },
        { q: "How much is the shipping fee?", a: "Shipping fees depend on your location and order size. The exact amount will be shown at checkout." },
        { q: "What if my package is delayed?", a: "You can check the courier tracking number we provide. If there are still no updates, contact us for assistance." },
        { q: "Do you offer same-day or rush delivery?", a: "Currently, we only provide standard delivery timelines." },
        { q: "What happens if my package gets lost?", a: "Contact us right away with your Order ID so we can help resolve it." },
        { q: "Will the courier contact me upon delivery?", a: "Yes, couriers typically notify customers via text or call before delivery." },
      ],
    },

    // 🟨 PRODUCTS & CUSTOMIZATION
    {
      section: "Products & Customization",
      questions: [
        { q: "What products can I order?", a: "We offer a variety of custom-printed items such as invitations, cards, banners, stickers, and merchandise." },
        { q: "Can I customize the size and finish of my product?", a: "Yes, you can choose from different sizes, materials, and finishes." },
        { q: "Can I see a preview before printing?", a: "Yes, our mock-up tool shows a preview of your design." },
        { q: "What file formats do you accept?", a: "We accept .JPG, .PNG, .SVG, and .OBJ files." },
        { q: "What if my file format isn’t supported?", a: "You’ll need to re-upload your design in one of the accepted formats." },
        { q: "Can I save my design for future orders?", a: "Yes, your saved designs will be stored in your account." },
        { q: "Are there file size limits for uploads?", a: "Yes, uploads are limited to 5MB per file." },
        { q: "What if the colors on the print look different from my screen?", a: "Slight color differences may happen due to screen vs. print variations, but we ensure high-quality printing." },
      ],
    },

    // 🟪 PAYMENTS
    {
      section: "Payments",
      questions: [
        { q: "What payment methods do you accept?", a: "We accept PayPal, credit/debit cards via PayPal, and Cash on Delivery (COD)." },
        { q: "Can I pay with GCash or Maya?", a: "Not directly. For now, we only support PayPal, cards, and COD." },
        { q: "Do you accept international payments?", a: "No, any international payments aren't supported." },
        { q: "Do you accept partial payments or installments?", a: "No, all orders must be fully paid." },
        { q: "Is it safe to pay online?", a: "Yes, our payments are processed through secure and trusted gateways." },
        { q: "Do you issue official receipts?", a: "Yes, receipts are available upon request." },
        { q: "Can I pay on delivery using a credit/debit card?", a: "No, card payments must be processed online before delivery." },
      ],
    },

    // 🟥 RETURNS & REFUNDS
    {
      section: "Returns & Refunds",
      questions: [
        { q: "Can I return my order?", a: "Yes, within 7 days if unused and in original packaging. Customized items can only be returned if defective." },
        { q: "How long does a refund take?", a: "Refunds are usually processed within 7–10 business days once approved." },
        { q: "Who pays for return shipping?", a: "If the product is defective or there was a mistake on our part, we’ll cover it. Otherwise, the customer pays." },
        { q: "What if I ordered the wrong size or material?", a: "Since items are customized, we can’t replace them unless it’s a production error. Please double-check your order details before confirming." },
        { q: "What if my order arrives damaged?", a: "Please report it to us with photos within 7 days so we can arrange a replacement or refund." },
        { q: "Can I exchange my order for something else?", a: "Exchanges are only allowed if the wrong item was sent or if the item is defective." },
      ],
    },
  ];

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
      <div className="max-w-[1200px] mx-auto mt-8 w-full laptop:px-2 phone:p-2 tablet:p-2">
        <p className="text-black font-bold text-[36px] text-center font-dm-sans mb-10">FAQs</p>

        {faqs.map((group, sectionIndex) => (
          <div key={sectionIndex} className="mb-12">
            <h2 className="text-[24px] font-bold text-[#111233] mb-4">{group.section}</h2>

            {group.questions.map((faq, index) => {
              const key = `${sectionIndex}-${index}`;
              const isOpen = openFAQ === key;

              return (
                <div key={key} className="overflow-hidden">
                  <div
                    className="w-full flex items-center justify-between bg-white border-black border-t border-b p-4 cursor-pointer"
                    onClick={() => toggleFAQ(key)}
                  >
                    <p className="text-[16px] font-medium text-black font-dm-sans">{faq.q}</p>
                    <img
                      src="/logo-icon/arrow-up.svg"
                      alt=""
                      aria-hidden
                      className={`h-5 w-5 transform transition-transform duration-300 ${
                        isOpen ? "" : "rotate-180"
                      }`}
                    />
                  </div>

                  <div
                    className={`bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen
                        ? "p-4 tablet:p-6 max-h-[300px] opacity-100"
                        : "px-4 py-0 tablet:px-6 tablet:py-0 max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <p className="text-black text-[16px] font-normal font-dm-sans">
                      {faq.a === "email" ? (
                        <>
                          You can reach us through our email:{" "}
                          <a
                            href="mailto:goodprintsgreatprints@gmail.com"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            goodprintsgreatprints@gmail.com
                          </a>
                        </>
                      ) : (
                        faq.a
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQsPage;
