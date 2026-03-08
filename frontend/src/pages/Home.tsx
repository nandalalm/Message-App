import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import Navbar from "../components/Navbar";
import Chat from "../components/Chat";
import PollComponent from "../components/Poll";

const Home = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeTab, setActiveTab] = useState<"chat" | "poll">("chat");
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSwitch = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab((prev) => (prev === "chat" ? "poll" : "chat"));
      setIsTransitioning(false);
    }, 400); // Wait for fade-out duration
  };

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const socketUrl = backendUrl || apiBaseUrl?.replace("/api", "") || "http://localhost:5000";

    console.log("🌐 [Home] Attempting socket connection to:", socketUrl);

    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ["polling", "websocket"], // Ensure fallback for local development
    });

    newSocket.on("connect", () => {
      console.log("✅ [Home] Socket connected!", newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ [Home] Socket connection error:", error.message);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("🔌 [Home] Socket disconnected:", reason);
    });

    setSocket(newSocket); // Set it anyway so children see the instance and its internal state

    return () => {
      console.log("🔌 [Home] Disconnecting socket...");
      newSocket.disconnect();
    };
  }, []);

  const isMobile = windowWidth <= 1030;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-[1400px] mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {!isMobile ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Chat Column */}
            <section className="animate-slide-up h-full">
              <Chat socket={socket} />
            </section>

            {/* Polling Column */}
            <section className="animate-slide-up h-full" style={{ animationDelay: '100ms' }}>
              <PollComponent socket={socket} />
            </section>
          </div>
        ) : (
          <div className={`max-w-[600px] mx-auto transition-all duration-400 ${isTransitioning ? "animate-fade-out" : "animate-fade-in"}`}>
            {activeTab === "chat" ? (
              <Chat 
                socket={socket} 
                showSwitch={true} 
                onSwitch={handleSwitch} 
              />
            ) : (
              <PollComponent 
                socket={socket} 
                showSwitch={true} 
                onSwitch={handleSwitch} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
