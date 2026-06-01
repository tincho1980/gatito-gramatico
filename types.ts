export enum WordType {
  Aguda = 'Aguda',
  Grave = 'Grave',
  Esdrujula = 'Esdrújula',
  Sobreesdrujula = 'Sobreesdrújula'
}

export interface WordChallenge {
  displayWord: string; // Word without tilde (e.g., "arbol")
  correctWord: string; // Word with tilde (e.g., "árbol")
  type: WordType;
  hasTilde: boolean;
  difficulty: number; // 1-10
  explanation: string;
}

export interface UserStats {
  totalRounds: number;
  totalScore: number;
  maxScore: number;
  averageEfficiency: number; // 0-100
  averageLevel: number;
  skillLevel: number; // 1-10, adaptive difficulty for next round
  history: GameResult[];
}

export interface GameResult {
  date: string; // ISO date
  score: number; // Max 20
  efficiency: number; // %
  targetLevel: number; // skillLevel used for this round
  averageLevel: number; // average difficulty of words returned by AI
}

export interface User {
  email: string;
  name: string;
  stats: UserStats;
  medals: string[];
}

export interface GameState {
  words: WordChallenge[];
  currentIndex: number;
  score: number; // +0.5 per correct attribute (Type / Tilde)
  answers: {
    word: string;
    userType: WordType | null;
    userTilde: boolean | null;
    isCorrect: boolean;
  }[];
  isFinished: boolean;
}