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
          match_count?: number
          query_embedding: string
        }
        Returns: {
          asset_id: string
          content: string
          division_id: string
          id: string
          similarity: number
          tags: string[]
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
    },
  },
} as const
