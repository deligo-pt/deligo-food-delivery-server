import { Vendor } from '../modules/Vendor/vendor.model';

export const vendorStoreOpenCloseCron = async (): Promise<void> => {
  try {
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Lisbon',
      weekday: 'long',
    });
    const currentDay = dayFormatter.format(new Date());

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Lisbon',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const currentTime = timeFormatter.format(new Date());

    const vendors = await Vendor.find({ isDeleted: false, status: 'APPROVED' });

    for (const vendor of vendors) {
      const businessDetails = vendor.businessDetails;
      if (!businessDetails) continue;

      if (businessDetails.isManualControl) continue;

      const { openingHours, closingHours, closingDays } = businessDetails;

      let shouldBeOpen = true;

      if (closingDays && closingDays.includes(currentDay)) {
        shouldBeOpen = false;
      } else if (openingHours && closingHours) {
        if (closingHours < openingHours) {
          shouldBeOpen =
            currentTime >= openingHours || currentTime <= closingHours;
        } else {
          shouldBeOpen =
            currentTime >= openingHours && currentTime <= closingHours;
        }
      }

      if (businessDetails.isStoreOpen !== shouldBeOpen) {
        await Vendor.updateOne(
          { _id: vendor._id },
          {
            $set: {
              'businessDetails.isStoreOpen': shouldBeOpen,
              'businessDetails.storeClosedAt': shouldBeOpen ? null : new Date(),
            },
          },
        );

        console.log(
          `Vendor "${businessDetails.businessName}" status auto-updated to: ${shouldBeOpen ? 'OPEN' : 'CLOSED'}`,
        );
      }
    }
  } catch (error) {
    console.error('Error in Portugal Vendor Auto-Timing Cron Job:', error);
  }
};
