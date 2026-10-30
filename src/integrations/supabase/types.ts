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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      client_records: {
        Row: {
          address: string
          allowed_categories: string[] | null
          at_subuser: boolean | null
          client_number: string
          created_at: string
          email: string
          folder_active: boolean
          id: string
          locality: string
          name: string
          nif: string
          notes: string
          phone: string
          postal_code: string
          responsible_name: string
          ss_subuser: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string
          allowed_categories?: string[] | null
          at_subuser?: boolean | null
          client_number?: string
          created_at?: string
          email?: string
          folder_active?: boolean
          id?: string
          locality?: string
          name: string
          nif?: string
          notes?: string
          phone?: string
          postal_code?: string
          responsible_name?: string
          ss_subuser?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          allowed_categories?: string[] | null
          at_subuser?: boolean | null
          client_number?: string
          created_at?: string
          email?: string
          folder_active?: boolean
          id?: string
          locality?: string
          name?: string
          nif?: string
          notes?: string
          phone?: string
          postal_code?: string
          responsible_name?: string
          ss_subuser?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          doc_date: string | null
          id: string
          label: string
          late: boolean
          late_submitted_at: string | null
          month: number
          original_name: string
          seq: number
          size_bytes: number | null
          storage_path: string
          supplier: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          category: string
          created_at?: string
          doc_date?: string | null
          id?: string
          label: string
          late?: boolean
          late_submitted_at?: string | null
          month: number
          original_name: string
          seq: number
          size_bytes?: number | null
          storage_path: string
          supplier?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          category?: string
          created_at?: string
          doc_date?: string | null
          id?: string
          label?: string
          late?: boolean
          late_submitted_at?: string | null
          month?: number
          original_name?: string
          seq?: number
          size_bytes?: number | null
          storage_path?: string
          supplier?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      month_submissions: {
        Row: {
          company_name: string
          created_at: string
          declaration_accepted: boolean
          declaration_text: string
          document_count: number
          id: string
          month: number
          nif: string
          responsible_name: string
          submitted_at: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          company_name?: string
          created_at?: string
          declaration_accepted?: boolean
          declaration_text?: string
          document_count?: number
          id?: string
          month: number
          nif?: string
          responsible_name?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          company_name?: string
          created_at?: string
          declaration_accepted?: boolean
          declaration_text?: string
          document_count?: number
          id?: string
          month?: number
          nif?: string
          responsible_name?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          nif: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          nif: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          nif?: string
          updated_at?: string
        }
        Relationships: []
      }
      statement_conversions: {
        Row: {
          client_name: string
          created_at: string
          created_by: string
          filename: string
          id: string
          row_count: number
          rows: Json
          source_document_id: string | null
          updated_at: string
        }
        Insert: {
          client_name?: string
          created_at?: string
          created_by: string
          filename?: string
          id?: string
          row_count?: number
          rows?: Json
          source_document_id?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          created_by?: string
          filename?: string
          id?: string
          row_count?: number
          rows?: Json
          source_document_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rules_acceptances: {
        Row: {
          accepted_at: string
          id: string
          rules_text: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          rules_text: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          id?: string
          rules_text?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      unlock_requests: {
        Row: {
          admin_note: string | null
          company_name: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          declaration_accepted: boolean
          declaration_text: string
          id: string
          month: number
          nif: string
          reason: string
          responsible_name: string
          status: Database["public"]["Enums"]["unlock_status"]
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          admin_note?: string | null
          company_name?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          declaration_accepted?: boolean
          declaration_text?: string
          id?: string
          month: number
          nif: string
          reason: string
          responsible_name?: string
          status?: Database["public"]["Enums"]["unlock_status"]
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          admin_note?: string | null
          company_name?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          declaration_accepted?: boolean
          declaration_text?: string
          id?: string
          month?: number
          nif?: string
          reason?: string
          responsible_name?: string
          status?: Database["public"]["Enums"]["unlock_status"]
          updated_at?: string
          user_id?: string
          year?: number
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
      verify_reminder_token: { Args: { _token: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "cliente"
      doc_category:
        | "faturas_compras"
        | "faturas_vendas"
        | "extratos_bancarios"
        | "documentos_salarios"
        | "outros_documentos"
      unlock_status: "pendente" | "aprovado" | "rejeitado" | "fechado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "cliente"],
      doc_category: [
        "faturas_compras",
        "faturas_vendas",
        "extratos_bancarios",
        "documentos_salarios",
        "outros_documentos",
      ],
      unlock_status: ["pendente", "aprovado", "rejeitado", "fechado"],
    },
  },
} as const
