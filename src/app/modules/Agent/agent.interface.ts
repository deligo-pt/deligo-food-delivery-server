export type TAgent = {
  _id?: string;
  agentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isDeleted: boolean;
  //  Company Details
  companyDetails?: {
    companyName: string;
    companyLicenseNumber?: string;
  };
  // Company Location
  companyLocation?: {
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
    idProof?: string;
    companyLicense?: string;
    profilePhoto?: string;
  };

  // Operation Data
  operationalData?: { noOfDrivers: number };

  createdAt: Date;
  updatedAt: Date;
};

export type TAgentImageDocuments = {
  docImageTitle: 'idProof' | 'companyLicense' | 'profilePhoto';
};
