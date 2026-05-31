export type TSponsorship = {
  sponsorName: string;
  sponsorType: 'Ads' | 'Offer' | 'Other';
  startDate: Date;
  endDate: Date;
  bannerImage: string;
  url: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
