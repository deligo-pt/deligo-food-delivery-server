import customNanoId from './customNanoId';

export const generateTransactionId = () => {
  const customId = customNanoId(8);
  return `TXN-${customId}`;
};
