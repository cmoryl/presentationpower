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
      deck_slides: {
        Row: {
          ai_change_log: Json
          content: Json
          created_at: string
          deck_id: string
          id: string
          layout_id: string
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
      decks: {
        Row: {
          archetype_id: string | null
          brand_mode_id: string | null
          brief_id: string | null
          created_at: string
          id: string
          owner_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archetype_id?: string | null
          brand_mode_id?: string | null
          brief_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archetype_id?: string | null
          brand_mode_id?: string | null
          brief_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
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
          created_at: string
          expires_at: string | null
          id: string
          layout_id: string
          owner_id: string | null
          source_deck: string | null
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
          created_at?: string
          expires_at?: string | null
          id?: string
          layout_id: string
          owner_id?: string | null
          source_deck?: string | null
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
          created_at?: string
          expires_at?: string | null
          id?: string
          layout_id?: string
          owner_id?: string | null
          source_deck?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "brand_reviewer" | "content_owner" | "sales"
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
      app_role: ["admin", "brand_reviewer", "content_owner", "sales"],
    },
  },
} as const
