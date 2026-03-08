import { Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
  };
}

export const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const accessSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!accessSecret) {
      return next(new Error("Server configuration error"));
    }

    const decoded = jwt.verify(token, accessSecret) as JwtPayload & { id: string; email: string };
    
    // Attach user info to socket data for use in handlers
    socket.data.user = {
      id: decoded.id,
      email: decoded.email
    };

    next();
  } catch {
    next(new Error("Authentication error: Invalid token"));
  }
};
