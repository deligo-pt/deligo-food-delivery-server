import {
  USER_ROLE,
  USER_STATUS,
} from '../../constant/GlobalConstant/user.constant';

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

export const shapeVendorResponse = (authDoc: any) => {
  const auth = authDoc.toObject ? authDoc.toObject() : authDoc;
  const vendorProfile = auth.userObjectId;

  if (!vendorProfile) return null;

  const profile = vendorProfile.toObject
    ? vendorProfile.toObject()
    : vendorProfile;

  return {
    _id: profile._id,
    authUserId: auth._id,
    userId: auth.userId,
    email: auth.email || '',
    role: auth.role || USER_ROLE.VENDOR,
    status: auth.status || USER_STATUS.PENDING,
    isDeleted: auth.isDeleted || false,
    isEmailVerified: auth.isEmailVerified || false,
    contactNumber: auth.contactNumber || '',
    loginDevices: auth.loginDevices || [],
    fcmTokens: auth.fcmTokens || [],

    approvedBy: auth.approvedBy || null,
    rejectedBy: auth.rejectedBy || null,
    blockedBy: auth.blockedBy || null,
    remarks: auth.remarks || '',

    ...profile,
  };
};
