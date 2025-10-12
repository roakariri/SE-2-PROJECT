import { createBrowserRouter } from "react-router-dom";
import Landing from "./Landing";
import ForgotPassword from "./components/visitor/ForgotPassword";
import ResetConfirmation from "./components/visitor/ResetConfirmation";
import Signup from "./components/visitor/Signup";
import Signin from "./components/visitor/Signin";
import Admin from "./Admin";


import ResetPassword from "./components/visitor/ResetPassword";
import LandingPage from "./components/visitor/LandingPage";
import ResetSuccessful from "./components/visitor/ResetSuccessful";


// Importing the Homepage component and its body
import HomePage from "./Homepage"

// Importing the ApparelCatalog component
import Apparel from "./Apparel";


// Importing the AccessoriesCatalog component
import Accessories from "./Accessories";

// Importing the SignagesCatalog component
import Signages from "./Signages-Posters";

// Importing the CardsStickersCatalog component
import CardsStickers from "./Cards-Stickers";

// Importing the PackagingCatalog component
import Packaging from "./Packaging";  

// Importing the ThreeDPrintsCatalog component
import ThreeDPrints from "./3D-Prints";

// Importing the Search component
import Search from "./Search";

// Importing the Account component
import UserAccount from "./User-Account";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";


import Product from "./Product"; // Importing the Product component
import ProductInfo from "./components/Product-Pages/Product-Info";

// Importing the Favorites component
import Favorites from "./Favorites";

//Importing the Cart Component
import Cart from "./Cart";

//importing the Projects Component
import Mockup from "./Mockup";

// Importing the Deals Component
import Deals from "./Deals";

//product section

//apparel
  //cap
  import Cap from "./Cap";
  //rounded tshirt
  import RTshirt from "./RTshirt";
  //tote bag
  import BasicTBag from "./Basic-TBag"
  //Sweatshirt
  import Sweatshirt from "./Sweatshirt"
  //hoodie
  import Hoodie from "./Hoodie"

//Accesories and Decorations
  //Acrylic Keychain
  import AcrylicKeychain from "./Acrylic-Keychain"
  //Shaker Keychain
  import ShakerKeychain from "./Shaker-Keychain"
  //Blanket
  import Blanket from "./Blanket"
  //Tapestry
  import Tapestry from "./Tapestry"
  //Acrylic Stand
  import AcrylicStand from "./Acrylic-Stand"
  //Button Pin
  import ButtonPin from "./Button-Pin"
  //Phone Holder
  import PhoneHolder from "./Phone-Holder"
  //Mug
  import Mug from "./Mug"


//Sinage and Posters
  //Custom Poster
  import Poster from "./Poster"
  //Clothing Banner
  import ClothingBanner from "./Clothing-Banner"
  //Retractable Banner 
  import RetractableBanner from "./Retractable-Banner"

//Cards and Stickers
  //ID Cards
  import IDCards from "./ID-Cards"
  //Diecut Stickers
  import DiecutStickers from "./DieCut-Stickers"
  //Photocards
  import Photocards from "./Photocards"
  //Thanyou Cards
  import ThankyouCards from "./Thankyou-Cards"
  //Shikishi
  import Shikishi from "./Shikishi"
  //stickertsheet
  import StickerSheet from "./Sticker-Sheet";
  // lenticular cards
  import LenticularCards from "./Lenticular-Cards";
  //postcards
  import Postcards from "./Postcards";

//Packaging
  //ProductBox
  import ProductBox from "./Product-Box";
  //paper bag
  import PaperBag from "./Paper-Bag";
  //plastic bag 
  import PlasticBag from "./Plastic-Bag";
  //chip bag
  import ChipBag from "./Chip-Bag";
  //mailerbox
  import MailerBox from "./Mailer-Box";
import StampSeal from "./Stamp-Seal";

//Mockup tool
  import RTMockupTool from "./MT-RTshirt";
  import TapestryMockupTool from "./MT-Tapestry";
  import PHMockupTool from "./MT-PhoneHolder";
  import BlanketMockupTool from "./MT-Blanket";

  import IDCardsMockupTool from "./MT-IDCards";
  import PCardsMockupTool from "./MT-PCards";
  import PostCardsMockupTool from "./MT-PostCards";
  import TYCardsMockupTool from "./MT-TYCards";

  import PosterMockupTool from "./MT-Poster";
  import RetractableBannerMockupTool from "./MT-RetractableBanner";
  import ClothingBannerMockupTool from "./MT-ClothingBanner";

  import PaperBagMockupTool from "./MT-PaperBag";
  import PlasticBagMockupTool from "./MT-PlasticBag";
  import ToteBagMockupTool from "./MT-ToteBag";
  import SweatshirtMockupTool from "./MT-Sweatshirt";
  import HoodieMockupTool from "./MT-Hoodie";

//Order Pages
  import Checkout from "./Checkout";
  import OrderConfirmation from "./Order-Confirmation";
  import OrderPage from "./Order";

