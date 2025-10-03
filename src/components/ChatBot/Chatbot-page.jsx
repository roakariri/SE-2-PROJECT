import React, { useState } from 'react';

const ChatbotPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const faqs = {
    // FAQs
    "How do I know if my order was placed successfully?": "You'll receive a confirmation email and an Order ID after checkout.",
    "How can I track my order?": "You'll get updates on your order status, and once it's shipped, we'll send you a tracking number.",
    "How long will my order take?": "Production usually takes a few days. Delivery may take 2-5 business days within Luzon, and 3-7 business days within Visayas and Mindanao.",
    "Can I cancel or change my order?": "You may request changes before your order goes into production.",
    "What if I didn't get any confirmation?": "Please check your spam folder or contact us if you still haven't received one.",
    "Can I reorder my past designs?": "Yes, you can easily reorder from your account's order history.",
    "Do you accept bulk orders?": "Yes, we accept bulk printing.",
    "Will I get notified when my order status changes?": "Yes, you'll receive email updates whenever your order moves.",
    "Can I place multiple orders at once?": "Yes, you can place multiple orders. Each one will have its own Order ID.",
    // Shipping
    "What courier do you use?": "We ship through J&T Express and LBC.",
    "Do you deliver nationwide?": "Yes, we ship anywhere in the Philippines.",
    "Do you ship internationally?": "Not yet. We currently deliver only within the Philippines.",
    "How much is the shipping fee?": "Shipping fees depend on your location and order size. The exact amount will be shown at checkout.",
    "What if my package is delayed?": "You can check the courier tracking number we provide. If there are still no updates, contact us for assistance.",
    "Do you offer same-day or rush delivery?": "Currently, we only provide standard delivery timelines.",
    "What happens if my package gets lost?": "Contact us right away with your Order ID so we can help resolve it.",
    "Will the courier contact me upon delivery?": "Yes, couriers typically notify customers via text or call before delivery.",
    // Products & Customization
    "What products can I order?": "We offer a variety of custom-printed items such as invitations, cards, banners, stickers, and merchandise.",
    "Can I customize the size and finish of my product?": "Yes, you can choose from different sizes, materials, and finishes.",
    "Can I see a preview before printing?": "Yes, our mock-up tool shows a preview of your design.",
    "What file formats do you accept?": "We accept .JPG, .PNG, .SVG, and .OBJ files.",
    "What if my file format isn't supported?": "You'll need to re-upload your design in one of the accepted formats.",
    "Can I save my design for future orders?": "Yes, your saved designs will be stored in your account.",
    "Are there file size limits for uploads?": "Yes, uploads are limited to 5MB per file.",
    "What if the colors on the print look different from my screen?": "Slight color differences may happen due to screen vs. print variations, but we ensure high-quality printing.",
    // Payments
    "What payment methods do you accept?": "We accept PayPal, credit/debit cards via PayPal, and Cash on Delivery (COD).",
    "Can I pay with GCash or Maya?": "Not directly. For now, we only support PayPal, cards, and COD.",
    "Do you accept international payments?": "No, international payments aren't supported.",
    "Do you accept partial payments or installments?": "No, all orders must be fully paid.",
    "Is it safe to pay online?": "Yes, our payments are processed through secure and trusted gateways.",
    "Do you issue official receipts?": "Yes, receipts are available upon request.",
    "Can I pay on delivery using a credit/debit card?": "No, card payments must be processed online before delivery.",
    // Returns & Refunds
    "Can I return my order?": "Yes, within 7 days if unused and in original packaging. Customized items can only be returned if defective.",
    "How long does a refund take?": "Refunds are usually processed within 7–10 business days once approved.",
    "Who pays for return shipping?": "If the product is defective or there was a mistake on our part, we'll cover it. Otherwise, the customer pays.",
    "What if I ordered the wrong size or material?": "Since items are customized, we can't replace them unless it's a production error. Please double-check your order details before confirming.",
    "What if my order arrives damaged?": "Please report it to us with photos within 7 days so we can arrange a replacement or refund.",
    "Can I exchange my order for something else?": "Exchanges are only allowed if the wrong item was sent or if the item is defective.",
    // General
    "Do you have a mobile app?": "Not yet — we're currently available via web only.",
    "What language is your site in?": "English only.",
    "Do you support other currencies?": "No, all payments are in Philippine Peso (PHP).",
    "Do you have a physical store?": "No, we're an online-based service only.",
    "How can I contact you?": "You can reach us through our email: goodprintsgreatprints@gmail.com",
    "Can I place an order without logging in?": "You can browse products without an account, but checkout requires you to log in."
  };

  const [suggestions, setSuggestions] = useState([]);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    if (value.trim() === '') {
      setSuggestions([]);
    } else {
      const filtered = Object.keys(faqs).filter(q => q.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered.slice(0, 5)); // Limit to 5 suggestions
    }
  };

  const selectSuggestion = (question) => {
    setInput(question);
    setSuggestions([]);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    switch (trimmed) {
      case '':
        alert('Please enter a message.');
        break;
      default:
        const answer = faqs[trimmed];
        if (answer) {
          setMessages(prev => [...prev, { text: trimmed, sender: 'user' }, { text: answer, sender: 'bot' }]);
        } else {
          setMessages(prev => [...prev, { text: trimmed, sender: 'user' }, { text: "I'm sorry, I don't have an answer for that. Please contact support at goodprintsgreatprints@gmail.com", sender: 'bot' }]);
        }
        setInput('');
        setSuggestions([]);
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-100 pointer-events-none">
      {/* Transparent page */}
      <div className="absolute inset-0 bg-transparent"></div>

      {/* Chatbot button at bottom right */}
      <div className="absolute bottom-6 right-6 pointer-events-auto">
        <button
          onClick={toggleChatbot}
          className="w-16 h-16 bg-[#2B4269] text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300"
          aria-label="Open Chatbot"
        >
          {isOpen ? (
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Chatbot interface (when open) */}
      {isOpen && (
        <div className="absolute bottom-24 right-6 w-[366px] h-96 bg-white mr-[70px] rounded-lg shadow-xl pointer-events-auto border border-gray-200">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2B4269] to-[#2B4269CC] text-white p-2 rounded-t-lg">
              <h3 className="text-lg font-semibold font-dm-sans text-center">Helper</h3>
            </div>

            {/* Messages area */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-center text-gray-500 text-sm mb-4">
                Welcome to Good Print Great Prints support!
              </div>
              {messages.map((msg, index) => (
                <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-gray-200 relative">
              {suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-300 rounded-t-lg shadow-lg max-h-40 overflow-y-auto z-10">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Enter your message..."
                  className="w-full px-3 py-2 border border-[#939393] rounded-lg text-[12px] focus:outline-none pr-12"
                />
                <button
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-[45px] h-[18px] bg-blue-600 p-0 rounded-sm text-[12px] bg-transparent border border-[#939393] text-[#939393] hover:bg-[#939393] hover:text-white transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotPage;
