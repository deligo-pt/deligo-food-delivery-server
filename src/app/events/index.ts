import { initReferralStreamConsumer } from './referral.consumer';
import { initUserStreamConsumer } from './userStreamConsumer';

export const initAllStreamConsumers = () => {
  initUserStreamConsumer().catch((err) => console.log(err));
  initReferralStreamConsumer().catch((err) => console.log(err));

  console.log('All Redis streams consumer initialize');
};
