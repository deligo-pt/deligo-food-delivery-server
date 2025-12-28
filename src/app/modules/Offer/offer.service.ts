import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { TOffer } from './offer.interface';
import { Offer } from './offer.model';

// create offer service
const createOffer = async (payload: TOffer, currentUser: AuthUser) => {
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });

  if (currentUser?.role === 'VENDOR') {
    payload.vendorId = loggedInUser?._id;
  }

  const offer = await Offer.create(payload);
  return offer;
};

// update offer service
const updateOffer = async (
  id: string,
  payload: TOffer,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser?.id, isDeleted: false });
  const offer = await Offer.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return offer;
};

// get all offers service
const getAllOffers = async (
  currentUser: AuthUser,
  query: Record<string, unknown>
) => {
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });

  if (loggedInUser.role === 'VENDOR') {
    query.vendorId = loggedInUser._id;
  }
  const offers = new QueryBuilder(Offer.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search([]);
  const meta = await offers.countTotal();
  const data = await offers.modelQuery;
  return {
    meta,
    data,
  };
};

export const OfferServices = {
  createOffer,
  updateOffer,
  getAllOffers,
};
