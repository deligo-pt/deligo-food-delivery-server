export type TUserProfileUpdate = {
  moloniCustomerId?: string;
  name: {
    firstName: string;
    lastName: string;
  };
  contactNumber: string;
  profilePhoto?: string | null;
  NIF?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
    detailedAddress?: string;
  };
};
