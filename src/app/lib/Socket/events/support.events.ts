/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../../constant/user.constant';
import { SupportService } from '../../../modules/Support/support.service';

type SendMessagePayload = {
  ticketId?: string; // Optional: first message won't have a ticketId
  targetUserObjectId?: string; // Required for Admin to start a chat
  targetUserId?: string; // Custom ID for target user
  targetUserModel?: string; // 'Customer', 'Vendor' etc.
  category?: string;
  referenceOrderId?: string;
  message: string;
  messageType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'LOCATION' | 'SYSTEM';
  attachments?: string[];
};

export const registerSupportEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as AuthUser;
  const userId = user.userId; // Custom ID (e.g., C-VXX...)
  const userRole = user.role;

  // Admin joining a common room to receive notifications for all tickets
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    socket.join('admin-notifications-room');
  }

  /**
   * 1. Join a specific ticket room (Using ticketId)
   */
  socket.on('join-conversation', ({ ticketId }: { ticketId: string }) => {
    if (!ticketId) return;
    socket.join(ticketId);
    console.log(`User ${userId} joined ticket: ${ticketId}`);
  });

  /**
   * 2. Typing Indicator
   */
  socket.on(
    'typing',
    ({ ticketId, isTyping }: { ticketId: string; isTyping: boolean }) => {
      if (!ticketId) return;
      socket.to(ticketId).emit('user-typing', {
        userId,
        name: user.name || 'User',
        isTyping,
      });
    },
  );

  /**
   * 3. Send Message (Handles Ticket Creation & Messaging)
   */
  socket.on('send-message', async (payload: SendMessagePayload) => {
    try {
      const { message } = payload;

      if (!message) {
        socket.emit('chat-error', { message: 'Message content is required' });
        return;
      }

      // Call Service (Updated to your latest service logic)
      const savedMessage = await SupportService.createMessage(payload, user);

      const ticketId = savedMessage.ticketId;

      // Ensure the sender is in the ticket room
      socket.join(ticketId);

      // Realtime emit to all participants in the ticket room
      io.to(ticketId).emit('new-message', savedMessage);

      // Notify Admins if a non-admin sends a message
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        io.to('admin-notifications-room').emit('incoming-notification', {
          ticketId,
          senderName: user.name || 'User',
          messagePreview: message.slice(0, 50),
          time: new Date(),
        });
      }
    } catch (error: any) {
      socket.emit('chat-error', {
        message: error?.message || 'Failed to send message',
      });
    }
  });

  /**
   * 4. Mark messages as read
   */
  socket.on('mark-read', async ({ ticketId }: { ticketId: string }) => {
    try {
      if (!ticketId) return;

      // Pass 'user' object as we updated service to accept AuthUser
      await SupportService.markReadByAdminOrUser(ticketId, user);

      socket.to(ticketId).emit('read-update', {
        ticketId,
        userId,
        time: new Date(),
      });
    } catch (error) {
      // Silent fail
    }
  });

  /**
   * 5. Close Ticket
   */
  socket.on(
    'close-conversation',
    async ({ ticketId }: { ticketId: string }) => {
      try {
        if (!ticketId) return;

        await SupportService.closeTicket(ticketId, user);

        io.to(ticketId).emit('conversation-closed', {
          ticketId,
          closedBy: userId,
          time: new Date(),
        });
      } catch (error: any) {
        socket.emit('chat-error', {
          message: error?.message || 'Failed to close conversation',
        });
      }
    },
  );

  /**
   * 6. Leave Room
   */
  socket.on('leave-conversation', ({ ticketId }: { ticketId: string }) => {
    if (!ticketId) return;
    socket.leave(ticketId);
  });
};
