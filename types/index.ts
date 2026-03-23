export type TweetStatus = "scheduled" | "posted" | "failed";

export type TimeSlot = "9AM" | "12PM" | "3PM" | "6PM" | "9PM" | "custom";

export interface Tweet {
  id: string;
  user_id: string;
  content: string;
  scheduled_at: string;
  time_slot: TimeSlot;
  category: string | null;
  status: TweetStatus;
  posted_at: string | null;
  error_message: string | null;
  x_tweet_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface XConnection {
  id: string;
  user_id: string;
  x_user_id: string;
  x_username: string;
  x_display_name: string | null;
  access_token_id: string | null;
  refresh_token_id: string | null;
  token_expires_at: string | null;
  connected_at: string;
  updated_at: string;
}

export interface TweetVariation {
  content: string;
  hook_type: string;
  estimated_engagement: "low" | "medium" | "high";
}

export const TIME_SLOT_HOURS: Record<Exclude<TimeSlot, "custom">, number> = {
  "9AM": 9,
  "12PM": 12,
  "3PM": 15,
  "6PM": 18,
  "9PM": 21,
};
