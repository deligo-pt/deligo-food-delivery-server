/* eslint-disable @typescript-eslint/no-explicit-any */
import config from '../config';
import { GlobalSettings } from '../modules/GlobalSetting/globalSetting.model';
import { PayoutServices } from '../modules/Payout/payout.service';

export const handlePayoutAutomatedCron = async () => {
  try {
    const settings = await GlobalSettings.findOne().lean();

    if (!settings?.payout?.autoGenerate) {
      if (config.NODE_ENV === 'development') {
        console.log(
          'Cron: Automated payout generation is disabled in settings.',
        );
      }
      return;
    }

    const todayName = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
    });

    const isPayoutDay = settings.payout.payoutDays.includes(todayName as any);

    if (isPayoutDay) {
      if (config.NODE_ENV === 'development') {
        console.log(
          `Cron: Today is ${todayName}. Starting automated settlement process...`,
        );
      }

      await PayoutServices.initiateAutomatedSettlement();

      if (config.NODE_ENV === 'development') {
        console.log('Cron: Automated settlement process completed.');
      }
    } else {
      if (config.NODE_ENV === 'development') {
        console.log(
          `Cron: Today is ${todayName}, which is not a scheduled payout day.`,
        );
      }
    }
  } catch (error) {
    console.error('Error in Payout Automated Cron Job:', error);
  }
};
