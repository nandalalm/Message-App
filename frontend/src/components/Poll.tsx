import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Vote, Plus, AlertCircle, CheckCircle2, User, Filter, Users, ChevronDown, Repeat } from "lucide-react";
import { useAppSelector } from "../redux/store";
import NotificationCount from "./NotificationCount";

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
  allowMultiple: boolean;
  expiresAt: string;
  isExpired: boolean;
  hasVoted: boolean;
  votedOptionIndices?: number[];
  voters: { userId: string; userName: string; optionIndex: number }[];
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const formatDateTimeLocalValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getDefaultExpiryValue = (): string => {
  const defaultExpiry = new Date(Date.now() + 60 * 60 * 1000);
  defaultExpiry.setSeconds(0, 0);
  return formatDateTimeLocalValue(defaultExpiry);
};

const formatExpiryLabel = (expiresAt: string): string => {
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(expiryDate);
};

const getPollExpiryTimestamp = (expiresAt: string): number => {
  const expiryTimestamp = new Date(expiresAt).getTime();
  return Number.isNaN(expiryTimestamp) ? 0 : expiryTimestamp;
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
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1 break-all leading-relaxed">
          {poll.question.length > 250 ? poll.question.slice(0, 250) + "..." : poll.question}
        </p>
        <div className="max-h-72 overflow-y-auto p-3 scrollbar-hide space-y-3">
          {totalVotes === 0 ? (
            <p className="text-center py-8 text-gray-400 text-xs italic">No votes have been cast yet.</p>
          ) : (
            poll.options.map((opt, idx) => {
              const optVoters = poll.voters.filter(v => v.optionIndex === idx).map(v => v.userName);
              const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
              return (
                <div key={idx} className="bg-gray-50 rounded-xl overflow-hidden">
                  <div className="flex justify-between items-start px-3 py-2">
                    <span className="text-xs font-bold text-gray-700 break-all whitespace-normal leading-relaxed py-1 flex-1 min-w-0">{opt.text}</span>
                    <span className="text-[10px] font-black text-amber-600 ml-2 mt-1 shrink-0">{opt.votes} vote{opt.votes !== 1 ? "s" : ""} · {percentage}%</span>
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
  const { messageUnreadCount, muteSettings } = useAppSelector((state) => state.notifications);
  const isMessageMuted = muteSettings.mutedNotificationTypes.includes("message");
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [newExpiryAt, setNewExpiryAt] = useState(getDefaultExpiryValue);
  const [includeNone, setIncludeNone] = useState(false);
  const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);
  const [activeVoterModal, setActiveVoterModal] = useState<Poll | null>(null);
  const [filter, setFilter] = useState<"all" | "myPolls">("all");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pollsContainerRef = useRef<HTMLDivElement>(null);
  const pollsEndRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const pollsRef = useRef(polls);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    pollsRef.current = polls;
  }, [polls]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const addToast = (message: string, type: "success" | "error", duration: number = 1000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    pollsEndRef.current?.scrollIntoView({ behavior });
  };

  const resetPollForm = () => {
    setNewQuestion("");
    setNewOptions(["", ""]);
    setAllowMultiple(false);
    setNewExpiryAt(getDefaultExpiryValue());
    setIncludeNone(false);
    setIsSubmittingPoll(false);
  };

  useEffect(() => {
    if (!socket || !user) return;
    setHasMore(true);
    if (pollsRef.current.length === 0) {
      setIsInitialLoading(true);
    }
    socket.emit("getPolls", { userId: user.id, filterType: filter, limit: 20, skip: 0 });
  }, [socket, user, filter]);

  useEffect(() => {
    if (!socket || !user) return;

    const handlePollsList = (list: Poll[]) => {
      if (list.length < 20) setHasMore(false);

      const reversedList = [...list].reverse();

      const updateData = () => {
        if (isLoadingMore) {
          setPolls(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPolls = reversedList.filter(p => !existingIds.has(p.id));
            return [...newPolls, ...prev].slice(-100);
          });
        } else {
          setPolls(reversedList);
        }
        setIsLoadingMore(false);
        setIsInitialLoading(false);
      };

      if (isLoadingMore) {
        setTimeout(updateData, 1000);
      } else {
        updateData();
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          setTimeout(() => scrollToBottom("auto"), 100);
        }
      }
    };

    const handlePollCreated = (poll: Poll) => {
      setPolls(prev => [...prev, poll].slice(-100));
      setTimeout(() => scrollToBottom("smooth"), 100);
      if (poll.creatorId === user?.id) {
        setIsSubmittingPoll(false);
        addToast("Poll created successfully!", "success");
      }
    };
    const handleVoteUpdated = (updatedPoll: Poll) => {
      setPolls(prev => prev.map(p => {
        if (p.id === updatedPoll.id) {
          const myVotes = updatedPoll.voters
            .filter(v => v.userId === user?.id)
            .map(v => v.optionIndex);
          
          return {
            ...p,
            options: updatedPoll.options,
            allowMultiple: updatedPoll.allowMultiple,
            expiresAt: updatedPoll.expiresAt,
            isExpired: updatedPoll.isExpired,
            voters: updatedPoll.voters,
            hasVoted: myVotes.length > 0,
            votedOptionIndices: myVotes,
          };
        }
        return p;
      }));
    };
    const handleError = (data: { message: string }) => {
      setIsSubmittingPoll(false);
      const isLimitError = data.message.includes("Daily poll limit");
      addToast(data.message, "error", isLimitError ? 3000 : 2000);
    };

    socket.on("pollsList", handlePollsList);
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
  }, [socket, user, filter, isLoadingMore]);

  useEffect(() => {
    if (pollsContainerRef.current && prevScrollHeightRef.current > 0) {
      const { scrollHeight } = pollsContainerRef.current;
      pollsContainerRef.current.scrollTop = scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [polls]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('button') && !target.closest('input') && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollTop === 0 && hasMore && !isLoadingMore && socket && polls.length > 0) {
      setIsLoadingMore(true);
      prevScrollHeightRef.current = scrollHeight;
      socket.emit("getPolls", { userId: user?.id, filterType: filter, limit: 20, skip: polls.length });
    }

    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
    setShowScrollButton(!isNearBottom && polls.length > 5);
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !user || isSubmittingPoll) return;

    const trimmedQuestion = newQuestion.trim();
    if (!trimmedQuestion) {
      addToast("Poll question is required.", "error", 2000);
      return;
    }

    if (trimmedQuestion.length < 5) {
      addToast("Question must be at least 5 characters.", "error", 2000);
      return;
    }

    if (!newExpiryAt) {
      addToast("Poll expiry date and time is required.", "error", 2000);
      return;
    }

    const optionsToProcess = [...newOptions];
    if (includeNone) optionsToProcess.push("None of the above");

    const filteredOptions = optionsToProcess
      .map(o => o.trim())
      .filter(o => o !== "");

    if (filteredOptions.length < 2) {
      addToast("At least 2 non-empty options are required.", "error", 2000);
      return;
    }

    if (filteredOptions.length > 12) {
      addToast("Maximum 12 options are allowed.", "error", 2000);
      return;
    }

    for (const opt of filteredOptions) {
      if (opt.length < 1) {
        addToast(`Options cannot be empty.`, "error", 2000);
        return;
      }
    }

    const uniqueOptions = new Set(filteredOptions.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== filteredOptions.length) {
      addToast("Duplicate options are not allowed.", "error", 2000);
      return;
    }

    const parsedExpiry = new Date(newExpiryAt);
    if (Number.isNaN(parsedExpiry.getTime())) {
      addToast("Poll expiry date and time is invalid.", "error", 2000);
      return;
    }

    if (parsedExpiry.getTime() <= Date.now()) {
      addToast("Poll expiry must be a future date and time.", "error", 2000);
      return;
    }

    setIsSubmittingPoll(true);
    socket.emit("createPoll", {
      creatorId: user.id,
      creatorName: user.username,
      question: trimmedQuestion,
      options: filteredOptions,
      allowMultiple: allowMultiple,
      expiresAt: parsedExpiry.toISOString(),
    });

    resetPollForm();
    setIsCreating(false);
  };

  const handleVote = (poll: Poll, optionIndex: number) => {
    if (!socket || !user) return;
    const pollIsExpired = poll.isExpired || getPollExpiryTimestamp(poll.expiresAt) <= currentTime;
    if (pollIsExpired) {
      addToast("This poll has expired.", "error", 2000);
      return;
    }

    socket.emit("vote", { pollId: poll.id, optionIndex, userId: user.id, userName: user.username });
  };

  const addOption = () => {
    if (newOptions.length < 12) setNewOptions([...newOptions, ""]);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-[40%] pointer-events-none">
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

      <div className="bg-amber-500 px-6 py-4 flex justify-between items-center z-40 shrink-0">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-lg"><Vote size={20} /></div>
          <div>
            <h2 className="font-bold text-lg max-sm:text-sm leading-none pt-1">
              {windowWidth <= 380 ? "Polls" : "All Polls"}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showSwitch && (
            <button
              onClick={onSwitch}
              className="relative flex items-center gap-2 px-3 py-1.5 max-sm:px-2 max-sm:py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[10px] max-sm:text-[9px] font-black uppercase tracking-wider transition-all border border-white/10 shrink-0"
            >
              <Repeat size={14} className="max-sm:w-3 max-sm:h-3" />
              <span className="max-sm:hidden">Switch to </span>Chat
              {messageUnreadCount > 0 && (
                <span className={`absolute -top-2 -right-2 min-w-[16px] h-4 rounded-full text-[8px] font-black flex items-center justify-center px-1 shadow-lg ring-2 ring-amber-500 ${
                  isMessageMuted ? "bg-gray-300 text-gray-900" : "bg-red-500 text-white"
                }`}>
                  {messageUnreadCount > 9 ? "9+" : messageUnreadCount}
                </span>
              )}
            </button>
          )}
          {!isCreating && (
            <button 
              onClick={() => setIsCreating(true)} 
              disabled={!user}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white disabled:opacity-50"
              title={user ? "Create Poll" : "Loading profile..."}
            >
              <Plus size={20} />
            </button>
          )}
          <NotificationCount />
        </div>
      </div>

      {!isCreating && (
        <div className="bg-amber-50 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-b border-amber-100 shrink-0">
          {[
            { id: "all", label: "All Polls", icon: <Filter size={12} /> },
            { id: "myPolls", label: "My Polls", icon: <User size={12} /> }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as "all" | "myPolls")}
              className={`flex items-center gap-1.5 px-3 py-1 max-sm:px-2.5 max-sm:py-0.5 rounded-full text-[10px] max-sm:text-[9px] font-bold transition-all whitespace-nowrap ${filter === f.id ? "bg-amber-500 text-white" : "bg-white text-amber-700 hover:bg-amber-100 border border-amber-100"}`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      )}

      <div 
        ref={pollsContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scrollbar-hide"
      >
        {isCreating ? (
          <form onSubmit={handleCreatePoll} className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 space-y-3 animate-slide-up">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Question</label>
              <textarea
                autoFocus
                required
                rows={2}
                maxLength={400}
                value={newQuestion}
                onChange={(e) => {
                  setNewQuestion(e.target.value.slice(0, 400));
                }}
                placeholder="What's on your mind?"
                className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none scrollbar-hide"
              />
            </div>
            <div className="space-y-2">
              {newOptions.map((opt, idx) => (
                <textarea
                  key={idx}
                  required={idx < 2}
                  rows={1}
                  maxLength={100}
                  value={opt}
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 100);
                    const updated = [...newOptions];
                    updated[idx] = val;
                    setNewOptions(updated);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none scrollbar-hide"
                />
              ))}
              <div className="flex flex-wrap gap-4 pt-1">
                {newOptions.length < 12 ? (
                  <>
                    <button type="button" onClick={addOption} className="text-amber-600 text-[10px] font-bold hover:underline">+ Add Option (Max 12)</button>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="includeNone" checked={includeNone} onChange={(e) => setIncludeNone(e.target.checked)} className="w-3 h-3 text-amber-500 rounded" />
                      <label htmlFor="includeNone" className="text-[10px] font-bold text-gray-500 italic cursor-pointer">Include "None of the above"</label>
                    </div>
                  </>
                ) : (
                  <p className="text-amber-600 text-[10px] font-bold italic">Maximum 12 options reached</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Expires At</label>
              <input
                type="datetime-local"
                required
                value={newExpiryAt}
                min={formatDateTimeLocalValue(new Date(currentTime))}
                onChange={(e) => setNewExpiryAt(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="allowMultiple" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} className="w-4 h-4 text-amber-500 rounded" />
              <label htmlFor="allowMultiple" className="text-[11px] font-bold text-gray-600 cursor-pointer">Allow multiple choice selection</label>
            </div>
            <div className="flex items-end justify-end gap-2">
              <button type="button" onClick={() => {
                resetPollForm();
                setIsCreating(false);
              }} disabled={isSubmittingPoll} className="px-4 py-2 text-gray-400 hover:bg-gray-100 rounded-lg text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={isSubmittingPoll} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-200 disabled:cursor-not-allowed disabled:opacity-60">{isSubmittingPoll ? "Creating..." : "Create"}</button>
            </div>
          </form>
        ) : isInitialLoading && polls.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 space-y-3">
                <div className="h-3 bg-gray-200 rounded-full w-24" />
                <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                <div className="space-y-2">
                  <div className="h-10 bg-gray-100 rounded-xl" />
                  <div className="h-10 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : polls.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 py-20">
            <Vote size={48} className="opacity-20" />
            <p className="text-sm font-medium italic">No polls found in this category.</p>
          </div>
        ) : (
          polls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
            const isCreator = poll.creatorId === user?.id;
            const pollIsExpired = poll.isExpired || getPollExpiryTimestamp(poll.expiresAt) <= currentTime;

            return (
              <div key={poll.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3 transition-all hover:scale-[1.01]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-1.5 py-0.5 rounded">
                        {isCreator ? "MY POLL" : poll.creatorName.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-gray-800 font-bold text-sm max-sm:text-xs leading-tight mt-1 break-all whitespace-normal">{poll.question}</h3>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold ${pollIsExpired ? "text-red-500" : "text-gray-500"}`}>
                        {pollIsExpired ? "Expired" : "Ends"} {formatExpiryLabel(poll.expiresAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {poll.options.map((opt, idx) => {
                    const percentage = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
                    const hasVotedThis = poll.votedOptionIndices?.includes(idx);

                    return (
                      <div key={idx} className="relative group/opt">
                        <button
                          disabled={pollIsExpired}
                          onClick={(e) => {
                            handleVote(poll, idx);
                            (e.currentTarget as HTMLButtonElement).blur();
                          }}
                          className={`w-full relative min-h-[42px] sm:min-h-[44px] flex flex-col rounded-xl border transition-all duration-300 ${
                            hasVotedThis 
                              ? "border-gray-200 bg-white" 
                              : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200"
                          } outline-none focus:outline-none ring-0 focus:ring-0 active:scale-[0.98] select-none overflow-hidden disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-100 disabled:opacity-75`}
                        >
                          <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out bg-amber-500/15`} 
                            style={{ width: `${percentage}%` }} 
                          />
                          
                          <div className="relative z-10 w-full flex justify-between items-start px-4 py-3 text-[13px] max-sm:text-[12px]">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all mt-0.5 ${
                                hasVotedThis ? "border-amber-500 bg-amber-500 text-white" : "border-gray-300 bg-white"
                              }`}>
                                {hasVotedThis && <CheckCircle2 size={12} strokeWidth={3} className="animate-in zoom-in duration-300 text-white" />}
                              </div>
                              <span className={`font-semibold break-all whitespace-normal block w-full transition-colors text-left leading-tight ${hasVotedThis ? "text-amber-900" : "text-gray-700"}`}>
                                {opt.text}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 ml-2 mt-0.5">
                              <span className={`font-bold text-[11px] ${hasVotedThis ? "text-amber-700" : "text-gray-500"}`}>
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] font-bold italic">
                    {pollIsExpired ? (
                      <span className="text-red-500">POLL CLOSED</span>
                    ) : poll.hasVoted ? (
                      <span className="text-amber-600">{poll.allowMultiple ? "CLICK AGAIN TO CHANGE VOTES" : "CLICK TO SWITCH VOTE"}</span>
                    ) : (
                      <span className="text-amber-400">CAST YOUR VOTE ABOVE</span>
                    )}
                  </div>
                  <button
                    disabled={totalVotes === 0}
                    onClick={() => setActiveVoterModal(poll)}
                    className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${
                      totalVotes === 0 
                        ? "text-amber-300 cursor-default" 
                        : "text-amber-600 hover:text-amber-800 hover:underline"
                    }`}
                  >
                    <Users size={11} />
                    View Votes
                  </button>
                </div>
              </div>
            );
          })
        )}
        {isLoadingMore && (
          <div className="flex flex-col items-center justify-center py-4 animate-fade-in">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-1" />
          </div>
        )}
        <div ref={pollsEndRef} />
      </div>

      {showScrollButton && !isCreating && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-4 right-4 p-2.5 bg-amber-500 text-white rounded-full shadow-2xl hover:bg-amber-600 transition-all animate-bounce z-20 border-2 border-white/20"
          title="Scroll to latest"
        >
          <ChevronDown size={18} />
        </button>
      )}
    </div>
  );
};

export default PollComponent;
