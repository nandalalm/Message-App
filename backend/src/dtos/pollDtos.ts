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
  allowMultiple: boolean;
  hasVoted: boolean;
  votedOptionIndices: number[];
  voters: { userName: string; optionIndex: number }[];
}

export interface CreatePollDTO {
  creatorId: string;
  creatorName: string;
  question: string;
  options: string[];
  allowMultiple: boolean;
}
