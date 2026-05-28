export type Flashcard = {
  id: string;
  word: string;
  definition: string;
  tags: string[];
  correctCount: number;
  wrongCount: number;
  createdAt: number;
  lastReviewedAt: number | null;
};

export type Tag = {
  id: string;
  name: string;
  createdAt: number;
};
