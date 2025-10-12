import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const AboutUsPage = () => {

  /* logic here */

  return (
    <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
      <div className="mt-10 max-w-[1200px] mx-auto w-full">
        <div className="mb-16">
            <p className="text-black text-center font-bold text-[36px] font-dm-sans">About Us</p>
        </div>
        

        <div className="mb-16">
          <div className="flex flex-row md:flex-row-reverse gap-10">

            <div className="md:w-[45%] w-full flex justify-center">
              <img
                src="/aboutus/aboutus-1.png"
                alt="About Us 1"
                className="w-[90%] h-[250px] object-cover rounded-lg shadow-md"
              />
            </div>

            <div className="md:w-[55%] w-full">
              <p className="text-[#1A1A1A] leading-relaxed text-justify font-dm-sans font-regular text-[17px]">
                Good Prints, Great Prints is a small printing company founded in January 2024, in Sampaloc, Manila. Sparked by the shared passion and creativity of the five individuals, Good Prints, Great Prints was brought to life. 
                Our small team takes pride in turning our dear customer’s idea into tangible products by offering high-quality printed goods. With our passion to not only deliver excellent prints but also make them accessible to every creative. 
                We strive to create a difference—towards the creative scene of this country. As we believe that one's creativity is meant to be seen, not just imagined.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <div className="flex flex-row md:flex-row-reverse gap-10 ">

            <div className="md:w-[55%] w-full">
              <p className="text-[#1A1A1A] leading-relaxed text-justify font-dm-sans font-regular text-[17px]">
                As our small team has prior experience in the field of technology, we aim to deliver a satisfying experience 
                through this website, not only by streamlining the process of customization and ordering, but also by offering tools
                such as product mock-ups that help our customers visualize their ideas. With this, our team further aims to deliver an 
                experience of satisfaction among our customers. Always striving to produce high-quality products and service, worthy of our customers. 
                With this, our team further aims to deliver a satisfying experience for our customers, always striving to produce high-quality products and 
                services worthy of their trust. At Good Prints, Great Prints, we value creativity, quality, and our customers above all. We believe that every design of our customers 
                holds meaning beyond the screen, and it is our mission to turn it into reality.
            </p> 
            </div>

            <div className="md:w-[45%] w-full flex justify-center">
              <img
                src="/aboutus/aboutus-2.png"
                alt="About Us 2"
                className="w-[90%] h-[250px] object-cover rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage;
