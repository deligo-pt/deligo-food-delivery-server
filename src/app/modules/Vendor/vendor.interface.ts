export type TVendor = {
  _id?: string;
  vendorId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isDeleted: boolean;
  //  Business Details
  businessDetails?: {
    businessName: string;
    businessType: string; // Restaurant | Grocery | Pharmacy etc.
    businessLicenseNumber?: string;
    NIF?: string; // Tax Identification Number
    noOfBranch: number;
    openingHours?: string; // Ex: "09:00 AM"
    closingHours?: string; // Ex: "11:00 PM"
    closingDays?: string[]; // ["Friday", "Public Holidays"]
  };
  // Business Location
  businessLocation?: {
    streetAddress: string;
    streetNumber: string;
    city: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };
  // Bank & Payment Information
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    iban: string;
    swiftCode: string;
  };
  // Documents & Verification
  documents?: {
    businessLicenseDoc?: string;
    taxDoc?: string;
    idProof?: string;
    storePhoto?: string;
    menuUpload?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type TVendorImageDocuments = {
  docImageTitle:
    | 'businessLicenseDoc'
    | 'taxDoc'
    | 'idProof'
    | 'storePhoto'
    | 'menuUpload';
};
