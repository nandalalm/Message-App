import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { Vote, Plus, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
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

interface PollProps {
  socket: Socket | null;
}

const PollTimer: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, diff));
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  // Color shifting logic (based on percentage of 30 mins max, or just relative)
  // Let's assume start time was roughly 30 mins max.
  // We'll use absolute thresholds: > 10m Green, > 5m Yellow, > 2m Orange, < 2m Red
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

const VoterModal: React.FC<{ voters: string[]; onClose: () => void; optionText: string }> = ({ voters, onClose, optionText }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
      <div className="bg-amber-500 p-4 flex justify-between items-center text-white">
        <h3 className="font-bold text-sm truncate">Voters for "{optionText}"</h3>
        <button onClick={onClose} className="hover:rotate-90 transition-transform font-bold">✕</button>
      </div>
      <div className="max-h-60 overflow-y-auto p-2">
        {voters.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-xs italic">No votes yet.</p>
        ) : (
          <ul className="space-y-1">
            {voters.map((name, i) => (
              <li key={i} className="px-3 py-2 bg-gray-50 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

const PollComponent: React.FC<PollProps> = ({ socket }) => {
  const { user } = useAppSelector((state) => state.auth);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [duration, setDuration] = useState(5);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [includeNone, setIncludeNone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVoterModal, setActiveVoterModal] = useState<{ voters: string[]; optionText: string } | null>(null);

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("getActivePolls", { userId: user.id });

    const handleActivePolls = (activePolls: Poll[]) => setPolls(activePolls);
    const handlePollCreated = (poll: Poll) => setPolls((prev) => [poll, ...prev]);
    const handleVoteUpdated = (updatedPoll: Poll) => setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    const handleError = (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    };

    socket.on("activePolls", handleActivePolls);
    socket.on("pollCreated", handlePollCreated);
    socket.on("voteUpdated", handleVoteUpdated);
    socket.on("error", handleError);

    return () => {
      socket.off("activePolls", handleActivePolls);
      socket.off("pollCreated", handlePollCreated);
      socket.off("voteUpdated", handleVoteUpdated);
      socket.off("error", handleError);
    };
  }, [socket, user?.id]);

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !user) return;

    const trimmedQuestion = newQuestion.trim();
    if (!trimmedQuestion) {
      setError("Question is required.");
      return;
    }

    // Question Validation: Cannot start with a number. Only ? ! . allowed.
    if (/^\d/.test(trimmedQuestion)) {
      setError("Question cannot start with a number.");
      return;
    }
    if (/[^A-Za-z0-9\s?!.]/.test(trimmedQuestion)) {
      setError("Only ?, !, and . are allowed as special characters in question.");
      return;
    }

    let optionsToProcess = [...newOptions];
    if (includeNone) optionsToProcess.push("None of the above");

    const filteredOptions = optionsToProcess
      .map(o => o.trim())
      .filter((opt) => opt !== "");

    if (filteredOptions.length < 2) {
      setError("Please provide at least 2 options.");
      return;
    }

    // Options Validation: No special characters.
    for (const opt of filteredOptions) {
      if (/[^A-Za-z0-9\s]/.test(opt)) {
        setError(`Option "${opt}" contains forbidden special characters.`);
        return;
      }
    }

    // Duration Validation: 1-30, numbers only.
    if (isNaN(duration) || duration < 1 || duration > 30) {
      setError("Duration must be between 1 and 30 minutes.");
      return;
    }

    const pollData = {
      creatorId: user.id,
      creatorName: `${user.firstName} ${user.lastName || ""}`.trim(),
      question: trimmedQuestion,
      options: filteredOptions,
      durationMinutes: duration,
      allowMultiple: allowMultiple,
    };

    socket.emit("createPoll", pollData);

    setNewQuestion("");
    setNewOptions(["", ""]);
    setAllowMultiple(false);
    setIncludeNone(false);
    setIsCreating(false);
  };

  const handleVote = (pollId: string, optionIndex: number) => {
    if (!socket || !user) return;
    socket.emit("vote", { pollId, optionIndex, userId: user.id, userName: `${user.firstName} ${user.lastName || ""}`.trim() });
  };

  const addOption = () => {
    if (newOptions.length < 5) setNewOptions([...newOptions, ""]);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
      {activeVoterModal && (
        <VoterModal
          voters={activeVoterModal.voters}
          optionText={activeVoterModal.optionText}
          onClose={() => setActiveVoterModal(null)}
        />
      )}

      {/* Header */}
      <div className="bg-amber-500 px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Vote className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Live Polls</h2>
            <p className="text-amber-100 text-xs font-medium">Vote or create your own</p>
          </div>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white"
            title="Create Poll"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scrollbar-hide">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs animate-shake z-20 sticky top-0">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

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
                className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
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
                  className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
                />
              ))}
              <div className="flex flex-wrap gap-4 pt-1">
                {newOptions.length < 5 && (
                  <button type="button" onClick={addOption} className="text-amber-600 text-[10px] font-bold hover:underline">+ Add Option</button>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeNone"
                    checked={includeNone}
                    onChange={(e) => setIncludeNone(e.target.checked)}
                    className="w-3 h-3 text-amber-500 rounded border-gray-300"
                  />
                  <label htmlFor="includeNone" className="text-[10px] font-bold text-gray-500 cursor-pointer italic">Include "None of the above"</label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="allowMultiple"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 border-gray-300"
              />
              <label htmlFor="allowMultiple" className="text-[11px] font-bold text-gray-600 cursor-pointer">Allow multiple choice selection</label>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Duration (1-30 Min)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all">Create</button>
              </div>
            </div>
          </form>
        ) : (
          polls.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 py-20">
              <Vote size={48} className="opacity-20" />
              <p className="text-sm font-medium italic">No active polls right now.</p>
            </div>
          ) : (
            polls.map((poll) => {
              const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
              const isCreator = poll.creatorId === user?.id;

              return (
                <div key={poll.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3 transition-transform hover:scale-[1.01]">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">
                        {isCreator ? "MY POLL" : poll.creatorName.toUpperCase()}
                      </span>
                      <h3 className="text-gray-800 font-bold text-sm leading-tight mt-1">{poll.question}</h3>
                    </div>
                    <PollTimer expiresAt={poll.expiresAt} />
                  </div>

                  <div className="space-y-2">
                    {poll.options.map((opt, idx) => {
                      const percentage = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
                      const hasVotedThisOption = poll.votedOptionIndices?.includes(idx);
                      const optionVoterNames = poll.voters.filter(v => v.optionIndex === idx).map(v => v.userName);

                      return (
                        <div key={idx} className="relative group">
                          <button
                            onClick={() => handleVote(poll.id, idx)}
                            className={`w-full relative h-10 rounded-lg overflow-hidden border transition-all ${hasVotedThisOption
                              ? "bg-amber-50 border-amber-300"
                              : "bg-white border-gray-100 hover:border-amber-200"
                              }`}
                          >
                            <div
                              className="absolute top-0 left-0 h-full bg-amber-100/50 transition-all duration-700 ease-out"
                              style={{ width: `${percentage}%` }}
                            />
                            <div className="relative z-10 flex justify-between items-center px-3 h-full text-[12px]">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${hasVotedThisOption ? "text-amber-900" : "text-gray-700"}`}>{opt.text}</span>
                                {hasVotedThisOption && <CheckCircle2 size={12} className="text-amber-600" />}
                              </div>
                              <div className="flex items-center gap-2">
                                {(poll.hasVoted || isCreator) && opt.votes > 0 && (
                                  <span className="text-amber-700 font-black text-[10px]">{Math.round(percentage)}%</span>
                                )}
                                <span className="text-gray-400 font-medium">({opt.votes})</span>
                              </div>
                            </div>
                          </button>
                          {/* Voter Dropdown Trigger */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveVoterModal({ voters: optionVoterNames, optionText: opt.text }); }}
                            className="absolute -right-1 -top-1 p-1 bg-white shadow-sm border border-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-amber-50"
                            title="View Voters"
                          >
                            <Plus size={10} className="text-amber-600" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {poll.hasVoted && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 justify-center pt-1 italic">
                      {poll.allowMultiple ? "VOICE(S) RECORDED - CLICK AGAIN TO CHANGE" : "VOICE RECORDED - CLICK ANOTHER TO SWITCH"}
                    </div>
                  )}
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
