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
  votedOptionIndices?: number[]; // Added to track specific votes for multi-select
}

interface PollProps {
  socket: Socket | null;
}

const PollComponent: React.FC<PollProps> = ({ socket }) => {
  const { user } = useAppSelector((state) => state.auth);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [duration, setDuration] = useState(5);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !user) {
      console.log("⚠️ [Poll] Waiting for socket or user. Ready:", !!socket, !!user);
      return;
    }

    console.log("🔌 [Poll] Initializing socket listeners. User:", user.id);
    socket.emit("getActivePolls", { userId: user.id });

    const handleActivePolls = (activePolls: Poll[]) => {
      console.log("📊 [Poll] Active polls received, count:", activePolls.length);
      setPolls(activePolls);
    };

    const handlePollCreated = (poll: Poll) => {
      console.log("🆕 [Poll] New poll created notification:", poll.id);
      setPolls((prev) => [poll, ...prev]);
    };

    const handleVoteUpdated = (updatedPoll: Poll) => {
      console.log("🗳️ [Poll] Vote updated notification:", updatedPoll.id);
      setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    };

    const handleError = (data: { message: string }) => {
      console.error("❌ [Poll] Socket error received:", data.message);
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    };

    socket.on("activePolls", handleActivePolls);
    socket.on("pollCreated", handlePollCreated);
    socket.on("voteUpdated", handleVoteUpdated);
    socket.on("error", handleError);

    return () => {
      console.log("🔌 [Poll] Cleaning up socket listeners.");
      socket.off("activePolls", handleActivePolls);
      socket.off("pollCreated", handlePollCreated);
      socket.off("voteUpdated", handleVoteUpdated);
      socket.off("error", handleError);
    };
  }, [socket, user?.id]);

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !user) {
      console.log("🚫 [Poll] Cannot create poll. Ready:", !!socket, !!user);
      return;
    }

    const filteredOptions = newOptions.filter((opt) => opt.trim() !== "");
    if (filteredOptions.length < 2) {
      setError("Please provide at least 2 options.");
      return;
    }

    const pollData = {
      creatorId: user.id,
      creatorName: `${user.firstName} ${user.lastName || ""}`.trim(),
      question: newQuestion,
      options: filteredOptions,
      durationMinutes: duration,
      allowMultiple: allowMultiple,
    };

    console.log("📤 [Poll] Emitting createPoll:", pollData);
    socket.emit("createPoll", pollData);

    setNewQuestion("");
    setNewOptions(["", ""]);
    setAllowMultiple(false);
    setIsCreating(false);
  };

  const handleVote = (pollId: string, optionIndex: number) => {
    if (!socket || !user) return;
    console.log("📤 [Poll] Emitting vote:", { pollId, optionIndex });
    socket.emit("vote", { pollId, optionIndex, userId: user.id });
  };

  const addOption = () => {
    if (newOptions.length < 5) {
      setNewOptions([...newOptions, ""]);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-amber-500 px-6 py-4 flex justify-between items-center">
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
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs animate-shake">
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
              {newOptions.length < 5 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="text-amber-600 text-[10px] font-bold hover:underline"
                >
                  + Add Option
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="allowMultiple"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 border-gray-300"
              />
              <label htmlFor="allowMultiple" className="text-[11px] font-bold text-gray-600 cursor-pointer">
                Allow users to select multiple options
              </label>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Duration (Min)</label>
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
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all"
                >
                  Create
                </button>
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
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      <Clock size={10} />
                      <span>{Math.max(0, Math.ceil((new Date(poll.expiresAt).getTime() - Date.now()) / 60000))}m</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {poll.options.map((opt, idx) => {
                      const percentage = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
                      const hasVotedThisOption = poll.votedOptionIndices?.includes(idx);
                      const canVote = poll.allowMultiple ? !hasVotedThisOption : !poll.hasVoted;

                      return (
                        <button
                          key={idx}
                          disabled={!canVote}
                          onClick={() => handleVote(poll.id, idx)}
                          className={`w-full relative h-10 rounded-lg overflow-hidden border transition-all ${!canVote
                            ? "bg-gray-50 border-gray-100 cursor-default"
                            : "bg-white border-amber-100 hover:border-amber-400 group"
                            }`}
                        >
                          <div
                            className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out ${!canVote ? "bg-amber-100" : "bg-amber-50 group-hover:bg-amber-100"
                              }`}
                            style={{ width: `${percentage}%` }}
                          />
                          <div className="relative z-10 flex justify-between items-center px-3 h-full text-[12px]">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">{opt.text}</span>
                              {hasVotedThisOption && <CheckCircle2 size={12} className="text-green-600" />}
                            </div>
                            <div className="flex items-center gap-2">
                              {(poll.hasVoted || isCreator) && opt.votes > 0 && (
                                <span className="text-amber-700 font-black text-[10px]">{Math.round(percentage)}%</span>
                              )}
                              <span className="text-gray-400 font-medium">({opt.votes})</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {poll.hasVoted && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 justify-center pt-1 italic">
                      {poll.allowMultiple ? "VOICE(S) RECORDED" : "VOICE RECORDED"}
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
