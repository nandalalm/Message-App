import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { Vote, Plus, Clock, AlertCircle, CheckCircle2, User, Filter, Users } from "lucide-react";
import { useAppSelector } from "../redux/store";

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  creatorId: string;
  creatorName: string;
  question: string;
  options: PollOption[];
  expiresAt: string;
  isActive: boolean;
  allowMultiple: boolean;
  hasVoted: boolean;
  votedOptionIndices?: number[];
  voters: { userName: string; optionIndex: number }[];
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const PollTimer: React.FC<{ expiresAt: string; onConclude?: () => void }> = ({ expiresAt, onConclude }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        onConclude?.();
      } else {
        setTimeLeft(diff);
      }
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (timeLeft === 0) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-400">
        <Clock size={10} />
        <span>CONCLUDED</span>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  let colorClass = "text-green-600 bg-green-50";
  if (minutes < 2) colorClass = "text-red-600 bg-red-50";
  else if (minutes < 5) colorClass = "text-orange-600 bg-orange-50";
  else if (minutes < 15) colorClass = "text-yellow-600 bg-yellow-50";

  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${colorClass} transition-colors duration-1000`}>
      <Clock size={10} />
      <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
    </div>
  );
};

const AllVotersModal: React.FC<{ poll: Poll; onClose: () => void }> = ({ poll, onClose }) => {
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="bg-amber-500 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={16} />
            <h3 className="font-bold text-sm truncate">Vote Details</h3>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform font-bold outline-none ml-2 shrink-0">✕</button>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1 truncate">{poll.question}</p>
        <div className="max-h-72 overflow-y-auto p-3 scrollbar-hide space-y-3">
          {totalVotes === 0 ? (
            <p className="text-center py-8 text-gray-400 text-xs italic">No votes have been cast yet.</p>
          ) : (
            poll.options.map((opt, idx) => {
              const optVoters = poll.voters.filter(v => v.optionIndex === idx).map(v => v.userName);
              const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
              return (
                <div key={idx} className="bg-gray-50 rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-3 py-2">
                    <span className="text-xs font-bold text-gray-700 truncate">{opt.text}</span>
                    <span className="text-[10px] font-black text-amber-600 ml-2 shrink-0">{opt.votes} vote{opt.votes !== 1 ? "s" : ""} · {percentage}%</span>
                  </div>
                  {optVoters.length > 0 ? (
                    <ul className="px-3 pb-2 space-y-1">
                      {optVoters.map((name, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] text-gray-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 pb-2 text-[10px] italic text-gray-300">No votes for this option.</p>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 pb-3 pt-1 text-[10px] text-gray-400 font-medium text-center">
          {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
};

interface PollProps {
  socket: Socket | null;
  onSwitch?: () => void;
  showSwitch?: boolean;
}

const PollComponent: React.FC<PollProps> = ({ socket, onSwitch, showSwitch }) => {
  const { user } = useAppSelector((state) => state.auth);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [duration, setDuration] = useState(5);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [includeNone, setIncludeNone] = useState(false);
  const [activeVoterModal, setActiveVoterModal] = useState<Poll | null>(null);
  const [filter, setFilter] = useState<string>("active");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("getPolls", { userId: user.id, filterType: filter });

    const handlePollsList = (list: Poll[]) => setPolls(list);
    const handlePollCreated = (poll: Poll) => {
      if (filter === "active" || filter === "myPolls") {
        setPolls(prev => [poll, ...prev].slice(0, 100));
      }
      addToast("Poll created successfully!", "success");
    };
    const handleVoteUpdated = (updatedPoll: Poll) => {
      setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
    };
    const handleError = (data: { message: string }) => {
      addToast(data.message, "error");
    };

    socket.on("pollsList", handlePollsList);
    // Backward compatibility if backend sends "activePolls" on login
    socket.on("activePolls", handlePollsList);
    socket.on("pollCreated", handlePollCreated);
    socket.on("voteUpdated", handleVoteUpdated);
    socket.on("error", handleError);

    return () => {
      socket.off("pollsList", handlePollsList);
      socket.off("activePolls", handlePollsList);
      socket.off("pollCreated", handlePollCreated);
      socket.off("voteUpdated", handleVoteUpdated);
      socket.off("error", handleError);
    };
  }, [socket, user?.id, filter]);

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !user) return;

    const trimmedQuestion = newQuestion.trim();
    if (trimmedQuestion && /^\d/.test(trimmedQuestion)) {
      addToast("Question cannot start with a number.", "error");
      return;
    }
    if (/[^A-Za-z0-9\s?!.]/.test(trimmedQuestion)) {
      addToast("Only ? ! . special characters allowed in question.", "error");
      return;
    }

    let optionsToProcess = [...newOptions];
    if (includeNone) optionsToProcess.push("None of the above");

    const filteredOptions = optionsToProcess.map(o => o.trim()).filter(o => o !== "");
    if (filteredOptions.length < 2) {
      addToast("At least 2 options required.", "error");
      return;
    }

    for (const opt of filteredOptions) {
      if (/[^A-Za-z0-9\s]/.test(opt)) {
        addToast(`Option "${opt}" contains forbidden characters.`, "error");
        return;
      }
    }

    if (duration < 1 || duration > 30) {
      addToast("Duration must be 1-30 minutes.", "error");
      return;
    }

    socket.emit("createPoll", {
      creatorId: user.id,
      creatorName: `${user.firstName} ${user.lastName || ""}`.trim(),
      question: trimmedQuestion,
      options: filteredOptions,
      durationMinutes: duration,
      allowMultiple: allowMultiple,
    });

    setNewQuestion("");
    setNewOptions(["", ""]);
    setAllowMultiple(false);
    setIncludeNone(false);
    setIsCreating(false);
  };

  const handleVote = (pollId: string, optionIndex: number, isConcluded: boolean) => {
    if (!socket || !user || isConcluded) return;
    socket.emit("vote", { pollId, optionIndex, userId: user.id, userName: `${user.firstName} ${user.lastName || ""}`.trim() });
  };

  const addOption = () => {
    if (newOptions.length < 5) setNewOptions([...newOptions, ""]);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
      {/* Toast System */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-[80%] pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-slide-up pointer-events-auto ${t.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
            {t.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {t.message}
          </div>
        ))}
      </div>

      {activeVoterModal && (
        <AllVotersModal
          poll={activeVoterModal}
          onClose={() => setActiveVoterModal(null)}
        />
      )}

      {/* Header */}
      <div className="bg-amber-500 px-6 py-4 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-lg"><Vote size={20} /></div>
          <div>
            <h2 className="font-bold text-lg leading-none">Live Polls</h2>
            <p className="text-amber-100 text-[10px] font-medium mt-1">Maximum 100 recent polls</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showSwitch && (
            <button
              onClick={onSwitch}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[10px] font-black uppercase tracking-wider transition-all border border-white/10"
            >
              Switch to Chat
            </button>
          )}
          {!isCreating && (
            <button onClick={() => setIsCreating(true)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white"><Plus size={20} /></button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      {!isCreating && (
        <div className="bg-amber-50 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-b border-amber-100 shrink-0">
          {[
            { id: "active", label: "Active", icon: <Clock size={12} /> },
            { id: "timedOut", label: "Concluded", icon: <AlertCircle size={12} /> },
            { id: "myPolls", label: "My Polls", icon: <User size={12} /> },
            { id: "all", label: "All", icon: <Filter size={12} /> }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${filter === f.id ? "bg-amber-500 text-white" : "bg-white text-amber-700 hover:bg-amber-100 border border-amber-100"}`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scrollbar-hide">
        {isCreating ? (
          <form onSubmit={handleCreatePoll} className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 space-y-3 animate-slide-up">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Question</label>
              <input
                autoFocus
                type="text"
                required
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Options</label>
              {newOptions.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  required={idx < 2}
                  value={opt}
                  onChange={(e) => {
                    const updated = [...newOptions];
                    updated[idx] = e.target.value;
                    setNewOptions(updated);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              ))}
              <div className="flex flex-wrap gap-4 pt-1">
                {newOptions.length < 5 && (
                  <button type="button" onClick={addOption} className="text-amber-600 text-[10px] font-bold hover:underline">+ Add Option</button>
                )}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="includeNone" checked={includeNone} onChange={(e) => setIncludeNone(e.target.checked)} className="w-3 h-3 text-amber-500 rounded" />
                  <label htmlFor="includeNone" className="text-[10px] font-bold text-gray-500 italic cursor-pointer">Include "None of the above"</label>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="allowMultiple" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} className="w-4 h-4 text-amber-500 rounded" />
              <label htmlFor="allowMultiple" className="text-[11px] font-bold text-gray-600 cursor-pointer">Allow multiple choice selection</label>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Duration (1-30 Min)</label>
                <input type="number" min="1" max="30" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="flex items-end gap-2">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-400 hover:bg-gray-100 rounded-lg text-xs font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-200">Create</button>
              </div>
            </div>
          </form>
        ) : (
          polls.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 py-20">
              <Vote size={48} className="opacity-20" />
              <p className="text-sm font-medium italic">No polls found in this category.</p>
            </div>
          ) : (
            polls.map((poll) => {
              const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
              const isCreator = poll.creatorId === user?.id;
              const isConcluded = !poll.isActive || new Date(poll.expiresAt).getTime() <= Date.now();

              return (
                <div key={poll.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3 transition-all ${isConcluded ? "opacity-80" : "hover:scale-[1.01]"}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-1.5 py-0.5 rounded">
                          {isCreator ? "MY POLL" : poll.creatorName.toUpperCase()}
                        </span>
                        {isConcluded && <span className="text-[9px] font-black text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">FINISHED</span>}
                      </div>
                      <h3 className="text-gray-800 font-bold text-sm leading-tight mt-1">{poll.question}</h3>
                    </div>
                    <PollTimer expiresAt={poll.expiresAt} onConclude={() => { /* maybe refresh list */ }} />
                  </div>

                  <div className="space-y-2">
                    {poll.options.map((opt, idx) => {
                      const percentage = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
                      const hasVotedThis = poll.votedOptionIndices?.includes(idx);

                      return (
                        <div key={idx}>
                          <button
                            onClick={() => handleVote(poll.id, idx, isConcluded)}
                            className={`w-full relative h-10 rounded-lg overflow-hidden border transition-all ${hasVotedThis
                              ? "bg-amber-50 border-amber-300"
                              : isConcluded ? "bg-gray-50 border-gray-100" : "bg-white border-gray-100 hover:border-amber-200"
                              } ${isConcluded ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <div className="absolute top-0 left-0 h-full bg-amber-100/50 transition-all duration-700" style={{ width: `${percentage}%` }} />
                            <div className="relative z-10 flex justify-between items-center px-3 h-full text-[12px]">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${hasVotedThis ? "text-amber-900" : "text-gray-700"}`}>{opt.text}</span>
                                {hasVotedThis && <CheckCircle2 size={12} className="text-amber-600" />}
                              </div>
                              <div className="flex items-center gap-2">
                                {(poll.hasVoted || isCreator || isConcluded) && opt.votes > 0 && <span className="text-amber-700 font-black text-[10px]">{Math.round(percentage)}%</span>}
                                <span className="text-gray-400 font-medium">({opt.votes})</span>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[10px] font-bold italic">
                      {isConcluded ? (
                        <span className="text-gray-400">VOTING FINISHED - RESULTS FINAL</span>
                      ) : poll.hasVoted ? (
                        <span className="text-amber-600">{poll.allowMultiple ? "CLICK AGAIN TO CHANGE VOTES" : "CLICK ANOTHER TO SWITCH VOTE"}</span>
                      ) : (
                        <span className="text-amber-400">CAST YOUR VOTE ABOVE</span>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveVoterModal(poll)}
                      className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-800 hover:underline transition-colors"
                    >
                      <Users size={11} />
                      View Votes
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};

export default PollComponent;
