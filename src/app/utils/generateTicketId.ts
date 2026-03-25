import { Counter } from '../modules/Support/support.model';

/**
 * Generates a unique readable Ticket ID
 * Format: TIC-YYMM-SERIAL (Example: TIC-2601-00001)
 */
export const generateTicketId = async (): Promise<string> => {
  const date = new Date();

  const yearMonth = `${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  const prefix = `TIC-${yearMonth}`;

  const counter = await Counter.findOneAndUpdate(
    { id: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  const formattedSerial = counter.seq.toString().padStart(5, '0');

  return `${prefix}-${formattedSerial}`;
};
