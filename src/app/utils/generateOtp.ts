const generateOtp = () => ({
  otp: Math.floor(1000 + Math.random() * 9000).toString(),
  otpExpires: new Date(Date.now() + 5 * 60 * 1000),
});
export default generateOtp;
