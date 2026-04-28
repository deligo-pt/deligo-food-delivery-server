/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisService } from '../config/redis';
import { ReferralServices } from '../modules/Referral/referral.service';

const REFERRAL_STREAM = 'referral:events';
const GROUP_NAME = 'food-service-referral-group';
const CONSUMER_NAME = `food-referral-consumer-${process.pid}`;

export const initReferralStreamConsumer = async () => {
  await RedisService.createConsumerGroup(REFERRAL_STREAM, GROUP_NAME, '$');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const streams = (await RedisService.getClient().xreadgroup(
        'GROUP',
        GROUP_NAME,
        CONSUMER_NAME,
        'COUNT',
        10,
        'BLOCK',
        3000,
        'STREAMS',
        REFERRAL_STREAM,
        '>',
      )) as any[] | null;

      if (!streams || streams.length === 0) continue;

      for (const [_, messages] of streams) {
        for (const [messageId, fields] of messages) {
          try {
            const payload = JSON.parse(fields[1]);

            if (payload.type === 'REFERRAL_CREATED') {
              await new Promise((resolve) => setTimeout(resolve, 3000));
              await ReferralServices.createReferralEntry(
                {
                  customUserId: payload.customUserId,
                },
                payload.referralCode,
              );
            }

            await RedisService.getClient().xack(
              REFERRAL_STREAM,
              GROUP_NAME,
              messageId,
            );
          } catch (err) {
            console.error(`Referral message error ${messageId}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Referral Stream consumer error:', err);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};
