import { useAppSelector } from "../redux/store";
import Navbar from "../components/Navbar";

const Home = () => {
  const { user } = useAppSelector((state) => state.auth);

  const getUserName = () => {
    if (user?.firstName) {
      return user?.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
    }
    if (!user?.email) return "User";
    return user.email.split('@')[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {getUserName()}! 👋
          </h1>
          <p className="text-indigo-100 text-lg">
            Stay connected with your friends. Your messaging app is ready.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
