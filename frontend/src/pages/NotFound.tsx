import React from "react";
import { Link } from "react-router-dom";
import { Ghost, Home } from "lucide-react";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <Ghost size={120} className="text-indigo-600 relative animate-bounce duration-[3000ms]" />
      </div>
      
      <h1 className="text-6xl font-black text-slate-900 mb-4 tracking-tighter">404</h1>
      <h2 className="text-2xl font-bold text-slate-700 mb-6">Oops! This page is lost in space.</h2>
      
      <p className="text-slate-500 max-w-md mb-10 leading-relaxed font-medium">
        The link you followed might be broken, or the page may have been moved. 
        Don't worry, even the best explorers get lost sometimes.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Link 
          to="/home" 
          className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center group"
        >
          <Home size={18} className="group-hover:rotate-12 transition-transform" />
          Back to Home
        </Link>
      </div>

      <div className="mt-16 text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
        <span className="w-8 h-[1px] bg-slate-200" />
        Secure Chat Protocol
        <span className="w-8 h-[1px] bg-slate-200" />
      </div>
    </div>
  );
};

export default NotFound;
