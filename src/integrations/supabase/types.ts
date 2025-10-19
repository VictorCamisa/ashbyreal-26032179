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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_interactions: {
        Row: {
          ai_response: string
          created_at: string
          id: string
          response_time_ms: number | null
          session_id: string | null
          user_message: string
          user_satisfied: boolean | null
        }
        Insert: {
          ai_response: string
          created_at?: string
          id?: string
          response_time_ms?: number | null
          session_id?: string | null
          user_message: string
          user_satisfied?: boolean | null
        }
        Update: {
          ai_response?: string
          created_at?: string
          id?: string
          response_time_ms?: number | null
          session_id?: string | null
          user_message?: string
          user_satisfied?: boolean | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          reason: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          reason?: string
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          reason?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          budget: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          vehicle_interest: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          budget?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          source: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          vehicle_interest?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          budget?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          vehicle_interest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number
          clicks: number
          conversions: number
          cost_per_lead: number | null
          created_at: string
          end_date: string | null
          external_id: string | null
          id: string
          impressions: number
          integration_id: string | null
          leads_generated: number | null
          name: string
          roas: number | null
          spent: number
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          budget?: number
          clicks?: number
          conversions?: number
          cost_per_lead?: number | null
          created_at?: string
          end_date?: string | null
          external_id?: string | null
          id?: string
          impressions?: number
          integration_id?: string | null
          leads_generated?: number | null
          name: string
          roas?: number | null
          spent?: number
          start_date?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          budget?: number
          clicks?: number
          conversions?: number
          cost_per_lead?: number | null
          created_at?: string
          end_date?: string | null
          external_id?: string | null
          id?: string
          impressions?: number
          integration_id?: string | null
          leads_generated?: number | null
          name?: string
          roas?: number | null
          spent?: number
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_sync: string | null
          name: string
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_sync?: string | null
          name: string
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_sync?: string | null
          name?: string
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      nps_feedback: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          feedback: string | null
          id: string
          sale_id: string
          score: number
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          feedback?: string | null
          id?: string
          sale_id: string
          score: number
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          feedback?: string | null
          id?: string
          sale_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "nps_feedback_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id: string
          name: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          cliente_email: string | null
          cliente_nome: string
          cliente_telefone: string
          created_at: string
          data_venda: string
          forma_pagamento: string
          id: string
          lead_id: string | null
          observacoes: string | null
          updated_at: string
          valor_entrada: number | null
          valor_venda: number
          vehicle_id: string
          vendedor_id: string
        }
        Insert: {
          cliente_email?: string | null
          cliente_nome: string
          cliente_telefone: string
          created_at?: string
          data_venda?: string
          forma_pagamento: string
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          updated_at?: string
          valor_entrada?: number | null
          valor_venda: number
          vehicle_id: string
          vendedor_id: string
        }
        Update: {
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string
          created_at?: string
          data_venda?: string
          forma_pagamento?: string
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          updated_at?: string
          valor_entrada?: number | null
          valor_venda?: number
          vehicle_id?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          phone: string | null
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_photos: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          size_bytes: number
          sort_order: number
          storage_path: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          size_bytes?: number
          sort_order?: number
          storage_path: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          size_bytes?: number
          sort_order?: number
          storage_path?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehicle"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          ano: number
          cambio: string
          combustivel: string
          comprador: string | null
          cor: string
          created_at: string
          data_entrada: string
          data_reserva: string | null
          data_venda: string | null
          id: string
          km: number
          marca: string
          modelo: string
          observacoes: string | null
          placa: string
          preco: number
          status: Database["public"]["Enums"]["vehicle_status"]
          telefone_comprador: string | null
          updated_at: string
          vendedor_responsavel: string | null
        }
        Insert: {
          ano: number
          cambio: string
          combustivel: string
          comprador?: string | null
          cor: string
          created_at?: string
          data_entrada?: string
          data_reserva?: string | null
          data_venda?: string | null
          id?: string
          km?: number
          marca: string
          modelo: string
          observacoes?: string | null
          placa: string
          preco: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          telefone_comprador?: string | null
          updated_at?: string
          vendedor_responsavel?: string | null
        }
        Update: {
          ano?: number
          cambio?: string
          combustivel?: string
          comprador?: string | null
          cor?: string
          created_at?: string
          data_entrada?: string
          data_reserva?: string | null
          data_venda?: string | null
          id?: string
          km?: number
          marca?: string
          modelo?: string
          observacoes?: string | null
          placa?: string
          preco?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          telefone_comprador?: string | null
          updated_at?: string
          vendedor_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_vendedor_responsavel_fkey"
            columns: ["vendedor_responsavel"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      lead_status:
        | "novo"
        | "qualificado"
        | "proposta"
        | "test_drive"
        | "fechamento"
        | "perdido"
      task_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
      vehicle_status: "disponivel" | "reservado" | "vendido"
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
      lead_status: [
        "novo",
        "qualificado",
        "proposta",
        "test_drive",
        "fechamento",
        "perdido",
      ],
      task_status: ["pendente", "em_andamento", "concluida", "cancelada"],
      vehicle_status: ["disponivel", "reservado", "vendido"],
    },
  },
} as const
