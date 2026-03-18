import { useEffect, useState } from "react";
import { useAppDispatch } from "../redux/store";
import Navbar from "../components/Navbar";
import Chat from "../components/Chat";
import PollComponent from "../components/Poll";
import { fetchMuteSettings } from "../redux/notificationsSlice";
import { useSocket } from "../context/useSocketHook";

const Home = () => {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeTab, setActiveTab] = useState<"chat" | "poll">(() => {
    const saved = localStorage.getItem("activeTab");
    return (saved === "chat" || saved === "poll") ? saved : "chat";
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    dispatch(fetchMuteSettings());
  }, [dispatch]);

  const handleSwitch = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      const nextTab = activeTab === "chat" ? "poll" : "chat";
      setActiveTab(nextTab);
      localStorage.setItem("activeTab", nextTab);
      setIsTransitioning(false);
    }, 400);
  };


  const isMobile = windowWidth <= 1030;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-[1400px] mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {!isMobile ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <section className="animate-slide-up h-full">
              <Chat socket={socket} />
            </section>
            <section className="animate-slide-up h-full" style={{ animationDelay: "100ms" }}>
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
