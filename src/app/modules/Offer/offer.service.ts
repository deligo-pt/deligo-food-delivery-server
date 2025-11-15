import { AuthUser } from '../../constant/user.const';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { TOffer } from './offer.interface';
import { Offer } from './offer.model';

// create offer service
const createOffer = async (payload: TOffer, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });

  if (currentUser?.role === 'VENDOR') {
    payload.vendorId = currentUser?.id;
  }

  const offer = await Offer.create(payload);
  return offer;
};

export const OfferServices = {
  createOffer,
};
