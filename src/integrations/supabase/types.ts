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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ab_assignments: {
        Row: {
          created_at: string
          experiment_id: string
          id: string
          session_id: string
          user_id: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          experiment_id: string
          id?: string
          session_id: string
          user_id?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          experiment_id?: string
          id?: string
          session_id?: string
          user_id?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_assignments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_events: {
        Row: {
          created_at: string
          event_type: string
          experiment_id: string
          id: string
          meta: Json | null
          session_id: string
          user_id: string | null
          value: number | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          experiment_id: string
          id?: string
          meta?: Json | null
          session_id: string
          user_id?: string | null
          value?: number | null
          variant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          experiment_id?: string
          id?: string
          meta?: Json | null
          session_id?: string
          user_id?: string | null
          value?: number | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_events_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_experiments: {
        Row: {
          brand_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ended_at: string | null
          hypothesis: string | null
          id: string
          name: string
          primary_metric: string | null
          started_at: string | null
          status: string
          target: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          name: string
          primary_metric?: string | null
          started_at?: string | null
          status?: string
          target?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          name?: string
          primary_metric?: string | null
          started_at?: string | null
          status?: string
          target?: string
          updated_at?: string
        }
        Relationships: []
      }
      ab_variants: {
        Row: {
          created_at: string
          experiment_id: string
          id: string
          is_control: boolean | null
          name: string
          palette: Json
          weight: number | null
        }
        Insert: {
          created_at?: string
          experiment_id: string
          id?: string
          is_control?: boolean | null
          name: string
          palette: Json
          weight?: number | null
        }
        Update: {
          created_at?: string
          experiment_id?: string
          id?: string
          is_control?: boolean | null
          name?: string
          palette?: Json
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          meta: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          client_message_id: string | null
          created_at: string
          id: string
          owner_id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          client_message_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          client_message_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_threads: {
        Row: {
          created_at: string
          deck_id: string | null
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deck_id?: string | null
          id?: string
          owner_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deck_id?: string | null
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_threads_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_events: {
        Row: {
          brand_id: string | null
          cost_credits: number | null
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          meta: Json | null
          model: string
          operation: string
          prompt_summary: string | null
          status: string
          surface: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          meta?: Json | null
          model: string
          operation: string
          prompt_summary?: string | null
          status: string
          surface?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          meta?: Json | null
          model?: string
          operation?: string
          prompt_summary?: string | null
          status?: string
          surface?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      approved_print_suggestions: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_by: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_print_suggestions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "print_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_print_variants: {
        Row: {
          content: Json
          context: Json
          created_at: string
          description: string | null
          division_id: string | null
          download_count: number
          duplicate_count: number
          id: string
          order_index: number
          published_at: string | null
          published_by: string | null
          source_asset_id: string | null
          status: string
          template_kind: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          context?: Json
          created_at?: string
          description?: string | null
          division_id?: string | null
          download_count?: number
          duplicate_count?: number
          id?: string
          order_index?: number
          published_at?: string | null
          published_by?: string | null
          source_asset_id?: string | null
          status?: string
          template_kind: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          context?: Json
          created_at?: string
          description?: string | null
          division_id?: string | null
          download_count?: number
          duplicate_count?: number
          id?: string
          order_index?: number
          published_at?: string | null
          published_by?: string | null
          source_asset_id?: string | null
          status?: string
          template_kind?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_print_variants_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "brand_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_print_variants_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "print_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_asset_chunks: {
        Row: {
          asset_id: string
          chunk_index: number
          content: string
          created_at: string
          division_id: string | null
          embedding: string | null
          id: string
          metadata: Json
          source_type: string
          tags: string[]
          token_count: number | null
        }
        Insert: {
          asset_id: string
          chunk_index: number
          content: string
          created_at?: string
          division_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          source_type?: string
          tags?: string[]
          token_count?: number | null
        }
        Update: {
          asset_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          division_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          source_type?: string
          tags?: string[]
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_asset_chunks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "brand_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_assets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          division_id: string | null
          entity_id: string | null
          entity_type: string | null
          extracted_text: string | null
          id: string
          kind: string
          metadata: Json
          source_filename: string | null
          source_type: string
          storage_path: string | null
          tags: string[]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          division_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          extracted_text?: string | null
          id?: string
          kind?: string
          metadata?: Json
          source_filename?: string | null
          source_type?: string
          storage_path?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          division_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          extracted_text?: string | null
          id?: string
          kind?: string
          metadata?: Json
          source_filename?: string | null
          source_type?: string
          storage_path?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      brand_intelligence: {
        Row: {
          brand_summary: string | null
          brand_voice_profile: Json | null
          competitive_advantages: Json | null
          competitive_landscape: Json | null
          created_at: string
          cultural_insights: Json | null
          entity_id: string
          entity_type: string
          growth_recommendations: Json | null
          id: string
          knowledge_entries: Json | null
          market_position: string | null
          organization_id: string | null
          target_audience: Json | null
          updated_at: string
        }
        Insert: {
          brand_summary?: string | null
          brand_voice_profile?: Json | null
          competitive_advantages?: Json | null
          competitive_landscape?: Json | null
          created_at?: string
          cultural_insights?: Json | null
          entity_id: string
          entity_type: string
          growth_recommendations?: Json | null
          id?: string
          knowledge_entries?: Json | null
          market_position?: string | null
          organization_id?: string | null
          target_audience?: Json | null
          updated_at?: string
        }
        Update: {
          brand_summary?: string | null
          brand_voice_profile?: Json | null
          competitive_advantages?: Json | null
          competitive_landscape?: Json | null
          created_at?: string
          cultural_insights?: Json | null
          entity_id?: string
          entity_type?: string
          growth_recommendations?: Json | null
          id?: string
          knowledge_entries?: Json | null
          market_position?: string | null
          organization_id?: string | null
          target_audience?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      brand_modes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tokens: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name: string
          tokens?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tokens?: Json
        }
        Relationships: []
      }
      briefs: {
        Row: {
          audience: string | null
          brand_mode_id: string | null
          created_at: string
          deadline: string | null
          divisions: string[] | null
          id: string
          industry: string | null
          inputs: Json
          known_facts: string | null
          length_target: number | null
          meeting_objective: string | null
          opportunity_type: string | null
          owner_id: string
          prospect: string | null
          risk_level: string | null
          sales_stage: string | null
          sub_company: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          brand_mode_id?: string | null
          created_at?: string
          deadline?: string | null
          divisions?: string[] | null
          id?: string
          industry?: string | null
          inputs?: Json
          known_facts?: string | null
          length_target?: number | null
          meeting_objective?: string | null
          opportunity_type?: string | null
          owner_id: string
          prospect?: string | null
          risk_level?: string | null
          sales_stage?: string | null
          sub_company?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          brand_mode_id?: string | null
          created_at?: string
          deadline?: string | null
          divisions?: string[] | null
          id?: string
          industry?: string | null
          inputs?: Json
          known_facts?: string | null
          length_target?: number | null
          meeting_objective?: string | null
          opportunity_type?: string | null
          owner_id?: string
          prospect?: string | null
          risk_level?: string | null
          sales_stage?: string | null
          sub_company?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefs_brand_mode_id_fkey"
            columns: ["brand_mode_id"]
            isOneToOne: false
            referencedRelation: "brand_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_kits: {
        Row: {
          attach_event: boolean
          brand_id: string
          copy: Json
          created_at: string
          event_facts: Json
          format_ids: string[]
          id: string
          mode: string
          name: string
          next_design: boolean
          next_track_id: string
          profile_id: string
          surface: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attach_event?: boolean
          brand_id?: string
          copy?: Json
          created_at?: string
          event_facts?: Json
          format_ids?: string[]
          id?: string
          mode?: string
          name: string
          next_design?: boolean
          next_track_id?: string
          profile_id?: string
          surface: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attach_event?: boolean
          brand_id?: string
          copy?: Json
          created_at?: string
          event_facts?: Json
          format_ids?: string[]
          id?: string
          mode?: string
          name?: string
          next_design?: boolean
          next_track_id?: string
          profile_id?: string
          surface?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_logos: {
        Row: {
          client_name: string
          created_at: string
          created_by: string | null
          dark_path: string | null
          division_id: string | null
          file_size: number | null
          id: string
          industry: string | null
          is_active: boolean
          light_path: string | null
          mime_type: string | null
          mono_path: string | null
          notes: string | null
          primary_path: string
          slug: string
          source: string | null
          source_filename: string | null
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          client_name: string
          created_at?: string
          created_by?: string | null
          dark_path?: string | null
          division_id?: string | null
          file_size?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean
          light_path?: string | null
          mime_type?: string | null
          mono_path?: string | null
          notes?: string | null
          primary_path: string
          slug: string
          source?: string | null
          source_filename?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          client_name?: string
          created_at?: string
          created_by?: string | null
          dark_path?: string | null
          division_id?: string | null
          file_size?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean
          light_path?: string | null
          mime_type?: string | null
          mono_path?: string | null
          notes?: string | null
          primary_path?: string
          slug?: string
          source?: string | null
          source_filename?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      deck_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deck_id: string
          id: string
          parent_id: string | null
          resolved: boolean
          slide_index: number | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deck_id: string
          id?: string
          parent_id?: string | null
          resolved?: boolean
          slide_index?: number | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deck_id?: string
          id?: string
          parent_id?: string | null
          resolved?: boolean
          slide_index?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_comments_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "deck_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_reviews: {
        Row: {
          created_at: string
          created_by: string
          deck_id: string
          findings: Json
          id: string
          model: string
          overall_score: number
          strengths: Json
          summary: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deck_id: string
          findings?: Json
          id?: string
          model: string
          overall_score: number
          strengths?: Json
          summary?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deck_id?: string
          findings?: Json
          id?: string
          model?: string
          overall_score?: number
          strengths?: Json
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_reviews_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_share_views: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          max_slide_reached: number | null
          session_key: string | null
          slides_viewed: number | null
          updated_at: string
          viewed_at: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          max_slide_reached?: number | null
          session_key?: string | null
          slides_viewed?: number | null
          updated_at?: string
          viewed_at?: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          max_slide_reached?: number | null
          session_key?: string | null
          slides_viewed?: number | null
          updated_at?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_share_views_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_slides: {
        Row: {
          ai_change_log: Json
          content: Json
          created_at: string
          deck_id: string
          id: string
          layout_id: string
          notes: string | null
          position: number
          section_id: string | null
          source_module_id: string | null
          updated_at: string
          variant_id: string
        }
        Insert: {
          ai_change_log?: Json
          content?: Json
          created_at?: string
          deck_id: string
          id?: string
          layout_id: string
          notes?: string | null
          position: number
          section_id?: string | null
          source_module_id?: string | null
          updated_at?: string
          variant_id: string
        }
        Update: {
          ai_change_log?: Json
          content?: Json
          created_at?: string
          deck_id?: string
          id?: string
          layout_id?: string
          notes?: string | null
          position?: number
          section_id?: string | null
          source_module_id?: string | null
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_slides_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_slides_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "layout_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_slides_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "section_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_slides_source_module_id_fkey"
            columns: ["source_module_id"]
            isOneToOne: false
            referencedRelation: "slide_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_slides_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "module_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_translations: {
        Row: {
          created_at: string
          created_by: string
          engine: string
          error: string | null
          human_review: boolean
          id: string
          job_ref: string | null
          mode: string
          progress_current: number
          progress_total: number
          source_deck_id: string
          status: string
          target_lang: string
          translated_deck_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          engine?: string
          error?: string | null
          human_review?: boolean
          id?: string
          job_ref?: string | null
          mode?: string
          progress_current?: number
          progress_total?: number
          source_deck_id: string
          status?: string
          target_lang: string
          translated_deck_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          engine?: string
          error?: string | null
          human_review?: boolean
          id?: string
          job_ref?: string | null
          mode?: string
          progress_current?: number
          progress_total?: number
          source_deck_id?: string
          status?: string
          target_lang?: string
          translated_deck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_translations_source_deck_id_fkey"
            columns: ["source_deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_translations_target_lang_fkey"
            columns: ["target_lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_translations_translated_deck_id_fkey"
            columns: ["translated_deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string | null
          deck_id: string
          id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          deck_id: string
          id?: string
          snapshot: Json
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          deck_id?: string
          id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "deck_versions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          archetype_id: string | null
          brand_mode_id: string | null
          brief_id: string | null
          context: Json
          created_at: string
          id: string
          is_template: boolean
          owner_id: string
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          share_expires_at: string | null
          share_token: string | null
          shared_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archetype_id?: string | null
          brand_mode_id?: string | null
          brief_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          is_template?: boolean
          owner_id: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          shared_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archetype_id?: string | null
          brand_mode_id?: string | null
          brief_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          is_template?: boolean
          owner_id?: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          shared_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_archetype_id_fkey"
            columns: ["archetype_id"]
            isOneToOne: false
            referencedRelation: "narrative_archetypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decks_brand_mode_id_fkey"
            columns: ["brand_mode_id"]
            isOneToOne: false
            referencedRelation: "brand_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decks_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      division_imagery: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          collection: string | null
          content_type: string | null
          created_at: string
          division_id: string
          filename: string
          id: string
          is_default_for: string[]
          kind: string
          note: string | null
          prompt: string | null
          size_bytes: number
          storage_path: string
          tags: string[]
          template_kinds: string[]
          updated_at: string
          uploaded_by: string
          variants: Json
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          collection?: string | null
          content_type?: string | null
          created_at?: string
          division_id: string
          filename: string
          id?: string
          is_default_for?: string[]
          kind?: string
          note?: string | null
          prompt?: string | null
          size_bytes?: number
          storage_path: string
          tags?: string[]
          template_kinds?: string[]
          updated_at?: string
          uploaded_by: string
          variants?: Json
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          collection?: string | null
          content_type?: string | null
          created_at?: string
          division_id?: string
          filename?: string
          id?: string
          is_default_for?: string[]
          kind?: string
          note?: string | null
          prompt?: string | null
          size_bytes?: number
          storage_path?: string
          tags?: string[]
          template_kinds?: string[]
          updated_at?: string
          uploaded_by?: string
          variants?: Json
        }
        Relationships: []
      }
      division_quotes: {
        Row: {
          author: string | null
          company: string | null
          created_at: string
          division_id: string
          id: string
          quote: string
          role: string | null
          sort_order: number
          source: string | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          company?: string | null
          created_at?: string
          division_id: string
          id?: string
          quote: string
          role?: string | null
          sort_order?: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          company?: string | null
          created_at?: string
          division_id?: string
          id?: string
          quote?: string
          role?: string | null
          sort_order?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      division_stats: {
        Row: {
          caption: string | null
          created_at: string
          division_id: string
          id: string
          label: string
          sort_order: number
          source: string | null
          unit: string | null
          updated_at: string
          value: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          division_id: string
          id?: string
          label: string
          sort_order?: number
          source?: string | null
          unit?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          division_id?: string
          id?: string
          label?: string
          sort_order?: number
          source?: string | null
          unit?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      globallink_config: {
        Row: {
          batch_size: number
          callback_url: string | null
          created_at: string
          default_source_lang: string
          enforce_glossary: boolean
          human_review_default: boolean
          id: boolean
          notes: string | null
          project_code: string | null
          request_timeout_ms: number
          submitter_override: string | null
          updated_at: string
          updated_by: string | null
          use_translation_memory: boolean
          workflow: string
        }
        Insert: {
          batch_size?: number
          callback_url?: string | null
          created_at?: string
          default_source_lang?: string
          enforce_glossary?: boolean
          human_review_default?: boolean
          id?: boolean
          notes?: string | null
          project_code?: string | null
          request_timeout_ms?: number
          submitter_override?: string | null
          updated_at?: string
          updated_by?: string | null
          use_translation_memory?: boolean
          workflow?: string
        }
        Update: {
          batch_size?: number
          callback_url?: string | null
          created_at?: string
          default_source_lang?: string
          enforce_glossary?: boolean
          human_review_default?: boolean
          id?: boolean
          notes?: string | null
          project_code?: string | null
          request_timeout_ms?: number
          submitter_override?: string | null
          updated_at?: string
          updated_by?: string | null
          use_translation_memory?: boolean
          workflow?: string
        }
        Relationships: []
      }
      globallink_share_activity: {
        Row: {
          created_at: string
          deck_id: string | null
          deck_title: string | null
          error_message: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          share_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id?: string | null
          deck_title?: string | null
          error_message?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          share_url?: string | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string | null
          deck_title?: string | null
          error_message?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          share_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      globallink_share_settings: {
        Row: {
          auto_share_on_export: boolean
          created_at: string
          default_folder: string | null
          default_link_expiry_days: number
          id: boolean
          notify_recipients: boolean
          password_protect: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_share_on_export?: boolean
          created_at?: string
          default_folder?: string | null
          default_link_expiry_days?: number
          id?: boolean
          notify_recipients?: boolean
          password_protect?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_share_on_export?: boolean
          created_at?: string
          default_folder?: string | null
          default_link_expiry_days?: number
          id?: boolean
          notify_recipients?: boolean
          password_protect?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      glossary_terms: {
        Row: {
          created_at: string
          created_by: string | null
          do_not_translate: boolean
          id: string
          notes: string | null
          scope: string
          scope_id: string | null
          term: string
          translations: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          do_not_translate?: boolean
          id?: string
          notes?: string | null
          scope?: string
          scope_id?: string | null
          term: string
          translations?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          do_not_translate?: boolean
          id?: string
          notes?: string | null
          scope?: string
          scope_id?: string | null
          term?: string
          translations?: Json
          updated_at?: string
        }
        Relationships: []
      }
      imagery_events: {
        Row: {
          brand_id: string | null
          created_at: string
          event_type: string
          id: string
          image_id: string
          memory_used: boolean | null
          meta: Json | null
          prompt: string | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          image_id: string
          memory_used?: boolean | null
          meta?: Json | null
          prompt?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          image_id?: string
          memory_used?: boolean | null
          meta?: Json | null
          prompt?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      imported_decks: {
        Row: {
          chunk_count: number
          created_at: string
          division_id: string
          embedded_at: string | null
          error: string | null
          extras: Json | null
          file_size: number
          id: string
          original_filename: string
          sections: Json
          slide_count: number
          slides: Json
          status: string
          storage_path: string
          templates: Json
          theme: Json | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          division_id: string
          embedded_at?: string | null
          error?: string | null
          extras?: Json | null
          file_size?: number
          id?: string
          original_filename: string
          sections?: Json
          slide_count?: number
          slides?: Json
          status?: string
          storage_path: string
          templates?: Json
          theme?: Json | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          chunk_count?: number
          created_at?: string
          division_id?: string
          embedded_at?: string | null
          error?: string | null
          extras?: Json | null
          file_size?: number
          id?: string
          original_filename?: string
          sections?: Json
          slide_count?: number
          slides?: Json
          status?: string
          storage_path?: string
          templates?: Json
          theme?: Json | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      knowledge_entries: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["knowledge_kind"]
          owner_division_id: string
          shared_with_division_ids: string[]
          sources: string[]
          tags: string[]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["knowledge_visibility"]
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["knowledge_kind"]
          owner_division_id: string
          shared_with_division_ids?: string[]
          sources?: string[]
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["knowledge_visibility"]
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["knowledge_kind"]
          owner_division_id?: string
          shared_with_division_ids?: string[]
          sources?: string[]
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["knowledge_visibility"]
        }
        Relationships: []
      }
      languages: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          native: string
          rtl: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id: string
          label: string
          native: string
          rtl?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          native?: string
          rtl?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      layout_frameworks: {
        Row: {
          description: string | null
          id: string
          name: string
          zones: string[]
        }
        Insert: {
          description?: string | null
          id: string
          name: string
          zones?: string[]
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          zones?: string[]
        }
        Relationships: []
      }
      library_slide_examples: {
        Row: {
          brand_mode_id: string | null
          bullets: string[]
          created_at: string
          division_id: string
          id: string
          image_paths: string[]
          imported_deck_id: string | null
          notes: string
          slide_index: number
          submitted_by: string
          title: string
        }
        Insert: {
          brand_mode_id?: string | null
          bullets?: string[]
          created_at?: string
          division_id: string
          id?: string
          image_paths?: string[]
          imported_deck_id?: string | null
          notes?: string
          slide_index?: number
          submitted_by: string
          title?: string
        }
        Update: {
          brand_mode_id?: string | null
          bullets?: string[]
          created_at?: string
          division_id?: string
          id?: string
          image_paths?: string[]
          imported_deck_id?: string | null
          notes?: string
          slide_index?: number
          submitted_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_slide_examples_imported_deck_id_fkey"
            columns: ["imported_deck_id"]
            isOneToOne: false
            referencedRelation: "imported_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      module_families: {
        Row: {
          description: string | null
          id: string
          name: string
          review_level: string
        }
        Insert: {
          description?: string | null
          id: string
          name: string
          review_level?: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          review_level?: string
        }
        Relationships: []
      }
      module_variant_sample_versions: {
        Row: {
          brand_mode_id: string
          content: Json
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          variant_id: string
        }
        Insert: {
          brand_mode_id: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          variant_id: string
        }
        Update: {
          brand_mode_id?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          variant_id?: string
        }
        Relationships: []
      }
      module_variant_samples: {
        Row: {
          brand_mode_id: string
          content: Json
          created_at: string
          id: string
          updated_at: string
          updated_by: string | null
          variant_id: string
        }
        Insert: {
          brand_mode_id?: string
          content?: Json
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          variant_id: string
        }
        Update: {
          brand_mode_id?: string
          content?: Json
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          variant_id?: string
        }
        Relationships: []
      }
      module_variants: {
        Row: {
          capacity: Json
          description: string | null
          editable_fields: string[]
          fallback_variant_id: string | null
          family_id: string
          id: string
          locked_fields: string[]
          name: string
          permitted_layout_ids: string[]
        }
        Insert: {
          capacity?: Json
          description?: string | null
          editable_fields?: string[]
          fallback_variant_id?: string | null
          family_id: string
          id: string
          locked_fields?: string[]
          name: string
          permitted_layout_ids?: string[]
        }
        Update: {
          capacity?: Json
          description?: string | null
          editable_fields?: string[]
          fallback_variant_id?: string | null
          family_id?: string
          id?: string
          locked_fields?: string[]
          name?: string
          permitted_layout_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "module_variants_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "module_families"
            referencedColumns: ["id"]
          },
        ]
      }
      narrative_archetypes: {
        Row: {
          description: string | null
          id: string
          name: string
          section_recipe: string[]
        }
        Insert: {
          description?: string | null
          id: string
          name: string
          section_recipe?: string[]
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          section_recipe?: string[]
        }
        Relationships: []
      }
      oracle_intelligence: {
        Row: {
          bias_awareness_insights: Json | null
          competitive_overview: Json | null
          confidence_scores: Json | null
          created_at: string
          cross_entity_patterns: Json | null
          cultural_readiness: Json | null
          entity_brain_count: number | null
          id: string
          knowledge_entry_count: number | null
          last_synthesis_at: string | null
          longitudinal_trends: Json | null
          market_landscape: Json | null
          org_summary: string | null
          organization_id: string | null
          portfolio_analysis: Json | null
          strategic_recommendations: Json | null
          synthesis_count: number | null
          synthesis_history: Json | null
          unified_audience_map: Json | null
          unified_voice_profile: Json | null
          updated_at: string
        }
        Insert: {
          bias_awareness_insights?: Json | null
          competitive_overview?: Json | null
          confidence_scores?: Json | null
          created_at?: string
          cross_entity_patterns?: Json | null
          cultural_readiness?: Json | null
          entity_brain_count?: number | null
          id?: string
          knowledge_entry_count?: number | null
          last_synthesis_at?: string | null
          longitudinal_trends?: Json | null
          market_landscape?: Json | null
          org_summary?: string | null
          organization_id?: string | null
          portfolio_analysis?: Json | null
          strategic_recommendations?: Json | null
          synthesis_count?: number | null
          synthesis_history?: Json | null
          unified_audience_map?: Json | null
          unified_voice_profile?: Json | null
          updated_at?: string
        }
        Update: {
          bias_awareness_insights?: Json | null
          competitive_overview?: Json | null
          confidence_scores?: Json | null
          created_at?: string
          cross_entity_patterns?: Json | null
          cultural_readiness?: Json | null
          entity_brain_count?: number | null
          id?: string
          knowledge_entry_count?: number | null
          last_synthesis_at?: string | null
          longitudinal_trends?: Json | null
          market_landscape?: Json | null
          org_summary?: string | null
          organization_id?: string | null
          portfolio_analysis?: Json | null
          strategic_recommendations?: Json | null
          synthesis_count?: number | null
          synthesis_history?: Json | null
          unified_audience_map?: Json | null
          unified_voice_profile?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      oracle_knowledge_base: {
        Row: {
          category: string | null
          content: string
          content_type: string
          created_at: string
          created_by: string | null
          embedding_hash: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          organization_id: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          source_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          embedding_hash?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          organization_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          embedding_hash?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          organization_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pdf_extractions: {
        Row: {
          category: string | null
          char_count: number
          chunk_count: number
          content_hash: string | null
          created_at: string
          description: string | null
          embedded_at: string | null
          entity_name: string | null
          entity_slug: string
          entity_type: string
          error: string | null
          extracted_at: string | null
          extracted_text: string | null
          id: string
          section: string | null
          source: string | null
          source_url: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          char_count?: number
          chunk_count?: number
          content_hash?: string | null
          created_at?: string
          description?: string | null
          embedded_at?: string | null
          entity_name?: string | null
          entity_slug: string
          entity_type: string
          error?: string | null
          extracted_at?: string | null
          extracted_text?: string | null
          id?: string
          section?: string | null
          source?: string | null
          source_url: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          char_count?: number
          chunk_count?: number
          content_hash?: string | null
          created_at?: string
          description?: string | null
          embedded_at?: string | null
          entity_name?: string | null
          entity_slug?: string
          entity_type?: string
          error?: string | null
          extracted_at?: string | null
          extracted_text?: string | null
          id?: string
          section?: string | null
          source?: string | null
          source_url?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      print_assets: {
        Row: {
          brand_mode_id: string | null
          brief_id: string | null
          content: Json
          context: Json
          created_at: string
          id: string
          kind: string
          owner_id: string
          share_expires_at: string | null
          share_token: string | null
          shared_at: string | null
          source_deck_id: string | null
          source_module_ids: string[]
          source_slide_ids: string[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brand_mode_id?: string | null
          brief_id?: string | null
          content?: Json
          context?: Json
          created_at?: string
          id?: string
          kind?: string
          owner_id: string
          share_expires_at?: string | null
          share_token?: string | null
          shared_at?: string | null
          source_deck_id?: string | null
          source_module_ids?: string[]
          source_slide_ids?: string[]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brand_mode_id?: string | null
          brief_id?: string | null
          content?: Json
          context?: Json
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          share_expires_at?: string | null
          share_token?: string | null
          shared_at?: string | null
          source_deck_id?: string | null
          source_module_ids?: string[]
          source_slide_ids?: string[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_assets_brand_mode_id_fkey"
            columns: ["brand_mode_id"]
            isOneToOne: false
            referencedRelation: "brand_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_assets_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_assets_source_deck_id_fkey"
            columns: ["source_deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_modules: {
        Row: {
          backdrop: Json | null
          brand_mode: string | null
          content: Json
          created_at: string
          description: string | null
          division_id: string | null
          id: string
          owner_id: string
          role: string | null
          save_kind: Database["public"]["Enums"]["module_save_kind"]
          source_deck_id: string | null
          source_slide_id: string | null
          sub_company: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          backdrop?: Json | null
          brand_mode?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          division_id?: string | null
          id?: string
          owner_id: string
          role?: string | null
          save_kind?: Database["public"]["Enums"]["module_save_kind"]
          source_deck_id?: string | null
          source_slide_id?: string | null
          sub_company?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          backdrop?: Json | null
          brand_mode?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          division_id?: string | null
          id?: string
          owner_id?: string
          role?: string | null
          save_kind?: Database["public"]["Enums"]["module_save_kind"]
          source_deck_id?: string | null
          source_slide_id?: string | null
          sub_company?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: []
      }
      section_frameworks: {
        Row: {
          id: string
          name: string
          permitted_family_ids: string[]
          purpose: string | null
        }
        Insert: {
          id: string
          name: string
          permitted_family_ids?: string[]
          purpose?: string | null
        }
        Update: {
          id?: string
          name?: string
          permitted_family_ids?: string[]
          purpose?: string | null
        }
        Relationships: []
      }
      slide_modules: {
        Row: {
          approval_status: string
          approved_at: string | null
          brand_mode_id: string | null
          content: Json
          content_hash: string | null
          created_at: string
          expires_at: string | null
          id: string
          layout_id: string
          owner_id: string | null
          review_notes: string | null
          reviewer_id: string | null
          source_deck: string | null
          submitted_at: string | null
          tags: Json
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          variant_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          brand_mode_id?: string | null
          content?: Json
          content_hash?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          layout_id: string
          owner_id?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          source_deck?: string | null
          submitted_at?: string | null
          tags?: Json
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          variant_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          brand_mode_id?: string | null
          content?: Json
          content_hash?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          layout_id?: string
          owner_id?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          source_deck?: string | null
          submitted_at?: string | null
          tags?: Json
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_modules_brand_mode_id_fkey"
            columns: ["brand_mode_id"]
            isOneToOne: false
            referencedRelation: "brand_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slide_modules_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "layout_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slide_modules_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "module_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_translations: {
        Row: {
          created_at: string
          engine: string
          error: string | null
          id: string
          job_ref: string | null
          slide_id: string
          source_hash: string | null
          status: string
          target_lang: string
          translated_content: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          engine?: string
          error?: string | null
          id?: string
          job_ref?: string | null
          slide_id: string
          source_hash?: string | null
          status?: string
          target_lang: string
          translated_content?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          engine?: string
          error?: string | null
          id?: string
          job_ref?: string | null
          slide_id?: string
          source_hash?: string | null
          status?: string
          target_lang?: string
          translated_content?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_translations_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "deck_slides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slide_translations_target_lang_fkey"
            columns: ["target_lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      surface_versions: {
        Row: {
          created_at: string
          id: string
          label: string | null
          owner_id: string
          snapshot: Json
          surface_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          owner_id: string
          snapshot: Json
          surface_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          owner_id?: string
          snapshot?: Json
          surface_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "surface_versions_surface_id_fkey"
            columns: ["surface_id"]
            isOneToOne: false
            referencedRelation: "surfaces"
            referencedColumns: ["id"]
          },
        ]
      }
      surfaces: {
        Row: {
          archetype_id: string | null
          brand_mode_id: string | null
          context: Json
          created_at: string
          format: string
          id: string
          is_template: boolean
          kind: Database["public"]["Enums"]["surface_kind"]
          meta: Json
          modules: Json
          owner_id: string
          source_deck_id: string | null
          sub_company: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archetype_id?: string | null
          brand_mode_id?: string | null
          context?: Json
          created_at?: string
          format: string
          id?: string
          is_template?: boolean
          kind: Database["public"]["Enums"]["surface_kind"]
          meta?: Json
          modules?: Json
          owner_id: string
          source_deck_id?: string | null
          sub_company?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          archetype_id?: string | null
          brand_mode_id?: string | null
          context?: Json
          created_at?: string
          format?: string
          id?: string
          is_template?: boolean
          kind?: Database["public"]["Enums"]["surface_kind"]
          meta?: Json
          modules?: Json
          owner_id?: string
          source_deck_id?: string | null
          sub_company?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_access_attempts: {
        Row: {
          client_key: string
          created_at: string
          id: string
          succeeded: boolean
        }
        Insert: {
          client_key: string
          created_at?: string
          id?: string
          succeeded?: boolean
        }
        Update: {
          client_key?: string
          created_at?: string
          id?: string
          succeeded?: boolean
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          deck_id: string | null
          division_id: string | null
          duration_ms: number | null
          event_category: string
          event_type: string
          id: string
          module_family: string | null
          props: Json
          session_id: string | null
          slide_id: string | null
          surface: string | null
          user_agent: string | null
          user_id: string | null
          value: number | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          deck_id?: string | null
          division_id?: string | null
          duration_ms?: number | null
          event_category: string
          event_type: string
          id?: string
          module_family?: string | null
          props?: Json
          session_id?: string | null
          slide_id?: string | null
          surface?: string | null
          user_agent?: string | null
          user_id?: string | null
          value?: number | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          deck_id?: string | null
          division_id?: string | null
          duration_ms?: number | null
          event_category?: string
          event_type?: string
          id?: string
          module_family?: string | null
          props?: Json
          session_id?: string | null
          slide_id?: string | null
          surface?: string | null
          user_agent?: string | null
          user_id?: string | null
          value?: number | null
          variant_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_deck: { Args: { _token: string }; Returns: Json }
      get_shared_deck_locales: {
        Args: { _token: string }
        Returns: {
          ready: number
          target_lang: string
          total: number
        }[]
      }
      get_shared_deck_translations: {
        Args: { _lang: string; _token: string }
        Returns: Json
      }
      get_shared_print_asset: { Args: { _token: string }; Returns: Json }
      get_template_deck: { Args: { _deck_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_brand_chunks: {
        Args: {
          filter_division?: string
          filter_source_types?: string[]
          filter_source_weights?: Json
          match_count?: number
          query_embedding: string
        }
        Returns: {
          asset_id: string
          content: string
          division_id: string
          id: string
          similarity: number
          source_type: string
          tags: string[]
          weighted_similarity: number
        }[]
      }
      record_share_view: {
        Args: {
          _max_slide: number
          _session_key: string
          _slides_viewed: number
          _token: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "brand_reviewer"
        | "content_owner"
        | "sales"
        | "editor"
        | "viewer"
        | "brand_lead"
      knowledge_kind:
        | "fact"
        | "proof_point"
        | "case_study"
        | "policy"
        | "terminology"
        | "note"
      knowledge_visibility: "private" | "shared" | "global"
      module_save_kind: "populated" | "template"
      surface_kind: "brochure" | "onepager" | "social" | "email"
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
      app_role: [
        "admin",
        "brand_reviewer",
        "content_owner",
        "sales",
        "editor",
        "viewer",
        "brand_lead",
      ],
      knowledge_kind: [
        "fact",
        "proof_point",
        "case_study",
        "policy",
        "terminology",
        "note",
      ],
      knowledge_visibility: ["private", "shared", "global"],
      module_save_kind: ["populated", "template"],
      surface_kind: ["brochure", "onepager", "social", "email"],
    },
  },
} as const
