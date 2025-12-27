/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../../constant/user.constant';
import { SupportService } from '../../../modules/Support/support.service';

type SendMessagePayload = {
  room: string;
  message: string;
  attachments?: string[];
  replyTo?: string | null;
};

export const registerSupportEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as AuthUser;
  const userId = user.id;
  const userRole = user.role;

  // --------------------------------------------
  //  Join conversation room
  //  --------------------------------------------
  socket.on('join-conversation', ({ room }: { room: string }) => {
    if (!room) return;
    socket.join(room);
  });

  // --------------------------------------------
  //  Send message (GENERIC for all chat types)
  //  --------------------------------------------
  socket.on('send-message', async (payload: SendMessagePayload) => {
    try {
      const { room, message, attachments, replyTo } = payload;

      if (!room || !message) {
        socket.emit('chat-error', {
          message: 'Invalid payload',
        });
        return;
      }

      // DB + business logic (lock, unread, etc.)
      const savedMessage = await SupportService.createMessage({
        room,
        senderId: userId,
        senderRole: userRole,
        message,
        attachments,
        replyTo,
      });

      // Realtime emit to room
      io.to(room).emit('new-message', savedMessage);
    } catch (error: any) {
      socket.emit('chat-error', {
        message: error?.message || 'Message send failed',
      });
    }
  });

  // --------------------------------------------
  //  Mark messages as read
  //  --------------------------------------------
  socket.on('mark-read', async ({ room }: { room: string }) => {
    try {
      await SupportService.markReadByAdminOrUser(room, user);

      socket.to(room).emit('read-update', {
        room,
        userId,
        time: new Date(),
      });
    } catch {
      // silent fail
    }
  });

  // --------------------------------------------
  //  Close conversation (lock release)
  //  --------------------------------------------
  socket.on('close-conversation', async ({ room }: { room: string }) => {
    try {
      await SupportService.closeConversation(room, user);

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
};
