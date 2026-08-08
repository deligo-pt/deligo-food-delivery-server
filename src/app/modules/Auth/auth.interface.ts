export type TLoginUser = {
  email: string;
  password?: string;
};

export type TLoginCustomer = {
  email: string;
  contactNumber?: string;
  referralCode?: string;
  otpChannel?: 'SMS' | 'WHATSAPP';
};

export type TRegisterUser = {
  email: string;
  role: string;
  password: string;
};

export type TSocialLoginCustomer = {
  provider: 'GOOGLE' | 'FACEBOOK';
  token: string;
  referralCode?: string;
};
