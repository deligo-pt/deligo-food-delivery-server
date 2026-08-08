/* eslint-disable no-console */
import config from '../config';
import { DeliveryPartner } from '../modules/Delivery-Partner/delivery-partner.model';

// One-time, idempotent backfill: `currentFleetManagerId` replaces `registeredBy`
// as the source of truth for a delivery partner's current fleet assignment.
// Existing assignments only live in `registeredBy` (model === 'FleetManager'),
// so copy them forward once; safe to run on every startup.
export const backfillDeliveryPartnerFleetAssignment = async () => {
  const result = await DeliveryPartner.updateMany(
    {
      'registeredBy.model': 'FleetManager',
      currentFleetManagerId: { $exists: false },
    },
    [
      {
        $set: { currentFleetManagerId: '$registeredBy.id' },
      },
    ],
  );

  if (config.NODE_ENV === 'development' && result.modifiedCount > 0) {
    console.log(
      `Backfilled currentFleetManagerId for ${result.modifiedCount} delivery partner(s).`,
    );
  }
};
