export interface PollOptionDTO {
  text: string;
  votes: number;
}

export interface PollDTO {
  id: string;
  creatorId: string;
  creatorName: string;
  question: string;
  options: PollOptionDTO[];
  expiresAt: string;
  isActive: boolean;
  allowMultiple: boolean;
  hasVoted: boolean;
  votedOptionIndices: number[];
  voters: { userName: string; optionIndex: number }[]; // For the voter list modal
}

export interface CreatePollDTO {
  creatorId: string;
  creatorName: string;
  question: string;
  options: string[];
  durationMinutes: number;
  allowMultiple: boolean;
}
