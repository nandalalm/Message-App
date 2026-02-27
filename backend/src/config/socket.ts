import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { container } from "./container";
import { TYPES } from "./types";
import { IMessageService } from "../interfaces/services/IMessageService";

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

  io.on("connection", (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Send chat history to the newly connected client
    socket.on("getChatHistory", async () => {
      try {
        const history = await messageService.getChatHistory(50);
        socket.emit("chatHistory", history);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    });

    socket.on("sendMessage", async (data: { senderId: string; senderName: string; content: string }) => {
      try {
        const savedMessage = await messageService.saveMessage(data);
        // Broadcast the message to EVERYONE (global chat)
        io.emit("newMessage", savedMessage);
      } catch (error) {
        console.error("Error saving/sending message:", error);
      }
    });

    socket.on("typing", (data: { senderName: string; isTyping: boolean }) => {
      // Broadcast to others that someone is typing
      socket.broadcast.emit("userTyping", data);
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
