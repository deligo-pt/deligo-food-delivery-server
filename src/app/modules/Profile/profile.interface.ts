export type TUserProfileUpdate = {
  name: {
    firstName: string;
    lastName: string;
  };
  contactNumber: string;
  profilePhoto?: string | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
  };
};
