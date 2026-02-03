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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ad_impressions: {
        Row: {
          advertisement_id: string
          content_link_id: string
          id: string
          user_agent: string | null
          viewed_at: string | null
          visitor_ip: string | null
        }
        Insert: {
          advertisement_id: string
          content_link_id: string
          id?: string
          user_agent?: string | null
          viewed_at?: string | null
          visitor_ip?: string | null
        }
        Update: {
          advertisement_id?: string
          content_link_id?: string
          id?: string
          user_agent?: string | null
          viewed_at?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_advertisement_id_fkey"
            columns: ["advertisement_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_content_link_id_fkey"
            columns: ["content_link_id"]
            isOneToOne: false
            referencedRelation: "content_links"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements: {
        Row: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          advertiser_id: string
          click_url: string
          clicks_count: number | null
          created_at: string | null
          html_content: string | null
          id: string
          image_url: string | null
          status: Database["public"]["Enums"]["ad_status"]
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          advertiser_id: string
          click_url: string
          clicks_count?: number | null
          created_at?: string | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          advertiser_id?: string
          click_url?: string
          clicks_count?: number | null
          created_at?: string | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          company_name: string
          contact_email: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          company_name: string
          contact_email: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      airledger_chart_of_accounts: {
        Row: {
          account_category: string | null
          account_code: string
          account_name: string
          account_type: string | null
          created_at: string
          id: string
          is_active: boolean
          normal_balance: string | null
          updated_at: string
        }
        Insert: {
          account_category?: string | null
          account_code: string
          account_name: string
          account_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          normal_balance?: string | null
          updated_at?: string
        }
        Update: {
          account_category?: string | null
          account_code?: string
          account_name?: string
          account_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          normal_balance?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      airledger_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      airledger_entries: {
        Row: {
          account_code: string
          account_name: string
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "airledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "airledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      airledger_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string | null
          sender: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string | null
          sender: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "airledger_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "airledger_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      airledger_opening: {
        Row: {
          account_code: string
          account_name: string
          balance_type: string
          created_at: string
          id: string
          opening_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          balance_type: string
          created_at?: string
          id?: string
          opening_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          balance_type?: string
          created_at?: string
          id?: string
          opening_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      airledger_template_usage: {
        Row: {
          created_at: string
          id: string
          template_id: string
          transaction_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          transaction_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          transaction_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      airledger_transaction_templates: {
        Row: {
          auto_suggest: boolean | null
          category: string
          created_at: string
          description: string
          id: string
          is_recurring: boolean
          is_system_template: boolean
          keywords: string[] | null
          last_used_at: string | null
          recurring_frequency: string | null
          template_entries: Json
          template_name: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          auto_suggest?: boolean | null
          category: string
          created_at?: string
          description: string
          id?: string
          is_recurring?: boolean
          is_system_template?: boolean
          keywords?: string[] | null
          last_used_at?: string | null
          recurring_frequency?: string | null
          template_entries: Json
          template_name: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          auto_suggest?: boolean | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_recurring?: boolean
          is_system_template?: boolean
          keywords?: string[] | null
          last_used_at?: string | null
          recurring_frequency?: string | null
          template_entries?: Json
          template_name?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      airledger_transactions: {
        Row: {
          analysis_data: Json | null
          created_at: string
          description: string
          id: string
          image_metadata: Json | null
          image_url: string | null
          reference_number: string | null
          total_amount: number
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          description: string
          id?: string
          image_metadata?: Json | null
          image_url?: string | null
          reference_number?: string | null
          total_amount: number
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          description?: string
          id?: string
          image_metadata?: Json | null
          image_url?: string | null
          reference_number?: string | null
          total_amount?: number
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_clicks: {
        Row: {
          advertisement_id: string | null
          clicked_at: string | null
          content_link_id: string
          id: string
          user_agent: string | null
          visitor_ip: string | null
        }
        Insert: {
          advertisement_id?: string | null
          clicked_at?: string | null
          content_link_id: string
          id?: string
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Update: {
          advertisement_id?: string | null
          clicked_at?: string | null
          content_link_id?: string
          id?: string
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_clicks_advertisement_id_fkey"
            columns: ["advertisement_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_clicks_content_link_id_fkey"
            columns: ["content_link_id"]
            isOneToOne: false
            referencedRelation: "content_links"
            referencedColumns: ["id"]
          },
        ]
      }
      content_links: {
        Row: {
          clicks_count: number | null
          content_provider_id: string
          created_at: string | null
          description: string | null
          id: string
          original_url: string
          short_code: string
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          clicks_count?: number | null
          content_provider_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          original_url: string
          short_code: string
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          clicks_count?: number | null
          content_provider_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          original_url?: string
          short_code?: string
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_links_content_provider_id_fkey"
            columns: ["content_provider_id"]
            isOneToOne: false
            referencedRelation: "content_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      content_providers: {
        Row: {
          contact_email: string
          created_at: string | null
          id: string
          organization_name: string
          updated_at: string | null
          user_id: string
          website_domain: string
        }
        Insert: {
          contact_email: string
          created_at?: string | null
          id?: string
          organization_name: string
          updated_at?: string | null
          user_id: string
          website_domain: string
        }
        Update: {
          contact_email?: string
          created_at?: string | null
          id?: string
          organization_name?: string
          updated_at?: string | null
          user_id?: string
          website_domain?: string
        }
        Relationships: []
      }
      keep_alive: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      migraine_entries: {
        Row: {
          amount: string
          cause: string
          created_at: string
          id: string
          timestamp: string
          user_id: string
          when: string
          where: string
        }
        Insert: {
          amount: string
          cause: string
          created_at?: string
          id?: string
          timestamp?: string
          user_id: string
          when: string
          where: string
        }
        Update: {
          amount?: string
          cause?: string
          created_at?: string
          id?: string
          timestamp?: string
          user_id?: string
          when?: string
          where?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accounting_experience: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          experience_level: string | null
          favorite_activities: string[] | null
          full_name: string | null
          id: string
          industry: string | null
          is_developer: boolean | null
          location: string | null
          name: string | null
          personal_goals: string | null
          preferred_activity:
            | Database["public"]["Enums"]["activity_type"]
            | null
          public_profile: boolean | null
          show_account_numbers: boolean | null
          total_challenges_completed: number | null
          total_distance_meters: number | null
          total_tracks_created: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          accounting_experience?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          experience_level?: string | null
          favorite_activities?: string[] | null
          full_name?: string | null
          id: string
          industry?: string | null
          is_developer?: boolean | null
          location?: string | null
          name?: string | null
          personal_goals?: string | null
          preferred_activity?:
            | Database["public"]["Enums"]["activity_type"]
            | null
          public_profile?: boolean | null
          show_account_numbers?: boolean | null
          total_challenges_completed?: number | null
          total_distance_meters?: number | null
          total_tracks_created?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          accounting_experience?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          experience_level?: string | null
          favorite_activities?: string[] | null
          full_name?: string | null
          id?: string
          industry?: string | null
          is_developer?: boolean | null
          location?: string | null
          name?: string | null
          personal_goals?: string | null
          preferred_activity?:
            | Database["public"]["Enums"]["activity_type"]
            | null
          public_profile?: boolean | null
          show_account_numbers?: boolean | null
          total_challenges_completed?: number | null
          total_distance_meters?: number | null
          total_tracks_created?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      signed_diplomas: {
        Row: {
          blockchain_id: string
          content_hash: string
          created_at: string
          diploma_css: string
          diploma_html: string
          diploma_url: string | null
          diplomator_seal: string
          id: string
          institution_name: string
          issuer_id: string
          recipient_name: string
          signature: string
          updated_at: string
          verification_url: string
        }
        Insert: {
          blockchain_id: string
          content_hash: string
          created_at?: string
          diploma_css: string
          diploma_html: string
          diploma_url?: string | null
          diplomator_seal: string
          id?: string
          institution_name: string
          issuer_id: string
          recipient_name: string
          signature: string
          updated_at?: string
          verification_url: string
        }
        Update: {
          blockchain_id?: string
          content_hash?: string
          created_at?: string
          diploma_css?: string
          diploma_html?: string
          diploma_url?: string | null
          diplomator_seal?: string
          id?: string
          institution_name?: string
          issuer_id?: string
          recipient_name?: string
          signature?: string
          updated_at?: string
          verification_url?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          ai_analyses_used: number
          created_at: string
          id: string
          month_year: string
          storage_used_mb: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analyses_used?: number
          created_at?: string
          id?: string
          month_year: string
          storage_used_mb?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analyses_used?: number
          created_at?: string
          id?: string
          month_year?: string
          storage_used_mb?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_conversation_invite: {
        Args: { invite_token_param: string }
        Returns: Json
      }
      generate_short_code: { Args: never; Returns: string }
      get_random_advertisement: {
        Args: never
        Returns: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          advertiser_id: string
          click_url: string
          clicks_count: number | null
          created_at: string | null
          html_content: string | null
          id: string
          image_url: string | null
          status: Database["public"]["Enums"]["ad_status"]
          title: string
          updated_at: string | null
          views_count: number | null
        }
        SetofOptions: {
          from: "*"
          to: "advertisements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_can_access_conversation: {
        Args: { conversation_uuid: string }
        Returns: boolean
      }
      verify_counter_consistency: {
        Args: never
        Returns: {
          actual_count: number
          discrepancy: number
          record_id: string
          stored_count: number
          table_name: string
        }[]
      }
    }
    Enums: {
      activity_type: "running" | "cycling" | "walking" | "hiking"
      ad_status: "active" | "inactive" | "pending"
      ad_type: "image" | "html"
      challenge_status: "pending" | "active" | "completed" | "failed"
      track_difficulty: "easy" | "medium" | "hard" | "expert"
      transaction_type: "income" | "expense" | "transfer"
      user_type: "content_provider" | "advertiser"
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
      activity_type: ["running", "cycling", "walking", "hiking"],
      ad_status: ["active", "inactive", "pending"],
      ad_type: ["image", "html"],
      challenge_status: ["pending", "active", "completed", "failed"],
      track_difficulty: ["easy", "medium", "hard", "expert"],
      transaction_type: ["income", "expense", "transfer"],
      user_type: ["content_provider", "advertiser"],
    },
  },
} as const
