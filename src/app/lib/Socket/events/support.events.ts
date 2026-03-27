/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../../constant/user.constant';
import { SupportService } from '../../../modules/Support/support.service';

type SendMessagePayload = {
  room?: string; // Optional because first message won't have a room
  message: string;
  messageType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'LOCATION' | 'SYSTEM';
  attachments?: string[];
};

export const registerSupportEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as AuthUser;
  const userId = user.userId; // Custom ID (e.g., C-VXX...)
  const userRole = user.role;

  // Admin joining a common room to receive notifications for all new tickets
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    socket.join('admin-notifications-room');
  }

  /**
   * 1. Join a specific ticket room
   */
  socket.on('join-conversation', ({ room }: { room: string }) => {
    if (!room) return;
    socket.join(room);
    console.log(`User ${userId} joined room: ${room}`);
  });

  /**
   * 2. Typing Indicator
   */
  socket.on(
    'typing',
    ({ room, isTyping }: { room: string; isTyping: boolean }) => {
      if (!room) return;
      socket.to(room).emit('user-typing', {
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
      const { message, attachments, messageType } = payload;

      if (!message) {
        socket.emit('chat-error', { message: 'Message content is required' });
        return;
      }

      // Call Service to save message and handle ticket logic
      // Service will auto-create ticket/room if it's the first message
      const savedMessage = await SupportService.createMessage(
        {
          message,
          attachments,
          messageType: messageType || 'TEXT',
        },
        user,
      );

      const roomName = savedMessage.room;

      // Ensure the sender is in the room (crucial for new tickets)
      socket.join(roomName);

      // Realtime emit to all participants in the room
      io.to(roomName).emit('new-message', savedMessage);

      // Notify Admins if a Customer/Vendor sends a message
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        io.to('admin-notifications-room').emit('incoming-notification', {
          room: roomName,
          senderName: user.name || 'User',
          messagePreview: message.slice(0, 50),
          ticketId: savedMessage.ticketId,
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
  socket.on('mark-read', async ({ room }: { room: string }) => {
    try {
      if (!room) return;
      await SupportService.markReadByAdminOrUser(room, userId);

      socket.to(room).emit('read-update', {
        room,
        userId,
        time: new Date(),
      });
    } catch (error) {
      // Silent fail for read updates
    }
  });

  /**
   * 5. Close Ticket
   */
  socket.on('close-conversation', async ({ room }: { room: string }) => {
    try {
      if (!room) return;

      // Only Admins should close from socket (or based on your logic)
      await SupportService.closeTicket(room, userId);

      io.to(room).emit('conversation-closed', {
        room,
        closedBy: userId,
        time: new Date(),
      });
    } catch (error: any) {
      socket.emit('chat-error', {
        message: error?.message || 'Failed to close conversation',
      });
    }
  });

  /**
   * 6. Leave Room
   */
  socket.on('leave-conversation', ({ room }: { room: string }) => {
    if (!room) return;
    socket.leave(room);
  });
};
