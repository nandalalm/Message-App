import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { container } from "./container";
import { TYPES } from "./types";
import { IMessageService } from "../interfaces/services/IMessageService";
import { IPollService } from "../interfaces/services/IPollService";

import { socketAuthMiddleware } from "../middleware/socketAuthMiddleware";

let io: SocketIOServer;

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Use authentication middleware
  io.use(socketAuthMiddleware);

  const messageService = container.get<IMessageService>(TYPES.MessageService);
  const pollService = container.get<IPollService>(TYPES.PollService);

  io.on("connection", (socket) => {
    const user = socket.data.user;

    // Message Events
    socket.on("getChatHistory", async (data?: { limit?: number; skip?: number }) => {
      try {
        const history = await messageService.getChatHistory(data?.limit || 20, data?.skip || 0);
        socket.emit("chatHistory", history);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    });

    socket.on("sendMessage", async (data: { senderId: string; senderName: string; content: string; imageUrl?: string; s3Key?: string }) => {
      try {
        // Enforce authenticated sender ID
        if (!user) return;
        const messageData = { ...data, senderId: user.id };
        const savedMessage = await messageService.saveMessage(messageData);
        io.emit("newMessage", savedMessage);
      } catch (error) {
        console.error("Error saving/sending message:", error);
      }
    });

    socket.on("editMessage", async (data: { userId: string; messageId: string; content: string }) => {
      try {
        // Enforce authenticated user's ID for editing
        if (!user) return;
        const updatedMessage = await messageService.editMessage(user.id, data.messageId, data.content);
        io.emit("messageEdited", updatedMessage);
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("error", { message: error instanceof Error ? error.message : "Error editing message" });
      }
    });

    socket.on("deleteMessage", async (data: { userId: string; messageId: string }) => {
      try {
        // Enforce authenticated user's ID for deletion
        if (!user) return;
        const deletedMessage = await messageService.deleteMessage(user.id, data.messageId);
        io.emit("messageDeleted", deletedMessage);
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: error instanceof Error ? error.message : "Error deleting message" });
      }
    });

    socket.on("typing", (data: { senderName: string; isTyping: boolean }) => {
      socket.broadcast.emit("userTyping", data);
    });

    // Poll Events
    socket.on("getPolls", async (data: { userId: string, filterType: string, limit?: number, skip?: number }) => {
      try {
        // Use authenticated user ID instead of client-provided userId
        if (!user) return;
        const polls = await pollService.getFilteredPolls(user.id, data.filterType, data.limit || 20, data.skip || 0);
        socket.emit("pollsList", polls);
      } catch (error) {
        console.error("Error fetching polls:", error);
      }
    });

    socket.on("getActivePolls", async (data: { userId: string, limit?: number, skip?: number }) => {
      try {
        // Use authenticated user ID instead of client-provided userId
        if (!user) return;
        const polls = await pollService.getFilteredPolls(user.id, "active", data.limit || 20, data.skip || 0);
        socket.emit("activePolls", polls);
      } catch (error) {
        console.error("Error fetching polls:", error);
      }
    });

    socket.on("createPoll", async (data: { creatorId: string; creatorName: string; question: string; options: string[]; durationMinutes: number; allowMultiple: boolean }) => {
      try {
        const poll = await pollService.createPoll(data);
        io.emit("pollCreated", poll);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        socket.emit("error", { message: errorMessage });
      }
    });

    socket.on("vote", async (data: { pollId: string; optionIndex: number; userId: string; userName: string }) => {
      try {
        // Enforce authenticated user ID for voting
        if (!user) return;
        await pollService.vote(data.pollId, data.optionIndex, user.id, data.userName);
        
        // Broadcast a neutral version to all users so they don't see the voter's specific flags
        const neutralPoll = await pollService.getPollById(data.pollId, "");
        if (neutralPoll) {
          io.emit("voteUpdated", neutralPoll);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
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
    throw new Error("Socket.IO not initialized!");
  }
  return io;
};
