export type TLoginUser = {
  email: string;
  password?: string;
};

export type TLoginCustomer = {
  email: string;
  contactNumber?: string;
  referralCode?: string;
};

export type TRegisterUser = {
  email: string;
  role: string;
  password: string;
};
