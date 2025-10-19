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
      campanhas: {
        Row: {
          conversoes: number | null
          created_at: string | null
          data: string | null
          id: string
          mensagens_entregues: number | null
          mensagens_enviadas: number | null
          mensagens_lidas: number | null
          nome: string
          publico_alvo: number | null
          respostas: number | null
          status: string
          taxa_conversao: number | null
          taxa_resposta: number | null
        }
        Insert: {
          conversoes?: number | null
          created_at?: string | null
          data?: string | null
          id?: string
          mensagens_entregues?: number | null
          mensagens_enviadas?: number | null
          mensagens_lidas?: number | null
          nome: string
          publico_alvo?: number | null
          respostas?: number | null
          status?: string
          taxa_conversao?: number | null
          taxa_resposta?: number | null
        }
        Update: {
          conversoes?: number | null
          created_at?: string | null
          data?: string | null
          id?: string
          mensagens_entregues?: number | null
          mensagens_enviadas?: number | null
          mensagens_lidas?: number | null
          nome?: string
          publico_alvo?: number | null
          respostas?: number | null
          status?: string
          taxa_conversao?: number | null
          taxa_resposta?: number | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          avatar: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_cadastro: string | null
          email: string
          empresa: string | null
          endereco: Json | null
          id: string
          nome: string
          observacoes: string | null
          origem: string
          status: string
          telefone: string
          ticket_medio: number | null
          ultimo_contato: string | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email: string
          empresa?: string | null
          endereco?: Json | null
          id?: string
          nome: string
          observacoes?: string | null
          origem: string
          status?: string
          telefone: string
          ticket_medio?: number | null
          ultimo_contato?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email?: string
          empresa?: string | null
          endereco?: Json | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string
          status?: string
          telefone?: string
          ticket_medio?: number | null
          ultimo_contato?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      interacoes: {
        Row: {
          cliente_id: string
          created_at: string | null
          data: string | null
          descricao: string
          id: string
          responsavel: string
          tipo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data?: string | null
          descricao: string
          id?: string
          responsavel: string
          tipo: string
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data?: string | null
          descricao?: string
          id?: string
          responsavel?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          data_criacao: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string
          responsavel: string | null
          status: string
          telefone: string
          ultima_atualizacao: string | null
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string | null
          data_criacao?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem: string
          responsavel?: string | null
          status?: string
          telefone: string
          ultima_atualizacao?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string | null
          data_criacao?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string
          responsavel?: string | null
          status?: string
          telefone?: string
          ultima_atualizacao?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: []
      }
      mensagens_whatsapp: {
        Row: {
          campanha_id: string | null
          cliente_id: string | null
          created_at: string | null
          data_hora: string | null
          id: string
          mensagem: string
          nome_cliente: string
          status: string
        }
        Insert: {
          campanha_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_hora?: string | null
          id?: string
          mensagem: string
          nome_cliente: string
          status?: string
        }
        Update: {
          campanha_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_hora?: string | null
          id?: string
          mensagem?: string
          nome_cliente?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_whatsapp_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_whatsapp_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          documento: string | null
          id: string
          motivo: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          responsavel: string
          tipo: string
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          id?: string
          motivo?: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          responsavel: string
          tipo: string
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          id?: string
          motivo?: string | null
          produto_id?: string
          quantidade?: number
          quantidade_anterior?: number
          quantidade_nova?: number
          responsavel?: string
          tipo?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade?: number
          subtotal: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          subtotal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string
          created_at: string
          data_entrega: string | null
          data_pedido: string
          id: string
          numero_pedido: string
          observacoes: string | null
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_entrega?: string | null
          data_pedido?: string
          id?: string
          numero_pedido: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_entrega?: string | null
          data_pedido?: string
          id?: string
          numero_pedido?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          estoque: number
          estoque_minimo: number
          fornecedor: string | null
          id: string
          imagem_url: string | null
          localizacao: string | null
          margem_lucro: number
          nome: string
          preco: number
          preco_custo: number
          sku: string | null
          unidade_medida: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          estoque?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          margem_lucro?: number
          nome: string
          preco?: number
          preco_custo?: number
          sku?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          estoque?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          margem_lucro?: number
          nome?: string
          preco?: number
          preco_custo?: number
          sku?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string | null
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          id: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
