import { Link } from "react-router-dom";

const ContactSupportPage = () => {
  return (
    <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
      <div className="mt-10 max-w-[1200px] mx-auto w-full">
        <p className="text-black text-center font-bold text-[36px] font-dm-sans mb-10">
          Need More Help?
        </p>

  
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-8 text-black">

 
          <div className="border-2 rounded-xl p-6 flex flex-col items-start">
            <p className="font-semibold text-lg text-black">Connect with us</p>
            <p className="text-black text-sm mb-2">
              Get quick updates through our social platforms.
            </p>
            <div className="flex gap-4 mt-1">
              <a href="https://www.facebook.com/people/Good-Prints-Great-Prints/61576837260520/" className="text-[#171738] hover:text-[#171738] text-sm">
                Facebook
              </a>
              <a href="https://www.instagram.com/goodprintsgreatprints" className="text-[#171738] hover:text-[#171738]  text-sm">
                Instagram
              </a>
              <a href="https://www.tiktok.com/@goodprintsgreatprints" className="text-[#171738]  hover:text-[#171738] text-sm">
                Tiktok
              </a>
            </div>
          </div>

         
          <div className="border-2 rounded-xl p-6 flex flex-col items-start ">
            <p className="font-semibold text-lg text-black">Contact Support</p>
            <p className="text-black text-sm mb-2">
              Talk directly with someone from our team from 8am–8pm, Monday to Friday.
            </p>
            <a href="tel:+639123456789" className="text-[#171738] hover:text-[#171738]  text-sm">
              +63 912 345 6789
            </a>
          </div>


          <div className="border-2 rounded-xl p-6 flex flex-col items-start">
            <p className="font-semibold text-lg text-black">Chat with AI Helper</p>
            <p className="text-black text-sm mb-2">
              Get instant answers to your questions based on FAQs on our chatbot.
            </p>
            <p className="text-[#171738]  hover:text-[#171738] text-sm">
              Click the floating chatbot icon below to start chatting!
            </p>
          </div>

     
          <div className="border-2 rounded-xl p-6 flex flex-col items-start">
            <p className="font-semibold text-lg text-black">Email Us</p>
            <p className="text-black text-sm mb-2">
              Send us a message and we'll get back to you within 24 hours.
            </p>
            <a href="mailto:goodprintsgreatprints@gmail.com" className="text-[#171738] hover:text-[#171738] text-sm">
              goodprintsgreatprints@gmail.com
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContactSupportPage;
