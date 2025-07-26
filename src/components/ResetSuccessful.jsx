



const ResetSuccessful = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full header bg-white">
        <div className="header">
          <img src={"/logo-icon/logo.png"} className="header-logo" alt="Logo" />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center mt-0">
         <div className="container flex flex-col  justify-center">
            <h2 className="header-notice mb-4">Password Reset Successful</h2>
            <p className=" mt-4">Your password has been reset successfully. You can now log in with your new password.</p>
            <div className="pt-8 text-center">
                <a href="/signin" className="text-blue-600 underline text-sm ">&lt; Back to Login</a>
            </div>
        </div>
        
      </div> 
       
   
    </div>
  );
}
export default ResetSuccessful;