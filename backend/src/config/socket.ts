import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { container } from "./container";
import { TYPES } from "./types";
import { IMessageService } from "../interfaces/services/IMessageService";
import { IPollService } from "../interfaces/services/IPollService";

let io: SocketIOServer;

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const messageService = container.get<IMessageService>(TYPES.MessageService);
  const pollService = container.get<IPollService>(TYPES.PollService);

  io.on("connection", (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Message Events
    socket.on("getChatHistory", async () => {
      try {
        const history = await messageService.getChatHistory(100);
        socket.emit("chatHistory", history);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    });

    socket.on("sendMessage", async (data: { senderId: string; senderName: string; content: string }) => {
      try {
        const savedMessage = await messageService.saveMessage(data);
        io.emit("newMessage", savedMessage);
      } catch (error) {
        console.error("Error saving/sending message:", error);
      }
    });

    socket.on("typing", (data: { senderName: string; isTyping: boolean }) => {
      socket.broadcast.emit("userTyping", data);
    });

    // Poll Events
    socket.on("getPolls", async (data: { userId: string, filterType: string }) => {
      try {
        const polls = await pollService.getFilteredPolls(data.userId, data.filterType);
        socket.emit("pollsList", polls);
      } catch (error) {
        console.error("Error fetching polls:", error);
      }
    });

    socket.on("getActivePolls", async (data: { userId: string }) => {
      try {
        const polls = await pollService.getFilteredPolls(data.userId, "active");
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
        const updatedPoll = await pollService.vote(data.pollId, data.optionIndex, data.userId, data.userName);
        io.emit("voteUpdated", updatedPoll);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        socket.emit("error", { message: errorMessage });
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
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
