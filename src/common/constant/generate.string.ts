export const generateResetOTP = (): string => {
  // Define the length and character of the OTP
  const otpLength = 30;
  const characters =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Generate a random OTP string of the specified length
  let otp = '';
  for (let i = 0; i < otpLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    otp += characters[randomIndex];
  }

  return otp;
};

export const generateVerifyOTP = (): string => {
  // Define the length and character of the OTP
  const otpLength = 6;
  const characters = '012345678910121314151617181920212223242627282930';

  // Generate a random OTP string of the specified length
  let otp = '';
  for (let i = 0; i < otpLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    otp += characters[randomIndex];
  }

  return otp;
};

export const generateRandomTokenForLoggedIn = async (): Promise<string> => {
  // Define the length and character of the OTP
  const otpLength = 5;
  const characters =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Generate a random OTP string of the specified length
  let otp = '';
  for (let i = 0; i < otpLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    otp += characters[randomIndex];
  }

  return otp;
};
