/* eslint-disable @typescript-eslint/no-explicit-any */
import { GlobalSettings } from '../modules/GlobalSetting/globalSetting.model';
import { PayoutServices } from '../modules/Payout/payout.service';

export const handlePayoutAutomatedCron = async () => {
  try {
    const settings = await GlobalSettings.findOne().lean();

    if (!settings?.payout?.autoGenerate) {
      return;
    }

    const todayName = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
    });

    const isPayoutDay = settings.payout.payoutDays.includes(todayName as any);

    if (isPayoutDay) {
      await PayoutServices.initiateAutomatedSettlement();
    }
  } catch (error) {
    console.error('Error in Payout Automated Cron Job:', error);
  }
};
