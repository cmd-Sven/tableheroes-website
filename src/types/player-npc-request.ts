export type PlayerNpcRequest = {
  id: string;
  campaign_id: string;
  player_id: string;
  character_id: string;
  name: string;
  relationship_type: string;
  description: string | null;
  status: "pending" | "approved";
  created_at: string;
};