//Legal Compliances
  import AboutUs from "./About-us";
  import TermsAndConditions from "./Terms-and-Conditions";
  import PrivacyPolicy from "./Privacy-Policy";
  import FAQs from "./FAQs";
  import Shipping from "./Shipping";
  import OrderTracking from "./Order-Tracking";
  import ContactSupport from "./Contact-Support";
  import ReturnPolicy from "./Return-Policy";
  import ThreeDPrintServices from "./3D-Print-Services";

//admin
  import AdminLogin from "./Admin-Login"






export const router = createBrowserRouter([
  // Landing page routes
  { path: "/", element: <Landing /> },
  { path: "/signup", element: <Signup /> },
  { path: "/signin", element: <Signin /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-confirmation", element: <ResetConfirmation /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/landingpage", element: <LandingPage /> },
  { path: "/reset-successful", element: <ResetSuccessful /> },

  // Homepage routes
  { path: "/homepage", element: <PrivateRoute><HomePage /></PrivateRoute> },


  // Apparel routes
  { path: "/apparel", element: <Apparel /> },



  // Accessories routes
  { path: "/accessories-decorations", element: <Accessories /> },

  // Signages routes
  { path: "/signage-posters", element: <Signages /> },


  //Cards and Signages routes
  { path: "/cards-stickers", element: <CardsStickers /> },

  //packaging routes
  { path: "/packaging", element: <Packaging /> },

  // 3D Prints routes
  { path: "/3d-prints-services", element: <ThreeDPrints /> },

  //search routes
  { path: "/search", element: <Search /> },

  // Account routes
  { path: "/account", element: <PrivateRoute><UserAccount /></PrivateRoute> },

  // Product routes
  { path: "/product", element: <PrivateRoute><Product /></PrivateRoute> },
  // Generic product info by slug (public)
  { path: "/p/:slug", element: <ProductInfo /> },

  //Favorites routes
    {path: "/favorites", element: <PrivateRoute><Favorites /></PrivateRoute>},

  //Cart Routes
    {path: "/cart", element: <PrivateRoute><Cart /></PrivateRoute>},

    //Projects Routes
  {path: "/mockup-tool", element: <PrivateRoute><Mockup /></PrivateRoute>},

   //Deals Routes
    {path: "/deals", element: <Deals />},


  //product section

  //Apparel

    //Cap
    {path: "/apparel/cap", element: <Cap />},
    {path: "/favorites/cap", element: <Cap />},
    

  //RTshirt
  {path: "/apparel/rounded-t-shirt", element: <RTshirt />},
  {path: "/favorites/rounded-t-shirt", element: <RTshirt />},

  //Basic T bag
  {path: "/apparel/basic-tote-bag", element: <BasicTBag />},
  {path: "/favorites/basic-tote-bag", element: <BasicTBag />},
    
  //sweatshirt
  {path: "/apparel/sweatshirt", element: <Sweatshirt />},
  {path: "/favorites/sweatshirt", element: <Sweatshirt />},

  //Hoodie
  {path: "/apparel/hoodie", element: <Hoodie />},
  {path: "/favorites/hoodie", element: <Hoodie />},

  //Accesories anmd Decorations

  //Acrylic Keychain
  {path: "/accessories-decorations/acrylic-keychain", element: <AcrylicKeychain />},
  {path: "/favorites/acrylic-keychain", element: <AcrylicKeychain />},
    
  //Shaker Keychain
  {path: "/accessories-decorations/shaker-keychain", element: <ShakerKeychain />},
  {path: "/favorites/shaker-keychain", element: <ShakerKeychain />},

  //Blanket
  {path: "/accessories-decorations/blanket", element: <Blanket />},
  {path: "/favorites/blanket", element: <Blanket />},

  //tapestry
  {path: "/accessories-decorations/tapestry", element: <Tapestry />},
  {path: "/favorites/tapestry", element: <Tapestry />},

  //Acrylic Stand
  {path: "/accessories-decorations/acrylic-stand", element: <AcrylicStand />},
  {path: "/favorites/acrylic-stand", element: <AcrylicStand />},

  //button pins
  {path: "/accessories-decorations/button-pins", element: <ButtonPin />},
  {path: "/favorites/button-pins", element: <ButtonPin />},

  //Phone Holder
  {path: "/accessories-decorations/phone-holder", element: <PhoneHolder />},
  {path: "/favorites/phone-holder", element: <PhoneHolder />},

  //Mugs
  {path: "/accessories-decorations/mug", element: <Mug />},
  {path: "/favorites/mug", element: <Mug />},

  //Sinage & Poster

  //Poster 
  {path: "/signage-posters/poster", element: <Poster />},
  {path: "/favorites/poster", element: <Poster />},
  //Clothing Banner 
  {path: "/signage-posters/clothing-banner", element: <ClothingBanner />},
  {path: "/favorites/clothing-banner", element: <ClothingBanner />},
  //Retractable Banner
  {path: "/signage-posters/retractable-banner", element: <RetractableBanner />},
  {path: "/favorites/retractable-banner", element: <RetractableBanner />},

  //Cards & Stickers

  //IDCards
  {path: "/cards-stickers/id-cards", element: <IDCards />},
  {path: "/favorites/id-cards", element: <IDCards />},
  //diecuu cards
  {path: "/cards-stickers/die-cut-stickers", element: <DiecutStickers />},
  {path: "/favorites/die-cut-stickers", element: <DiecutStickers />},
  // photocards
  {path: "/cards-stickers/photocards", element: <Photocards />},
  {path: "/favorites/photocards", element: <Photocards />},
  //thankyou cards
  {path: "/cards-stickers/thank-you-cards", element: <ThankyouCards />},
  {path: "/favorites/thank-you-cards", element: <ThankyouCards />},
  // shikishi
  {path: "/cards-stickers/shikishi", element: <Shikishi />},
  {path: "/favorites/shikishi", element: <Shikishi />},
  // sticker sheet
  {path: "/cards-stickers/sticker-sheet", element: <StickerSheet />},
  {path: "/favorites/sticker-sheet", element: <StickerSheet />},
  //lenticular cards
  {path: "/cards-stickers/lenticular-cards", element: <LenticularCards />},
  {path: "/favorites/lenticular-cards", element: <LenticularCards />},
  //postcards
  {path: "/cards-stickers/postcards", element: <Postcards />},
  {path: "/favorites/postcards", element: <Postcards />},

  //Packaging
  
  //product box 
  {path: "/packaging/product-box", element: <ProductBox />},
  {path: "/favorites/product-box", element: <ProductBox />},
  //Paper bag
  {path: "/packaging/paper-bag", element: <PaperBag />},
  {path: "/favorites/paper-bag", element: <PaperBag />},
  //Plastic bag
  {path: "/packaging/plastic-bag", element: <PlasticBag />},
  {path: "/favorites/plastic-bag", element: <PlasticBag />},
  //Chip bag      
  {path: "/packaging/chip-bag", element: <ChipBag />},
  {path: "/favorites/chip-bag", element: <ChipBag />},
  //Mailerbox
  {path: "/packaging/mailer-box", element: <MailerBox />},
  {path: "/favorites/mailer-box", element: <MailerBox />},

//3D Print services
  //Stamp seal
  {path: "/3d-prints-services/wax-stamp", element: <StampSeal/>},
  {path: "/favorites/wax-stamp", element: <StampSeal />},
  
  //Mockup tool
  {path: "/rounded-t-shirt-mockuptool", element: <RTMockupTool />},
  {path: "/tapestry-mockuptool", element: <TapestryMockupTool />},
  {path: "/phone-holder-mockuptool", element: <PHMockupTool />},
  {path: "/blanket-mockuptool", element: <BlanketMockupTool />},

  {path: "/photo-cards-mockuptool", element: <PCardsMockupTool />},
  {path: "/thank-you-cards-mockuptool", element: <TYCardsMockupTool />},
  {path: "/post-cards-mockuptool", element: <PostCardsMockupTool />},
  {path: "/id-cards-mockuptool", element: <IDCardsMockupTool />},

  {path: "/poster-mockuptool", element: <PosterMockupTool />},
  {path: "/retractable-banner-mockuptool", element: <RetractableBannerMockupTool />},
  {path: "/clothing-banner-mockuptool", element: <ClothingBannerMockupTool />},

  {path: "/paper-bag-mockuptool", element: <PaperBagMockupTool />},
  {path: "/plastic-bag-mockuptool", element: <PlasticBagMockupTool />},
  {path: "/basic-tote-bag-mockuptool", element: <ToteBagMockupTool />},
  {path: "/sweatshirt-mockuptool", element: <SweatshirtMockupTool />},
  {path: "/hoodie-mockuptool", element: <HoodieMockupTool />},


//orders
  //checkout 
  {path: "/checkout", element: <PrivateRoute><Checkout /></PrivateRoute>},
  // order confirmation
  {path: "/order-confirmation", element: <PrivateRoute><OrderConfirmation /></PrivateRoute>},
  //order page 
  {path: "/order", element: <PrivateRoute><OrderPage /></PrivateRoute>},




//Admin
  {path: "/Admin", element: <AdminRoute><Admin /></AdminRoute>},


//Legal Compliances
  {path: "/about-us", element: <AboutUs />},
  {path: "/terms-and-conditions", element: <TermsAndConditions />},
  {path: "/privacy-policy", element: <PrivacyPolicy />},
  {path: "/shipping", element: <Shipping />},
  {path: "/order-tracking", element: <OrderTracking />},
  {path: "/contact-support", element: <ContactSupport />},
  {path: "/return-policy", element: <ReturnPolicy />},
  {path: "/3d-print-services", element: <ThreeDPrintServices />},
  {path: "/faqs", element: <FAQs />},


//Admin login
  {path: "/admin-login", element: <AdminLogin />},
]);





