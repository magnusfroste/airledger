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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      airledger_chart_of_accounts: {
        Row: {
          account_category: string
          account_code: string
          account_name: string
          account_type: string
          created_at: string
          id: string
          is_active: boolean
          normal_balance: string
        }
        Insert: {
          account_category: string
          account_code: string
          account_name: string
          account_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          normal_balance: string
        }
        Update: {
          account_category?: string
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          normal_balance?: string
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
          credit_amount: number
          debit_amount: number
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
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
          message_type: string
          sender: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          sender: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
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
          balance_type?: string
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
          id: string
          template_id: string | null
          template_name: string
          transaction_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          template_name: string
          transaction_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          template_id?: string | null
          template_name?: string
          transaction_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "airledger_template_usage_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "airledger_transaction_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airledger_template_usage_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "airledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      airledger_transaction_templates: {
        Row: {
          auto_suggest: boolean
          category: string
          created_at: string
          description: string
          follow_up_templates: string[] | null
          id: string
          is_system_template: boolean
          keywords: string[] | null
          last_used_at: string | null
          template_entries: Json
          template_name: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          auto_suggest?: boolean
          category?: string
          created_at?: string
          description?: string
          follow_up_templates?: string[] | null
          id?: string
          is_system_template?: boolean
          keywords?: string[] | null
          last_used_at?: string | null
          template_entries?: Json
          template_name: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Update: {
          auto_suggest?: boolean
          category?: string
          created_at?: string
          description?: string
          follow_up_templates?: string[] | null
          id?: string
          is_system_template?: boolean
          keywords?: string[] | null
          last_used_at?: string | null
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
          transaction_type: string
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
          total_amount?: number
          transaction_date: string
          transaction_type?: string
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
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accounting_experience: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          industry: string | null
          is_developer: boolean | null
          show_account_numbers: boolean | null
          updated_at: string
          username: string | null
        }
        Insert: {
          accounting_experience?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          industry?: string | null
          is_developer?: boolean | null
          show_account_numbers?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          accounting_experience?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          is_developer?: boolean | null
          show_account_numbers?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          subscribed: boolean | null
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warning_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rule_name: string
          sort_order: number
          template_names: string[]
          threshold_amount: number
          threshold_direction: string
          threshold_max: number | null
          updated_at: string
          warning_message: string
          warning_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_name: string
          sort_order?: number
          template_names?: string[]
          threshold_amount?: number
          threshold_direction?: string
          threshold_max?: number | null
          updated_at?: string
          warning_message: string
          warning_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_name?: string
          sort_order?: number
          template_names?: string[]
          threshold_amount?: number
          threshold_direction?: string
          threshold_max?: number | null
          updated_at?: string
          warning_message?: string
          warning_type?: string
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
