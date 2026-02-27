import Navbar from "../components/Navbar";
import Chat from "../components/Chat";

const Home = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Chat Section */}
        <section className="animate-slide-up">
          <Chat />
        </section>
      </div>
    </div>
  );
};

export default Home;
