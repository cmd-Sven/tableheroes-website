export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          default_image_url: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_custom: boolean
          name: string
          points_awarded: number | null
        }
        Insert: {
          created_at?: string | null
          default_image_url?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_custom?: boolean
          name: string
          points_awarded?: number | null
        }
        Update: {
          created_at?: string | null
          default_image_url?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_custom?: boolean
          name?: string
          points_awarded?: number | null
        }
        Relationships: []
      }
      achievements_def: {
        Row: {
          campaign_id: number | null
          icon: string | null
          id: number
          reward_points: number | null
          source: Database["public"]["Enums"]["achievement_source"] | null
          title: string | null
          trigger_type:
            | Database["public"]["Enums"]["achievement_trigger"]
            | null
          trigger_value: number | null
        }
        Insert: {
          campaign_id?: number | null
          icon?: string | null
          id?: number
          reward_points?: number | null
          source?: Database["public"]["Enums"]["achievement_source"] | null
          title?: string | null
          trigger_type?:
            | Database["public"]["Enums"]["achievement_trigger"]
            | null
          trigger_value?: number | null
        }
        Update: {
          campaign_id?: number | null
          icon?: string | null
          id?: number
          reward_points?: number | null
          source?: Database["public"]["Enums"]["achievement_source"] | null
          title?: string | null
          trigger_type?:
            | Database["public"]["Enums"]["achievement_trigger"]
            | null
          trigger_value?: number | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          checked_in: boolean | null
          reason_text: string | null
          session_id: number
          status: string | null
          user_id: number
        }
        Insert: {
          checked_in?: boolean | null
          reason_text?: string | null
          session_id: number
          status?: string | null
          user_id: number
        }
        Update: {
          checked_in?: boolean | null
          reason_text?: string | null
          session_id?: number
          status?: string | null
          user_id?: number
        }
        Relationships: []
      }
      bestarium_creatures: {
        Row: {
          ability_cha: number | null
          ability_con: number | null
          ability_dex: number | null
          ability_int: number | null
          ability_str: number | null
          ability_wis: number | null
          alignment: string | null
          armor_class: number | null
          attacks: Json
          challenge_rating: number | null
          condition_immunities: string | null
          created_at: string
          creature_type: string | null
          damage_immunities: string | null
          damage_resistances: string | null
          damage_vulnerabilities: string | null
          game_system: string
          hit_dice: string | null
          hit_points: number | null
          id: string
          image_display: Json | null
          image_url: string | null
          lair_actions: string | null
          languages: string | null
          legendary_actions: string | null
          location_id: string | null
          lore_id: string | null
          lore_notes: string | null
          multiattack_notes: string | null
          name: string
          passive_traits: string | null
          physical_description: string | null
          player_knowledge: string | null
          senses: string | null
          size_category: string | null
          sort_order: number
          special_abilities: string | null
          subtype: string | null
          updated_at: string
          world_id: string
          xp_awarded: number | null
        }
        Insert: {
          ability_cha?: number | null
          ability_con?: number | null
          ability_dex?: number | null
          ability_int?: number | null
          ability_str?: number | null
          ability_wis?: number | null
          alignment?: string | null
          armor_class?: number | null
          attacks?: Json
          challenge_rating?: number | null
          condition_immunities?: string | null
          created_at?: string
          creature_type?: string | null
          damage_immunities?: string | null
          damage_resistances?: string | null
          damage_vulnerabilities?: string | null
          game_system?: string
          hit_dice?: string | null
          hit_points?: number | null
          id?: string
          image_display?: Json | null
          image_url?: string | null
          lair_actions?: string | null
          languages?: string | null
          legendary_actions?: string | null
          location_id?: string | null
          lore_id?: string | null
          lore_notes?: string | null
          multiattack_notes?: string | null
          name: string
          passive_traits?: string | null
          physical_description?: string | null
          player_knowledge?: string | null
          senses?: string | null
          size_category?: string | null
          sort_order?: number
          special_abilities?: string | null
          subtype?: string | null
          updated_at?: string
          world_id: string
          xp_awarded?: number | null
        }
        Update: {
          ability_cha?: number | null
          ability_con?: number | null
          ability_dex?: number | null
          ability_int?: number | null
          ability_str?: number | null
          ability_wis?: number | null
          alignment?: string | null
          armor_class?: number | null
          attacks?: Json
          challenge_rating?: number | null
          condition_immunities?: string | null
          created_at?: string
          creature_type?: string | null
          damage_immunities?: string | null
          damage_resistances?: string | null
          damage_vulnerabilities?: string | null
          game_system?: string
          hit_dice?: string | null
          hit_points?: number | null
          id?: string
          image_display?: Json | null
          image_url?: string | null
          lair_actions?: string | null
          languages?: string | null
          legendary_actions?: string | null
          location_id?: string | null
          lore_id?: string | null
          lore_notes?: string | null
          multiattack_notes?: string | null
          name?: string
          passive_traits?: string | null
          physical_description?: string | null
          player_knowledge?: string | null
          senses?: string | null
          size_category?: string | null
          sort_order?: number
          special_abilities?: string | null
          subtype?: string | null
          updated_at?: string
          world_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bestarium_creatures_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bestarium_creatures_lore_id_fkey"
            columns: ["lore_id"]
            isOneToOne: false
            referencedRelation: "world_lore"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bestarium_creatures_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_applications: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          message: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_loot_containers: {
        Row: {
          campaign_id: string
          chest_opened: boolean
          created_at: string
          gp_remaining: number
          id: string
          identify_requests: Json
          items_json: Json
          name: string
          sp_remaining: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          chest_opened?: boolean
          created_at?: string
          gp_remaining?: number
          id?: string
          identify_requests?: Json
          items_json?: Json
          name: string
          sp_remaining?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          chest_opened?: boolean
          created_at?: string
          gp_remaining?: number
          id?: string
          identify_requests?: Json
          items_json?: Json
          name?: string
          sp_remaining?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_loot_containers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          application_message: string | null
          campaign_id: string
          campaign_rank: string | null
          character_id: string | null
          created_at: string | null
          has_seen_acceptance: boolean | null
          id: string
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          application_message?: string | null
          campaign_id: string
          campaign_rank?: string | null
          character_id?: string | null
          created_at?: string | null
          has_seen_acceptance?: boolean | null
          id?: string
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          application_message?: string | null
          campaign_id?: string
          campaign_rank?: string | null
          character_id?: string | null
          created_at?: string | null
          has_seen_acceptance?: boolean | null
          id?: string
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_npc_reputation: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          last_seen_at: string | null
          last_seen_location_id: string | null
          last_seen_session_id: string | null
          npc_id: string
          reputation_score: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          last_seen_location_id?: string | null
          last_seen_session_id?: string | null
          npc_id: string
          reputation_score?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          last_seen_location_id?: string | null
          last_seen_session_id?: string | null
          npc_id?: string
          reputation_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_npc_reputation_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_npc_reputation_last_seen_location_id_fkey"
            columns: ["last_seen_location_id"]
            isOneToOne: false
            referencedRelation: "world_lore"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_npc_reputation_last_seen_session_id_fkey"
            columns: ["last_seen_session_id"]
            isOneToOne: false
            referencedRelation: "session_archives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_npc_reputation_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_location_reputation: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          location_id: string
          reputation_score: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          location_id: string
          reputation_score?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          location_id?: string
          reputation_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_location_reputation_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_location_reputation_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "world_lore"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_notes: {
        Row: {
          campaign_id: string
          content: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_gm_only: boolean | null
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_gm_only?: boolean | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_gm_only?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_notes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_shop_items: {
        Row: {
          base_price_gp: number
          created_at: string
          description: string | null
          id: string
          is_legal: boolean
          is_magical: boolean
          is_ration_package: boolean
          item_type: string
          name: string
          rarity: string
          shop_id: string
          sort_order: number
          target_fap: number
        }
        Insert: {
          base_price_gp?: number
          created_at?: string
          description?: string | null
          id?: string
          is_legal?: boolean
          is_magical?: boolean
          is_ration_package?: boolean
          item_type?: string
          name: string
          rarity?: string
          shop_id: string
          sort_order?: number
          target_fap?: number
        }
        Update: {
          base_price_gp?: number
          created_at?: string
          description?: string | null
          id?: string
          is_legal?: boolean
          is_magical?: boolean
          is_ration_package?: boolean
          item_type?: string
          name?: string
          rarity?: string
          shop_id?: string
          sort_order?: number
          target_fap?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_shop_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "campaign_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_shops: {
        Row: {
          archetype_key: string | null
          campaign_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          price_modifier_percent: number
          shop_mode: string
          updated_at: string
        }
        Insert: {
          archetype_key?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          price_modifier_percent?: number
          shop_mode: string
          updated_at?: string
        }
        Update: {
          archetype_key?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          price_modifier_percent?: number
          shop_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_shops_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_visibility: {
        Row: {
          campaign_id: string | null
          entity_id: string
          entity_type: string
          id: string
          is_revealed: boolean | null
          revealed_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_revealed?: boolean | null
          revealed_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_revealed?: boolean | null
          revealed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_visibility_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          frequency: string | null
          gm_id: string
          house_rules: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          looking_for: string | null
          max_players: number | null
          mode: string | null
          name: string
          owner_id: string | null
          schedule_day: number | null
          schedule_duration_hours: number | null
          schedule_interval: string | null
          schedule_time: string | null
          status: string | null
          system: string
          world_id: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          gm_id: string
          house_rules?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          looking_for?: string | null
          max_players?: number | null
          mode?: string | null
          name: string
          owner_id?: string | null
          schedule_day?: number | null
          schedule_duration_hours?: number | null
          schedule_interval?: string | null
          schedule_time?: string | null
          status?: string | null
          system: string
          world_id: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          gm_id?: string
          house_rules?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          looking_for?: string | null
          max_players?: number | null
          mode?: string | null
          name?: string
          owner_id?: string | null
          schedule_day?: number | null
          schedule_duration_hours?: number | null
          schedule_interval?: string | null
          schedule_time?: string | null
          status?: string | null
          system?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      character_faction_reputation: {
        Row: {
          character_id: string
          created_at: string
          faction_id: string
          gm_notes: string | null
          id: string
          rank: string | null
          reputation: number
          updated_at: string
        }
        Insert: {
          character_id: string
          created_at?: string
          faction_id: string
          gm_notes?: string | null
          id?: string
          rank?: string | null
          reputation?: number
          updated_at?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          faction_id?: string
          gm_notes?: string | null
          id?: string
          rank?: string | null
          reputation?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_faction_reputation_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_faction_reputation_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      character_relationships: {
        Row: {
          character_id: string
          created_at: string
          description: string | null
          id: string
          npc_id: string
          relationship_type: string
        }
        Insert: {
          character_id: string
          created_at?: string
          description?: string | null
          id?: string
          npc_id: string
          relationship_type: string
        }
        Update: {
          character_id?: string
          created_at?: string
          description?: string | null
          id?: string
          npc_id?: string
          relationship_type?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          age: number | null
          avatar_storage_path: string | null
          avatar_url: string | null
          backstory_summary: string | null
          biography: string | null
          campaign_id: string
          class: string | null
          created_at: string | null
          culture_lore_id: string | null
          current_location_id: string | null
          faction_membership: string | null
          fears: string | null
          goals: string | null
          id: string
          languages: string[] | null
          level: number | null
          name: string
          personality_adjectives: string[] | null
          physical_traits: string | null
          profession: string | null
          race: string | null
          rations_count: number
          sleep_debt_fap: number
          starvation_days: number
          status: string | null
          user_id: string | null
        }
        Insert: {
          age?: number | null
          avatar_storage_path?: string | null
          avatar_url?: string | null
          backstory_summary?: string | null
          biography?: string | null
          campaign_id: string
          class?: string | null
          created_at?: string | null
          culture_lore_id?: string | null
          current_location_id?: string | null
          faction_membership?: string | null
          fears?: string | null
          goals?: string | null
          id?: string
          languages?: string[] | null
          level?: number | null
          name: string
          personality_adjectives?: string[] | null
          physical_traits?: string | null
          profession?: string | null
          race?: string | null
          rations_count?: number
          sleep_debt_fap?: number
          starvation_days?: number
          status?: string | null
          user_id?: string | null
        }
        Update: {
          age?: number | null
          avatar_storage_path?: string | null
          avatar_url?: string | null
          backstory_summary?: string | null
          biography?: string | null
          campaign_id?: string
          class?: string | null
          created_at?: string | null
          culture_lore_id?: string | null
          current_location_id?: string | null
          faction_membership?: string | null
          fears?: string | null
          goals?: string | null
          id?: string
          languages?: string[] | null
          level?: number | null
          name?: string
          personality_adjectives?: string[] | null
          physical_traits?: string | null
          profession?: string | null
          race?: string | null
          rations_count?: number
          sleep_debt_fap?: number
          starvation_days?: number
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      character_items: {
        Row: {
          category: string
          character_id: string
          created_at: string
          current_fap: number
          description: string | null
          icon_type: string | null
          id: string
          is_deleted: boolean
          name: string
          target_fap: number
          updated_at: string
        }
        Insert: {
          category?: string
          character_id: string
          created_at?: string
          current_fap?: number
          description?: string | null
          icon_type?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          target_fap?: number
          updated_at?: string
        }
        Update: {
          category?: string
          character_id?: string
          created_at?: string
          current_fap?: number
          description?: string | null
          icon_type?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          target_fap?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_items_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      deities: {
        Row: {
          created_at: string
          dark_side: string | null
          domain: string | null
          epithet: string | null
          id: string
          name: string
          symbol_description: string | null
          symbol_image_url: string | null
          updated_at: string
          world_id: string
        }
        Insert: {
          created_at?: string
          dark_side?: string | null
          domain?: string | null
          epithet?: string | null
          id?: string
          name: string
          symbol_description?: string | null
          symbol_image_url?: string | null
          updated_at?: string
          world_id: string
        }
        Update: {
          created_at?: string
          dark_side?: string | null
          domain?: string | null
          epithet?: string | null
          id?: string
          name?: string
          symbol_description?: string | null
          symbol_image_url?: string | null
          updated_at?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deities_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      deity_relationships: {
        Row: {
          created_at: string
          id: string
          relation_type: string
          source_deity_id: string
          target_deity_id: string
          updated_at: string
          world_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relation_type: string
          source_deity_id: string
          target_deity_id: string
          updated_at?: string
          world_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relation_type?: string
          source_deity_id?: string
          target_deity_id?: string
          updated_at?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deity_relationships_source_deity_id_fkey"
            columns: ["source_deity_id"]
            isOneToOne: false
            referencedRelation: "deities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deity_relationships_target_deity_id_fkey"
            columns: ["target_deity_id"]
            isOneToOne: false
            referencedRelation: "deities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deity_relationships_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      downtime_actions: {
        Row: {
          activity_name: string | null
          campaign_id: number | null
          category: Database["public"]["Enums"]["downtime_category"] | null
          character_id: number | null
          created_at: string | null
          description: string | null
          fap_cost: number | null
          gm_response: string | null
          id: number
          reward_items: Json | null
          session_ref_id: number | null
          status: string | null
          virtual_day_index: number | null
        }
        Insert: {
          activity_name?: string | null
          campaign_id?: number | null
          category?: Database["public"]["Enums"]["downtime_category"] | null
          character_id?: number | null
          created_at?: string | null
          description?: string | null
          fap_cost?: number | null
          gm_response?: string | null
          id?: number
          reward_items?: Json | null
          session_ref_id?: number | null
          status?: string | null
          virtual_day_index?: number | null
        }
        Update: {
          activity_name?: string | null
          campaign_id?: number | null
          category?: Database["public"]["Enums"]["downtime_category"] | null
          character_id?: number | null
          created_at?: string | null
          description?: string | null
          fap_cost?: number | null
          gm_response?: string | null
          id?: number
          reward_items?: Json | null
          session_ref_id?: number | null
          status?: string | null
          virtual_day_index?: number | null
        }
        Relationships: []
      }
      faction_relations: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          faction_id_1: string
          faction_id_2: string
          id: string
          relation_type: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          faction_id_1: string
          faction_id_2: string
          id?: string
          relation_type: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          faction_id_1?: string
          faction_id_2?: string
          id?: string
          relation_type?: string
        }
        Relationships: []
      }
      factions: {
        Row: {
          alignment: string | null
          allow_pc_join_on_creation: boolean | null
          appearance: string | null
          banner_url: string | null
          created_at: string | null
          current_status: string | null
          description: string | null
          gm_notes: string | null
          goals: string | null
          hq_location_id: string | null
          id: string
          image_display: Json | null
          image_url: string | null
          important_npcs_info: string | null
          is_revealed: boolean | null
          location_id: string | null
          lore_id: string | null
          name: string
          philosophy: string | null
          planned_members: Json | null
          structure: string | null
          type: string | null
          world_id: string
        }
        Insert: {
          alignment?: string | null
          allow_pc_join_on_creation?: boolean | null
          appearance?: string | null
          banner_url?: string | null
          created_at?: string | null
          current_status?: string | null
          description?: string | null
          gm_notes?: string | null
          goals?: string | null
          hq_location_id?: string | null
          id?: string
          image_display?: Json | null
          image_url?: string | null
          important_npcs_info?: string | null
          is_revealed?: boolean | null
          location_id?: string | null
          lore_id?: string | null
          name: string
          philosophy?: string | null
          planned_members?: Json | null
          structure?: string | null
          type?: string | null
          world_id: string
        }
        Update: {
          alignment?: string | null
          allow_pc_join_on_creation?: boolean | null
          appearance?: string | null
          banner_url?: string | null
          created_at?: string | null
          current_status?: string | null
          description?: string | null
          gm_notes?: string | null
          goals?: string | null
          hq_location_id?: string | null
          id?: string
          image_display?: Json | null
          image_url?: string | null
          important_npcs_info?: string | null
          is_revealed?: boolean | null
          location_id?: string | null
          lore_id?: string | null
          name?: string
          philosophy?: string | null
          planned_members?: Json | null
          structure?: string | null
          type?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factions_hq_location_id_fkey"
            columns: ["hq_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factions_lore_id_fkey"
            columns: ["lore_id"]
            isOneToOne: false
            referencedRelation: "world_lore"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factions_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      guestbook: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      handouts: {
        Row: {
          assigned_to_char_id: number | null
          campaign_id: number | null
          content_url: string | null
          id: number
          is_visible_to_all: boolean | null
          text_content: string | null
          title: string | null
          type: Database["public"]["Enums"]["handout_type"] | null
        }
        Insert: {
          assigned_to_char_id?: number | null
          campaign_id?: number | null
          content_url?: string | null
          id?: number
          is_visible_to_all?: boolean | null
          text_content?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["handout_type"] | null
        }
        Update: {
          assigned_to_char_id?: number | null
          campaign_id?: number | null
          content_url?: string | null
          id?: number
          is_visible_to_all?: boolean | null
          text_content?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["handout_type"] | null
        }
        Relationships: []
      }
      items: {
        Row: {
          campaign_id: number | null
          cost_value: number | null
          description: string | null
          gm_notes: string | null
          id: number
          is_identified: boolean | null
          is_in_party_stash: boolean | null
          is_magical: boolean | null
          is_study_completed: boolean | null
          location_id: string | null
          name: string | null
          owner_char_id: number | null
          quantity: number | null
          rarity: Database["public"]["Enums"]["item_rarity"] | null
          requirements: string | null
          shop_id: number | null
          stats: Json | null
          study_cost_fap: number | null
          study_progress_fap: number | null
          study_reward_text: string | null
          type: Database["public"]["Enums"]["item_type"] | null
          weight: number | null
        }
        Insert: {
          campaign_id?: number | null
          cost_value?: number | null
          description?: string | null
          gm_notes?: string | null
          id?: number
          is_identified?: boolean | null
          is_in_party_stash?: boolean | null
          is_magical?: boolean | null
          is_study_completed?: boolean | null
          location_id?: string | null
          name?: string | null
          owner_char_id?: number | null
          quantity?: number | null
          rarity?: Database["public"]["Enums"]["item_rarity"] | null
          requirements?: string | null
          shop_id?: number | null
          stats?: Json | null
          study_cost_fap?: number | null
          study_progress_fap?: number | null
          study_reward_text?: string | null
          type?: Database["public"]["Enums"]["item_type"] | null
          weight?: number | null
        }
        Update: {
          campaign_id?: number | null
          cost_value?: number | null
          description?: string | null
          gm_notes?: string | null
          id?: number
          is_identified?: boolean | null
          is_in_party_stash?: boolean | null
          is_magical?: boolean | null
          is_study_completed?: boolean | null
          location_id?: string | null
          name?: string | null
          owner_char_id?: number | null
          quantity?: number | null
          rarity?: Database["public"]["Enums"]["item_rarity"] | null
          requirements?: string | null
          shop_id?: number | null
          stats?: Json | null
          study_cost_fap?: number | null
          study_progress_fap?: number | null
          study_reward_text?: string | null
          type?: Database["public"]["Enums"]["item_type"] | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          author_user_id: string | null
          campaign_id: number | null
          content: string | null
          created_at: string | null
          id: number
          related_char_id: number | null
          related_handout_id: number | null
          related_session_id: number | null
          title: string | null
          type: Database["public"]["Enums"]["journal_type"] | null
          visibility: Database["public"]["Enums"]["journal_visibility"] | null
        }
        Insert: {
          author_user_id?: string | null
          campaign_id?: number | null
          content?: string | null
          created_at?: string | null
          id?: number
          related_char_id?: number | null
          related_handout_id?: number | null
          related_session_id?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["journal_type"] | null
          visibility?: Database["public"]["Enums"]["journal_visibility"] | null
        }
        Update: {
          author_user_id?: string | null
          campaign_id?: number | null
          content?: string | null
          created_at?: string | null
          id?: number
          related_char_id?: number | null
          related_handout_id?: number | null
          related_session_id?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["journal_type"] | null
          visibility?: Database["public"]["Enums"]["journal_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "journals_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_related_handout_id_fkey"
            columns: ["related_handout_id"]
            isOneToOne: false
            referencedRelation: "handouts"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          additional_images: Json | null
          allow_pc_origin: boolean | null
          created_at: string | null
          description: string | null
          gm_notes: string | null
          id: string
          image_url: string | null
          name: string
          parent_location_id: string | null
          type: string | null
          world_id: string
        }
        Insert: {
          additional_images?: Json | null
          allow_pc_origin?: boolean | null
          created_at?: string | null
          description?: string | null
          gm_notes?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_location_id?: string | null
          type?: string | null
          world_id: string
        }
        Update: {
          additional_images?: Json | null
          allow_pc_origin?: boolean | null
          created_at?: string | null
          description?: string | null
          gm_notes?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_location_id?: string | null
          type?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      lore_favorites: {
        Row: {
          created_at: string
          lore_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lore_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          lore_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lore_favorites_lore_id_fkey"
            columns: ["lore_id"]
            isOneToOne: false
            referencedRelation: "world_lore"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lore_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          campaign_id: number | null
          created_at: string | null
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          campaign_id?: number | null
          created_at?: string | null
          id?: number
          image_url?: string | null
          name: string
        }
        Update: {
          campaign_id?: number | null
          created_at?: string | null
          id?: number
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          batch_id: string | null
          campaign_id: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          priority: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          subject: string
          type: string | null
        }
        Insert: {
          batch_id?: string | null
          campaign_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          subject: string
          type?: string | null
        }
        Update: {
          batch_id?: string | null
          campaign_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          subject?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          show_on_dashboard: boolean | null
          show_on_landingpage: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          show_on_dashboard?: boolean | null
          show_on_landingpage?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          show_on_dashboard?: boolean | null
          show_on_landingpage?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_favorites: {
        Row: {
          created_at: string | null
          npc_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          npc_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          npc_id?: string
          user_id?: string
        }
        Relationships: []
      }
      npc_relations: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          id: string
          npc_id_1: string
          npc_id_2: string | null
          relation_type: string
          target_name: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          id?: string
          npc_id_1: string
          npc_id_2?: string | null
          relation_type: string
          target_name?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          id?: string
          npc_id_1?: string
          npc_id_2?: string | null
          relation_type?: string
          target_name?: string | null
        }
        Relationships: []
      }
      npc_secrets: {
        Row: {
          campaign_id: string
          content: string
          created_at: string | null
          discovered_at: string | null
          discovery_dc: number | null
          discovery_type: string
          id: string
          is_ai_generated: boolean | null
          is_discovered: boolean | null
          is_revealed: boolean | null
          lore_id: string | null
          meaning: string | null
          npc_id: string | null
          secret_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string | null
          discovered_at?: string | null
          discovery_dc?: number | null
          discovery_type?: string
          id?: string
          is_ai_generated?: boolean | null
          is_discovered?: boolean | null
          is_revealed?: boolean | null
          lore_id?: string | null
          meaning?: string | null
          npc_id?: string | null
          secret_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string | null
          discovered_at?: string | null
          discovery_dc?: number | null
          discovery_type?: string
          id?: string
          is_ai_generated?: boolean | null
          is_discovered?: boolean | null
          is_revealed?: boolean | null
          lore_id?: string | null
          meaning?: string | null
          npc_id?: string | null
          secret_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      npc_suggestions: {
        Row: {
          campaign_id: string
          character_id: string
          created_at: string | null
          decided_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          relationship_type: string
          status: string
          suggested_by: string
          world_id: string
        }
        Insert: {
          campaign_id: string
          character_id: string
          created_at?: string | null
          decided_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          relationship_type: string
          status?: string
          suggested_by: string
          world_id: string
        }
        Update: {
          campaign_id?: string
          character_id?: string
          created_at?: string | null
          decided_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          relationship_type?: string
          status?: string
          suggested_by?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "npc_suggestions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_suggestions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_suggestions_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      npcs: {
        Row: {
          alignment: string | null
          allow_pc_onboarding: boolean | null
          appearance: string | null
          backstory: string | null
          check_results: Json | null
          created_at: string | null
          current_location_id: string | null
          deities: string[] | null
          description: string | null
          faction_id: string | null
          gm_notes: string | null
          hidden_agenda: string | null
          home_location_id: string | null
          id: string
          image_display: Json | null
          image_url: string | null
          is_dead: boolean | null
          is_merchant: boolean
          is_secret_antagonist: boolean | null
          languages: string[] | null
          name: string
          narrative_hooks: Json | null
          personality_traits: string | null
          race: string | null
          religions: string[] | null
          role: string | null
          shop_id: string | null
          status: string | null
          title: string | null
          true_nature: string | null
          world_id: string
          world_relations: Json | null
        }
        Insert: {
          alignment?: string | null
          allow_pc_onboarding?: boolean | null
          appearance?: string | null
          backstory?: string | null
          check_results?: Json | null
          created_at?: string | null
          current_location_id?: string | null
          deities?: string[] | null
          description?: string | null
          faction_id?: string | null
          gm_notes?: string | null
          hidden_agenda?: string | null
          home_location_id?: string | null
          id?: string
          image_display?: Json | null
          image_url?: string | null
          is_dead?: boolean | null
          is_merchant?: boolean
          is_secret_antagonist?: boolean | null
          languages?: string[] | null
          name: string
          narrative_hooks?: Json | null
          personality_traits?: string | null
          race?: string | null
          religions?: string[] | null
          role?: string | null
          shop_id?: string | null
          status?: string | null
          title?: string | null
          true_nature?: string | null
          world_id: string
          world_relations?: Json | null
        }
        Update: {
          alignment?: string | null
          allow_pc_onboarding?: boolean | null
          appearance?: string | null
          backstory?: string | null
          check_results?: Json | null
          created_at?: string | null
          current_location_id?: string | null
          deities?: string[] | null
          description?: string | null
          faction_id?: string | null
          gm_notes?: string | null
          hidden_agenda?: string | null
          home_location_id?: string | null
          id?: string
          image_display?: Json | null
          image_url?: string | null
          is_dead?: boolean | null
          is_merchant?: boolean
          is_secret_antagonist?: boolean | null
          languages?: string[] | null
          name?: string
          narrative_hooks?: Json | null
          personality_traits?: string | null
          race?: string | null
          religions?: string[] | null
          role?: string | null
          shop_id?: string | null
          status?: string | null
          title?: string | null
          true_nature?: string | null
          world_id?: string
          world_relations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "npcs_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npcs_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npcs_home_location_id_fkey"
            columns: ["home_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npcs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "campaign_shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npcs_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      party_wallet: {
        Row: {
          campaign_id: number
          currency_main: number | null
          currency_sub: number | null
        }
        Insert: {
          campaign_id: number
          currency_main?: number | null
          currency_sub?: number | null
        }
        Update: {
          campaign_id?: number
          currency_main?: number | null
          currency_sub?: number | null
        }
        Relationships: []
      }
      player_npc_requests: {
        Row: {
          campaign_id: string | null
          character_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          player_id: string | null
          relationship_type: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          character_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          player_id?: string | null
          relationship_type?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          character_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          player_id?: string | null
          relationship_type?: string | null
          status?: string | null
        }
        Relationships: []
      }
      point_ledger: {
        Row: {
          amount: number | null
          campaign_id: number | null
          created_at: string | null
          id: number
          reason: string | null
          user_id: number | null
        }
        Insert: {
          amount?: number | null
          campaign_id?: number | null
          created_at?: string | null
          id?: number
          reason?: string | null
          user_id?: number | null
        }
        Update: {
          amount?: number | null
          campaign_id?: number | null
          created_at?: string | null
          id?: number
          reason?: string | null
          user_id?: number | null
        }
        Relationships: []
      }
      points_catalog: {
        Row: {
          achievement_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          points_cost: number
          type: string
        }
        Insert: {
          achievement_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          points_cost: number
          type?: string
        }
        Update: {
          achievement_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          points_cost?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_catalog_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      points_log: {
        Row: {
          amount: number
          campaign_id: string | null
          catalog_item_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          catalog_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          catalog_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_log_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "points_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          username?: string | null
        }
        Relationships: []
      }
      quest_participants: {
        Row: {
          created_at: string
          id: string
          npc_id: string
          quest_id: string
          role_description: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          npc_id: string
          quest_id: string
          role_description?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          npc_id?: string
          quest_id?: string
          role_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_participants_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          assigned_character_id: string | null
          campaign_id: string
          competing_quest_id: string | null
          created_at: string | null
          description: string | null
          faction_id: string | null
          failure_description: string | null
          gm_notes: string | null
          id: string
          is_revealed: boolean | null
          location_id: string | null
          objectives: Json | null
          parent_quest_id: string | null
          quest_giver_id: string | null
          rewards: string | null
          status: string | null
          title: string
          type: string | null
        }
        Insert: {
          assigned_character_id?: string | null
          campaign_id: string
          competing_quest_id?: string | null
          created_at?: string | null
          description?: string | null
          faction_id?: string | null
          failure_description?: string | null
          gm_notes?: string | null
          id?: string
          is_revealed?: boolean | null
          location_id?: string | null
          objectives?: Json | null
          parent_quest_id?: string | null
          quest_giver_id?: string | null
          rewards?: string | null
          status?: string | null
          title: string
          type?: string | null
        }
        Update: {
          assigned_character_id?: string | null
          campaign_id?: string
          competing_quest_id?: string | null
          created_at?: string | null
          description?: string | null
          faction_id?: string | null
          failure_description?: string | null
          gm_notes?: string | null
          id?: string
          is_revealed?: boolean | null
          location_id?: string | null
          objectives?: Json | null
          parent_quest_id?: string | null
          quest_giver_id?: string | null
          rewards?: string | null
          status?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quests_competing_quest_id_fkey"
            columns: ["competing_quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_parent_quest_id_fkey"
            columns: ["parent_quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          created_at: string
          history: Json | null
          id: string
          intensity: number
          is_public: boolean
          monologue_source: string | null
          monologue_target: string | null
          public_description: string | null
          source_id: string
          source_role: string
          target_id: string
          target_role: string
          target_type: string
          updated_at: string
          world_id: string
        }
        Insert: {
          created_at?: string
          history?: Json | null
          id?: string
          intensity?: number
          is_public?: boolean
          monologue_source?: string | null
          monologue_target?: string | null
          public_description?: string | null
          source_id: string
          source_role?: string
          target_id: string
          target_role?: string
          target_type?: string
          updated_at?: string
          world_id: string
        }
        Update: {
          created_at?: string
          history?: Json | null
          id?: string
          intensity?: number
          is_public?: boolean
          monologue_source?: string | null
          monologue_target?: string | null
          public_description?: string | null
          source_id?: string
          source_role?: string
          target_id?: string
          target_role?: string
          target_type?: string
          updated_at?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      religions: {
        Row: {
          cleric_title: string | null
          created_at: string
          deity_id: string | null
          holidays: Json | null
          id: string
          important_figures: Json | null
          interpretation: string | null
          magic_relation: string | null
          name: string
          order_notes: string | null
          paladin_title: string | null
          priest_title: string | null
          relics: string | null
          updated_at: string
          world_id: string
        }
        Insert: {
          cleric_title?: string | null
          created_at?: string
          deity_id?: string | null
          holidays?: Json | null
          id?: string
          important_figures?: Json | null
          interpretation?: string | null
          magic_relation?: string | null
          name: string
          order_notes?: string | null
          paladin_title?: string | null
          priest_title?: string | null
          relics?: string | null
          updated_at?: string
          world_id: string
        }
        Update: {
          cleric_title?: string | null
          created_at?: string
          deity_id?: string | null
          holidays?: Json | null
          id?: string
          important_figures?: Json | null
          interpretation?: string | null
          magic_relation?: string | null
          name?: string
          order_notes?: string | null
          paladin_title?: string | null
          priest_title?: string | null
          relics?: string | null
          updated_at?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "religions_deity_id_fkey"
            columns: ["deity_id"]
            isOneToOne: false
            referencedRelation: "deities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "religions_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_shop: {
        Row: {
          campaign_id: number | null
          cost: number | null
          description: string | null
          id: number
          title: string | null
        }
        Insert: {
          campaign_id?: number | null
          cost?: number | null
          description?: string | null
          id?: number
          title?: string | null
        }
        Update: {
          campaign_id?: number | null
          cost?: number | null
          description?: string | null
          id?: number
          title?: string | null
        }
        Relationships: []
      }
      scenes: {
        Row: {
          campaign_id: string
          created_at: string | null
          gm_notes: string | null
          goal_description: string | null
          id: string
          location_id: string | null
          name: string
          order_index: number | null
          session_id: string | null
          status: string | null
          weather_context: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          gm_notes?: string | null
          goal_description?: string | null
          id?: string
          location_id?: string | null
          name: string
          order_index?: number | null
          session_id?: string | null
          status?: string | null
          weather_context?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          gm_notes?: string | null
          goal_description?: string | null
          id?: string
          location_id?: string | null
          name?: string
          order_index?: number | null
          session_id?: string | null
          status?: string | null
          weather_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_holders: {
        Row: {
          character_id: string
          created_at: string | null
          secret_id: string
        }
        Insert: {
          character_id: string
          created_at?: string | null
          secret_id: string
        }
        Update: {
          character_id?: string
          created_at?: string | null
          secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_holders_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_holders_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "secrets"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets: {
        Row: {
          campaign_id: string
          content: string
          created_at: string
          discovered_at: string | null
          discovery_dc: number | null
          entity_id: string
          entity_type: string
          id: string
          is_ai_generated: boolean
          is_revealed: boolean
          lore_id: string | null
          meaning: string | null
          secret_type: string | null
          skill_check: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string
          discovered_at?: string | null
          discovery_dc?: number | null
          entity_id: string
          entity_type: string
          id?: string
          is_ai_generated?: boolean
          is_revealed?: boolean
          lore_id?: string | null
          meaning?: string | null
          secret_type?: string | null
          skill_check?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string
          discovered_at?: string | null
          discovery_dc?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_ai_generated?: boolean
          is_revealed?: boolean
          lore_id?: string | null
          meaning?: string | null
          secret_type?: string | null
          skill_check?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secrets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secrets_lore_id_fkey"
            columns: ["lore_id"]
            isOneToOne: false
            referencedRelation: "world_lore"
            referencedColumns: ["id"]
          },
        ]
      }
      session_live_states: {
        Row: {
          active_merchant_npc_id: string | null
          active_shop_id: string | null
          background_url: string | null
          current_location_id: string | null
          current_location_lore_id: string | null
          current_loot_id: string | null
          current_turn_index: number
          destroyed_fate_coins: number
          dummy_player_count: number
          downtime_active: boolean
          downtime_current_day: number
          downtime_total_days: number
          downtime_type: string
          fate_coins: Json
          fap_allocations: Json
          in_game_date: string | null
          in_game_time: string | null
          is_background_manual_override: boolean
          is_combat_mode: boolean
          journal_text: string | null
          loot_hide_npcs: boolean
          physically_present_user_ids: string[]
          scribe_id: string | null
          session_id: string
          system_logs: Json
          temperature: string
          temperature_value: number
          updated_at: string | null
          visible_faction_ids: string[]
          visible_npc_ids: string[] | null
          weather: string | null
          weather_intensity: number | null
          weather_preset: string | null
          weather_temperature: string | null
        }
        Insert: {
          active_merchant_npc_id?: string | null
          active_shop_id?: string | null
          background_url?: string | null
          current_location_id?: string | null
          current_location_lore_id?: string | null
          current_loot_id?: string | null
          current_turn_index?: number
          destroyed_fate_coins?: number
          dummy_player_count?: number
          downtime_active?: boolean
          downtime_current_day?: number
          downtime_total_days?: number
          downtime_type?: string
          fate_coins?: Json
          fap_allocations?: Json
          in_game_date?: string | null
          in_game_time?: string | null
          is_background_manual_override?: boolean
          is_combat_mode?: boolean
          journal_text?: string | null
          loot_hide_npcs?: boolean
          physically_present_user_ids?: string[]
          scribe_id?: string | null
          session_id: string
          system_logs?: Json
          temperature?: string
          temperature_value?: number
          updated_at?: string | null
          visible_faction_ids?: string[]
          visible_npc_ids?: string[] | null
          weather?: string | null
          weather_intensity?: number | null
          weather_preset?: string | null
          weather_temperature?: string | null
        }
        Update: {
          active_merchant_npc_id?: string | null
          active_shop_id?: string | null
          background_url?: string | null
          current_location_id?: string | null
          current_location_lore_id?: string | null
          current_loot_id?: string | null
          current_turn_index?: number
          destroyed_fate_coins?: number
          dummy_player_count?: number
          downtime_active?: boolean
          downtime_current_day?: number
          downtime_total_days?: number
          downtime_type?: string
          fate_coins?: Json
          fap_allocations?: Json
          in_game_date?: string | null
          in_game_time?: string | null
          is_background_manual_override?: boolean
          is_combat_mode?: boolean
          journal_text?: string | null
          loot_hide_npcs?: boolean
          physically_present_user_ids?: string[]
          scribe_id?: string | null
          session_id?: string
          system_logs?: Json
          temperature?: string
          temperature_value?: number
          updated_at?: string | null
          visible_faction_ids?: string[]
          visible_npc_ids?: string[] | null
          weather?: string | null
          weather_intensity?: number | null
          weather_preset?: string | null
          weather_temperature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_live_states_active_merchant_npc_id_fkey"
            columns: ["active_merchant_npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_live_states_active_shop_id_fkey"
            columns: ["active_shop_id"]
            isOneToOne: false
            referencedRelation: "campaign_shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_live_states_scribe_id_fkey"
            columns: ["scribe_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_live_states_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_rsvps: {
        Row: {
          created_at: string | null
          gm_confirmed: boolean | null
          id: string
          rsvp_status: string
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gm_confirmed?: boolean | null
          id?: string
          rsvp_status: string
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gm_confirmed?: boolean | null
          id?: string
          rsvp_status?: string
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_rsvps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_archives: {
        Row: {
          archived_at: string
          campaign_id: string
          chronicle_snapshot: Json
          encountered_npcs: Json
          id: string
          session_id: string | null
          session_name: string
          visited_locations: Json
        }
        Insert: {
          archived_at?: string
          campaign_id: string
          chronicle_snapshot?: Json
          encountered_npcs?: Json
          id?: string
          session_id?: string | null
          session_name: string
          visited_locations?: Json
        }
        Update: {
          archived_at?: string
          campaign_id?: string
          chronicle_snapshot?: Json
          encountered_npcs?: Json
          id?: string
          session_id?: string | null
          session_name?: string
          visited_locations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "session_archives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_archives_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          campaign_id: string
          created_at: string | null
          description: string | null
          end_time: string | null
          gm_prep_complete: boolean
          id: string
          is_live: boolean | null
          registration_closed_on_landing: boolean
          rsvp_deadline_days: number | null
          show_open_slots_on_landing: boolean
          show_session_title_on_landing: boolean
          stage_deck_faction_ids: string[] | null
          stage_deck_npc_ids: string[] | null
          start_time: string
          status: string | null
          title: string | null
          type: string | null
          visible_on_public_landing: boolean
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          gm_prep_complete?: boolean
          id?: string
          is_live?: boolean | null
          registration_closed_on_landing?: boolean
          rsvp_deadline_days?: number | null
          show_open_slots_on_landing?: boolean
          show_session_title_on_landing?: boolean
          stage_deck_faction_ids?: string[] | null
          stage_deck_npc_ids?: string[] | null
          start_time: string
          status?: string | null
          title?: string | null
          type?: string | null
          visible_on_public_landing?: boolean
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          gm_prep_complete?: boolean
          id?: string
          is_live?: boolean | null
          registration_closed_on_landing?: boolean
          rsvp_deadline_days?: number | null
          show_open_slots_on_landing?: boolean
          show_session_title_on_landing?: boolean
          stage_deck_faction_ids?: string[] | null
          stage_deck_npc_ids?: string[] | null
          start_time?: string
          status?: string | null
          title?: string | null
          type?: string | null
          visible_on_public_landing?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          campaign_id: number | null
          description: string | null
          gm_hidden_notes: string | null
          id: number
          inventory_level: string | null
          is_open: boolean | null
          location_id: string | null
          name: string | null
          npc_id: number | null
          price_multiplier: number | null
          type: string | null
        }
        Insert: {
          campaign_id?: number | null
          description?: string | null
          gm_hidden_notes?: string | null
          id?: number
          inventory_level?: string | null
          is_open?: boolean | null
          location_id?: string | null
          name?: string | null
          npc_id?: number | null
          price_multiplier?: number | null
          type?: string | null
        }
        Update: {
          campaign_id?: number | null
          description?: string | null
          gm_hidden_notes?: string | null
          id?: number
          inventory_level?: string | null
          is_open?: boolean | null
          location_id?: string | null
          name?: string | null
          npc_id?: number | null
          price_multiplier?: number | null
          type?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          campaign_id: number | null
          description: string | null
          game_date_day: number | null
          game_date_month: number | null
          game_date_year: number | null
          id: number
          is_secret: boolean | null
          linked_session_id: number | null
          title: string | null
        }
        Insert: {
          campaign_id?: number | null
          description?: string | null
          game_date_day?: number | null
          game_date_month?: number | null
          game_date_year?: number | null
          id?: number
          is_secret?: boolean | null
          linked_session_id?: number | null
          title?: string | null
        }
        Update: {
          campaign_id?: number | null
          description?: string | null
          game_date_day?: number | null
          game_date_month?: number | null
          game_date_year?: number | null
          id?: number
          is_secret?: boolean | null
          linked_session_id?: number | null
          title?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          awarded_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          awarded_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          awarded_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          chars_created: number | null
          last_login_at: string | null
          login_count: number | null
          quests_completed: number | null
          user_id: string
        }
        Insert: {
          chars_created?: number | null
          last_login_at?: string | null
          login_count?: number | null
          quests_completed?: number | null
          user_id: string
        }
        Update: {
          chars_created?: number | null
          last_login_at?: string | null
          login_count?: number | null
          quests_completed?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_position_x: number | null
          avatar_position_y: number | null
          avatar_shape: string | null
          avatar_storage_path: string | null
          avatar_url: string | null
          backer_since: string | null
          banner_position_x: number | null
          banner_position_y: number | null
          codex_agreed: boolean | null
          created_at: string | null
          custom_header_settings: Json | null
          dashboard_layout: Json | null
          display_name: string | null
          email: string | null
          experience_level: string | null
          favorite_achievements: string[] | null
          id: string
          is_backer: boolean | null
          is_super_admin: boolean | null
          last_achievement_view: string | null
          last_lore_view: string | null
          last_news_view: string | null
          lifetime_points: number
          motivation: string | null
          played_games: string | null
          player_dashboard_tutorial_dismissed: boolean
          preferences: Json | null
          previous_games: string | null
          primary_role: Database["public"]["Enums"]["user_primary_role"] | null
          privacy_public_profile: boolean | null
          profile_achievement_mode: string | null
          profile_background_url: string | null
          profile_banner_storage_path: string | null
          role: string | null
          selected_achievement_id: string | null
          show_points: boolean | null
          show_rank: boolean | null
          show_slogan: boolean | null
          slogan: string | null
          status: string | null
          tech_requirements_agreed: boolean | null
          total_points: number | null
          username: string | null
        }
        Insert: {
          avatar_position_x?: number | null
          avatar_position_y?: number | null
          avatar_shape?: string | null
          avatar_storage_path?: string | null
          avatar_url?: string | null
          backer_since?: string | null
          banner_position_x?: number | null
          banner_position_y?: number | null
          codex_agreed?: boolean | null
          created_at?: string | null
          custom_header_settings?: Json | null
          dashboard_layout?: Json | null
          display_name?: string | null
          email?: string | null
          experience_level?: string | null
          favorite_achievements?: string[] | null
          id: string
          is_backer?: boolean | null
          is_super_admin?: boolean | null
          last_achievement_view?: string | null
          last_lore_view?: string | null
          last_news_view?: string | null
          lifetime_points?: number
          motivation?: string | null
          played_games?: string | null
          player_dashboard_tutorial_dismissed?: boolean
          preferences?: Json | null
          previous_games?: string | null
          primary_role?: Database["public"]["Enums"]["user_primary_role"] | null
          privacy_public_profile?: boolean | null
          profile_achievement_mode?: string | null
          profile_background_url?: string | null
          profile_banner_storage_path?: string | null
          role?: string | null
          selected_achievement_id?: string | null
          show_points?: boolean | null
          show_rank?: boolean | null
          show_slogan?: boolean | null
          slogan?: string | null
          status?: string | null
          tech_requirements_agreed?: boolean | null
          total_points?: number | null
          username?: string | null
        }
        Update: {
          avatar_position_x?: number | null
          avatar_position_y?: number | null
          avatar_shape?: string | null
          avatar_storage_path?: string | null
          avatar_url?: string | null
          backer_since?: string | null
          banner_position_x?: number | null
          banner_position_y?: number | null
          codex_agreed?: boolean | null
          created_at?: string | null
          custom_header_settings?: Json | null
          dashboard_layout?: Json | null
          display_name?: string | null
          email?: string | null
          experience_level?: string | null
          favorite_achievements?: string[] | null
          id?: string
          is_backer?: boolean | null
          is_super_admin?: boolean | null
          last_achievement_view?: string | null
          last_lore_view?: string | null
          last_news_view?: string | null
          lifetime_points?: number
          motivation?: string | null
          played_games?: string | null
          player_dashboard_tutorial_dismissed?: boolean
          preferences?: Json | null
          previous_games?: string | null
          primary_role?: Database["public"]["Enums"]["user_primary_role"] | null
          privacy_public_profile?: boolean | null
          profile_achievement_mode?: string | null
          profile_background_url?: string | null
          profile_banner_storage_path?: string | null
          role?: string | null
          selected_achievement_id?: string | null
          show_points?: boolean | null
          show_rank?: boolean | null
          show_slogan?: boolean | null
          slogan?: string | null
          status?: string | null
          tech_requirements_agreed?: boolean | null
          total_points?: number | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_selected_achievement_id_fkey"
            columns: ["selected_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      world_lore: {
        Row: {
          additional_images: Json | null
          allow_pc_origin: boolean | null
          created_at: string | null
          culture_id: string | null
          default_image_url: string | null
          description: string | null
          gm_notes: string | null
          id: string
          image_display: Json | null
          image_url: string | null
          is_revealed: boolean | null
          language_ids: string[] | null
          name: string
          parent_id: string | null
          race_ids: string[] | null
          race_subtypes: string | null
          race_traits: string | null
          religion_ids: string[] | null
          stories_and_legends: Json | null
          type: string
          world_id: string
        }
        Insert: {
          additional_images?: Json | null
          allow_pc_origin?: boolean | null
          created_at?: string | null
          culture_id?: string | null
          default_image_url?: string | null
          description?: string | null
          gm_notes?: string | null
          id?: string
          image_display?: Json | null
          image_url?: string | null
          is_revealed?: boolean | null
          language_ids?: string[] | null
          name: string
          parent_id?: string | null
          race_ids?: string[] | null
          race_subtypes?: string | null
          race_traits?: string | null
          religion_ids?: string[] | null
          stories_and_legends?: Json | null
          type: string
          world_id: string
        }
        Update: {
          additional_images?: Json | null
          allow_pc_origin?: boolean | null
          created_at?: string | null
          culture_id?: string | null
          default_image_url?: string | null
          description?: string | null
          gm_notes?: string | null
          id?: string
          image_display?: Json | null
          image_url?: string | null
          is_revealed?: boolean | null
          language_ids?: string[] | null
          name?: string
          parent_id?: string | null
          race_ids?: string[] | null
          race_subtypes?: string | null
          race_traits?: string | null
          religion_ids?: string[] | null
          stories_and_legends?: Json | null
          type?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_lore_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "world_lore"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_lore_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      world_tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: number | null
          proposed_name: string
          source_npc_id: string | null
          status: string
          type: string
          world_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: number | null
          proposed_name: string
          source_npc_id?: string | null
          status?: string
          type: string
          world_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: number | null
          proposed_name?: string
          source_npc_id?: string | null
          status?: string
          type?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_tasks_source_npc_id_fkey"
            columns: ["source_npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_tasks_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      worlds: {
        Row: {
          blueprint: Json | null
          calendar_system: string | null
          cosmology_type: string | null
          created_at: string | null
          currency: string | null
          current_year: string | null
          description: string | null
          dominant_races: string[] | null
          genre_style: string | null
          gm_id: string
          id: string
          magic_level: string | null
          name: string
        }
        Insert: {
          blueprint?: Json | null
          calendar_system?: string | null
          cosmology_type?: string | null
          created_at?: string | null
          currency?: string | null
          current_year?: string | null
          description?: string | null
          dominant_races?: string[] | null
          genre_style?: string | null
          gm_id: string
          id?: string
          magic_level?: string | null
          name: string
        }
        Update: {
          blueprint?: Json | null
          calendar_system?: string | null
          cosmology_type?: string | null
          created_at?: string | null
          currency?: string | null
          current_year?: string | null
          description?: string | null
          dominant_races?: string[] | null
          genre_style?: string | null
          gm_id?: string
          id?: string
          magic_level?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points_safe: {
        Args: {
          award_reason: string
          awarded_by?: string
          catalog_id?: string
          points_amount: number
          related_campaign_id?: string
          target_user_id: string
        }
        Returns: number
      }
      bestarium_for_player_detail: {
        Args: { p_campaign_id: string; p_creature_id: string }
        Returns: {
          id: string
          image_url: string
          name: string
          physical_description: string
          player_knowledge: string
        }[]
      }
      bestarium_for_player_list: {
        Args: { p_campaign_id: string }
        Returns: {
          creature_type: string
          id: string
          image_url: string
          location_name: string
          name: string
          sort_order: number
        }[]
      }
      can_view_secret: { Args: { secret_uuid: string }; Returns: boolean }
      adjust_campaign_location_reputation: {
        Args: {
          p_amount: number
          p_campaign_id: string
          p_location_id: string
        }
        Returns: Database["public"]["Tables"]["campaign_location_reputation"]["Row"]
      }
      create_generated_quest_bundle: {
        Args: {
          p_campaign_id: string
          p_loc_desc: string
          p_loc_name: string
          p_npc_desc: string
          p_npc_name: string
          p_quest_desc: string
          p_quest_title: string
        }
        Returns: Json
      }
      get_my_accessible_campaign_ids: { Args: never; Returns: string[] }
      get_my_campaign_ids: { Args: never; Returns: string[] }
      get_my_campaigns: { Args: never; Returns: string[] }
      is_campaign_gm: { Args: { campaign_uuid: string }; Returns: boolean }
      is_campaign_member: { Args: { campaign_uuid: string }; Returns: boolean }
      is_gm_of_campaign: {
        Args: { target_campaign_id: string }
        Returns: boolean
      }
      th_can_manage_campaign: {
        Args: { target_campaign_id: string }
        Returns: boolean
      }
      th_can_manage_secret: {
        Args: { target_secret_id: string }
        Returns: boolean
      }
      th_can_view_secret: {
        Args: { target_secret_id: string }
        Returns: boolean
      }
      th_is_admin_user: { Args: never; Returns: boolean }
      th_is_gm_or_admin_user: { Args: never; Returns: boolean }
    }
    Enums: {
      achievement_source: "System" | "Campaign"
      achievement_trigger: "Manual" | "Auto_Login" | "Auto_Char" | "Auto_Quest"
      campaign_mode: "Online" | "InPerson" | "Hybrid"
      campaign_status: "Active" | "Paused" | "Archived"
      downtime_category: "Work" | "Recovery"
      game_system:
        | "dnd5e"
        | "cthulhu"
        | "hexxen1733"
        | "shadowrun"
        | "cyberpunk"
        | "sw_eote"
      handout_type: "Image" | "Document" | "Link"
      item_rarity:
        | "Common"
        | "Uncommon"
        | "Rare"
        | "Epic"
        | "Legendary"
        | "Unique"
      item_type:
        | "Weapon"
        | "Armor"
        | "Potion"
        | "Book"
        | "Gear"
        | "Cyberware"
        | "Artifact"
        | "Vehicle"
      journal_type: "SessionLog" | "Clue" | "CharacterNote" | "General"
      journal_visibility: "Private" | "Public" | "GM_Only"
      member_status: "Applied" | "Invited" | "Accepted" | "Banned"
      quest_type: "Tiny" | "Story"
      relation_type:
        | "Ally"
        | "Neutral"
        | "Rival"
        | "Enemy"
        | "Romance"
        | "Family"
        | "Unknown"
      session_type: "Recruitment" | "GameSession"
      user_primary_role: "Player" | "GameMaster" | "Moderator" | "Admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      achievement_source: ["System", "Campaign"],
      achievement_trigger: ["Manual", "Auto_Login", "Auto_Char", "Auto_Quest"],
      campaign_mode: ["Online", "InPerson", "Hybrid"],
      campaign_status: ["Active", "Paused", "Archived"],
      downtime_category: ["Work", "Recovery"],
      game_system: [
        "dnd5e",
        "cthulhu",
        "hexxen1733",
        "shadowrun",
        "cyberpunk",
        "sw_eote",
      ],
      handout_type: ["Image", "Document", "Link"],
      item_rarity: [
        "Common",
        "Uncommon",
        "Rare",
        "Epic",
        "Legendary",
        "Unique",
      ],
      item_type: [
        "Weapon",
        "Armor",
        "Potion",
        "Book",
        "Gear",
        "Cyberware",
        "Artifact",
        "Vehicle",
      ],
      journal_type: ["SessionLog", "Clue", "CharacterNote", "General"],
      journal_visibility: ["Private", "Public", "GM_Only"],
      member_status: ["Applied", "Invited", "Accepted", "Banned"],
      quest_type: ["Tiny", "Story"],
      relation_type: [
        "Ally",
        "Neutral",
        "Rival",
        "Enemy",
        "Romance",
        "Family",
        "Unknown",
      ],
      session_type: ["Recruitment", "GameSession"],
      user_primary_role: ["Player", "GameMaster", "Moderator", "Admin"],
    },
  },
} as const
