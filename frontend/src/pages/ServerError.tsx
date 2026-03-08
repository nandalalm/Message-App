import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

const ServerError: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <AlertTriangle size={100} className="text-red-500 relative animate-pulse duration-[2000ms]" />
      </div>
      
      <h1 className="text-6xl font-black text-white mb-4 tracking-tighter">500</h1>
      <h2 className="text-2xl font-bold text-slate-300 mb-6">Server connection interrupted.</h2>
      
      <p className="text-slate-400 max-w-md mb-10 leading-relaxed font-medium">
        Something went wrong on our end. Our technicians have been alerted and are working to restore the connection.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-8 py-3.5 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-900/40 hover:bg-red-700 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center group"
        >
          <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
          Try Again
        </button>
        <Link 
          to="/home" 
          className="flex items-center gap-2 px-8 py-3.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl font-bold hover:bg-slate-700 transition-all w-full sm:w-auto justify-center"
        >
          <Home size={18} />
          Go to Home
        </Link>
      </div>

      <div className="mt-16 text-slate-600 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
        <span className="w-8 h-[1px] bg-slate-800" />
        Emergency Alert System
        <span className="w-8 h-[1px] bg-slate-800" />
      </div>
    </div>
  );
};

export default ServerError;
