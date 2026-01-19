// Minimal Supabase Database Types (placeholder).
// Optional: Ersetze diese Datei später durch die generierten Types aus Supabase.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          name: string | null;
          description: string | null;
          game_system: string | null;
          max_players: number | null;
          status: string | null;
          is_published: boolean | null;
          gm_id: string | null;
          created_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: unknown[];
      };
      users: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          primary_role: string | null; // 'GameMaster' | 'Player' | 'Admin'
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: unknown[];
      };
      campaign_members: {
        Row: {
          id: string;
          campaign_id: string | null;
          user_id: string | null;
          created_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: unknown[];
      };
      sessions: {
        Row: {
          id: string;
          campaign_id: string | null;
          title: string | null;
          start_time: string | null;
          status: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: unknown[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
