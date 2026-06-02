export const VendorSearchableFields = [
  'status',
  'email',
  'name.firstName',
  'name.lastName',
  'businessLocation.city',
  'businessDetails.businessName',
  'businessDetails.businessType',
  'businessDetails.businessLicenseNumber',
  'businessDetails.NIF',
];

export const CuisineType = {
  PortugueseFood: 'Portuguese Food',
  Sushi: 'Sushi',
  Kebab: 'Kebab',
  Barbecue: 'Barbecue',
  IndianFood: 'Indian Food',
  ItalianFood: 'Italian Food',
  VegetarianFood: 'Vegetarian Food',
  ThaiFood: 'Thai Food',
  JapaneseFood: 'Japanese Food',
  Ramen: 'Ramen',
  Seafood: 'Seafood',
  Burger: 'Burger',
  Halal: 'Halal',
  Others: 'Others',
} as const;

export type TCuisineType = (typeof CuisineType)[keyof typeof CuisineType];
