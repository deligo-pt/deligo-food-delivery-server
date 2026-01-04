import { SupportConversation } from '../modules/Support/support.model';

/**
 * Generates a unique readable Ticket ID
 * Format: TIC-YYMM-SERIAL (Example: TIC-2601-0005)
 */
export const generateTicketId = async (): Promise<string> => {
  const date = new Date();

  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `TIC-${year}${month}`;

  const lastTicket = await SupportConversation.findOne({
    ticketId: { $regex: new RegExp(`^${prefix}`) },
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .select('ticketId');

  let nextSerialNumber = 1;

  if (lastTicket && lastTicket.ticketId) {
    const lastSerial = lastTicket.ticketId.split('-')[2];
    nextSerialNumber = parseInt(lastSerial, 10) + 1;
  }

  const formattedSerial = nextSerialNumber.toString().padStart(4, '0');

  return `${prefix}-${formattedSerial}`;
};
