/* eslint-disable @typescript-eslint/no-explicit-any */
export const roundTo4 = (num: any): number => {
  const value = Number(num);
  if (isNaN(value)) return 0;
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
};
