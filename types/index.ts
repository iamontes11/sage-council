export interface Creator {
  id: string;
  name: string;
  emoji: string;
  color: string;
  tagline: string;
  philosophy: string;
  systemPrompt: string;
}

export interface TranscriptChunk {
  id: string;
  creator_id: string;
  video_id: string;
  video_title: string;
  chunk_text: string;
  chunk_index: number;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

export interface CouncilChoice {
  id: number;
  title: string;
  inspired_by: string[];
  tagline: string;
  perspective: string;
  advice: string;
  first_step: string;
}

export interface CouncilResponse {
  choices: CouncilChoice[];
  council_note?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string | CouncilResponse;
  created_at: string;
}

export interface ChatWithLastMessage extends Chat {
  last_message?: string;
}
