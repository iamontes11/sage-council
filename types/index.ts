export interface Creator {
  id: string;
  name: string;
  emoji: string;
  color: string;
  tagline: string;
  philosophy: string;
  systemPrompt: string;
}

export interface Chat {
  id: string;
  user_email: string;
  title: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CouncilChoice {
  id?: string | number;
  creatorId?: string;
  creatorName?: string;
  emoji?: string;
  color?: string;
  title: string;
  advice: string;
  actionStep?: string;
  first_step?: string;
  inspired_by?: string[];
  tagline?: string;
  perspective?: string;
}

export interface CouncilResponse {
  choices: CouncilChoice[];
  question: string;
  council_note?: string;
}
