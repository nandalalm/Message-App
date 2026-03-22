import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { container } from "./container";
import { TYPES } from "./types";
import { IMessageService } from "../interfaces/services/IMessageService";
import { IPollService } from "../interfaces/services/IPollService";
import { INotificationService } from "../interfaces/services/INotificationService";
import { IUserRepository } from "../interfaces/Repositories/IUserRepository";
import { socketAuthMiddleware } from "../middleware/socketAuthMiddleware";
import { Messages } from "../constants/messages";

let io: SocketIOServer;

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.use(socketAuthMiddleware);

  const messageService = container.get<IMessageService>(TYPES.MessageService);
  const pollService = container.get<IPollService>(TYPES.PollService);
  const notificationService = container.get<INotificationService>(TYPES.NotificationService);
  const userService = container.get<IUserRepository>(TYPES.UserRepository);

  io.on("connection", (socket) => {
    const user = socket.data.user;
    if (user?.id) {
      socket.join(user.id);
    }

    socket.on("getChatHistory", async (data?: { limit?: number; skip?: number }) => {
      try {
        const history = await messageService.getChatHistory(data?.limit || 20, data?.skip || 0);
        socket.emit("chatHistory", history);
      } catch (error) {
        console.error(Messages.SOCKET_CHAT_HISTORY_ERROR, error);
      }
    });

    socket.on("sendMessage", async (data: { senderId: string; senderName: string; content: string; imageUrl?: string; s3Key?: string }) => {
      try {
        if (!user) return;
        const messageData = { ...data, senderId: user.id };
        const savedMessage = await messageService.saveMessage(messageData);
        io.emit("newMessage", savedMessage);

        const recipients = await userService.find({});
        for (const recipient of recipients) {
          if (recipient.id === user.id) continue;
          
          const notification = await notificationService.createNotification({
            userId: recipient.id,
            type: "message",
            content: `${data.senderName}: ${data.imageUrl ? Messages.SENT_IMAGE : data.content}`,
            relatedId: savedMessage.id,
          });
          io.to(recipient.id).emit("newNotification", notification);
        }
      } catch (error) {
        console.error(Messages.SOCKET_SEND_MESSAGE_ERROR, error);
      }
    });

    socket.on("editMessage", async (data: { userId: string; messageId: string; content: string }) => {
      try {
        if (!user) return;
        const updatedMessage = await messageService.editMessage(user.id, data.messageId, data.content);
        io.emit("messageEdited", updatedMessage);
      } catch (error) {
        console.error(Messages.SOCKET_EDIT_MESSAGE_ERROR, error);
        socket.emit("error", { message: error instanceof Error ? error.message : Messages.SOCKET_EDIT_MESSAGE_ERROR });
      }
    });

    socket.on("deleteMessage", async (data: { userId: string; messageId: string }) => {
      try {
        if (!user) return;
        const deletedMessage = await messageService.deleteMessage(user.id, data.messageId);
        io.emit("messageDeleted", deletedMessage);
      } catch (error) {
        console.error(Messages.SOCKET_DELETE_MESSAGE_ERROR, error);
        socket.emit("error", { message: error instanceof Error ? error.message : Messages.SOCKET_DELETE_MESSAGE_ERROR });
      }
    });

    socket.on("typing", (data: { senderName: string; isTyping: boolean }) => {
      socket.broadcast.emit("userTyping", data);
    });

    socket.on("getPolls", async (data: { userId: string, filterType: string, limit?: number, skip?: number }) => {
      try {
        if (!user) return;
        const polls = await pollService.getFilteredPolls(user.id, data.filterType, data.limit || 20, data.skip || 0);
        socket.emit("pollsList", polls);
      } catch (error) {
        console.error(Messages.SOCKET_FETCH_POLLS_ERROR, error);
      }
    });

    socket.on("getActivePolls", async (data: { userId: string, limit?: number, skip?: number }) => {
      try {
        if (!user) return;
        const polls = await pollService.getFilteredPolls(user.id, "active", data.limit || 20, data.skip || 0);
        socket.emit("activePolls", polls);
      } catch (error) {
        console.error(Messages.SOCKET_FETCH_POLLS_ERROR, error);
      }
    });

    socket.on("createPoll", async (data: { creatorId: string; creatorName: string; question: string; options: string[]; durationMinutes: number; allowMultiple: boolean }) => {
      try {
        if (!user) return;
        const poll = await pollService.createPoll(data);
        io.emit("pollCreated", poll);

        const recipients = await userService.find({});
        for (const recipient of recipients) {
          if (recipient.id === user.id) continue;

          const truncatedQuestion = data.question.length > 100 
            ? data.question.substring(0, 100) + "..." 
            : data.question;

          const notification = await notificationService.createNotification({
            userId: recipient.id,
            type: "poll",
            content: Messages.NEW_POLL_NOTIFICATION.replace('{creatorName}', data.creatorName).replace('{question}', truncatedQuestion),
            relatedId: poll.id,
          });
          io.to(recipient.id).emit("newNotification", notification);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : Messages.UNKNOWN_ERROR_OCCURRED;
        socket.emit("error", { message: errorMessage });
      }
    });

    socket.on("vote", async (data: { pollId: string; optionIndex: number; userId: string; userName: string }) => {
      try {
        if (!user) return;
        await pollService.vote(data.pollId, data.optionIndex, user.id, data.userName);
        
        const neutralPoll = await pollService.getPollById(data.pollId, "");
        if (neutralPoll) {
          io.emit("voteUpdated", neutralPoll);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : Messages.UNKNOWN_ERROR_OCCURRED;
        socket.emit("error", { message: errorMessage });
      }
    });

    socket.on("disconnect", () => {
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error(Messages.SOCKET_NOT_INITIALIZED);
  }
  return io;
};
