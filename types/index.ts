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
  content: string | CouncilResponse;
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
  answer: string;
  first_step?: string;
  // Legacy fields kept for backwards compat
  choices?: CouncilChoice[];
  council_note?: string;
  question?: string;
}

export interface ChatWithLastMessage extends Chat {
  last_message?: string;
}

// ── El Oráculo — morning briefing ────────────────────────────────
export interface OraculoItem {
  time: string;
  title: string;
  detail: string;
  isMain?: boolean;
  needsDecision?: boolean;
}

export interface OraculoResult {
  headline: string;
  items: OraculoItem[];
  pendingDecision?: string | null;
  backgroundTasks?: string[];
  pattern?: string | null;
}

export type OraculoStatus = 'waiting_personal' | 'waiting_professional' | 'ready';

export interface OraculoDay {
  id: string;
  user_email: string;
  brief_date: string;
  status: OraculoStatus;
  personal_brief: string | null;
  personal_received_at: string | null;
  professional_brief: string | null;
  professional_input_type: 'text' | 'image' | null;
  professional_received_at: string | null;
  itinerary: OraculoResult | null;
  html: string | null;
  png_path: string | null;
  created_at: string;
  updated_at: string;
}
