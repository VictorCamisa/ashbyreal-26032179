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
      accounts: {
        Row: {
          bank_name: string | null
          created_at: string
          entity_id: string | null
          id: string
          is_active: boolean
          is_default: boolean
          last4: string | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
        }
        Insert: {
          bank_name?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last4?: string | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
        }
        Update: {
          bank_name?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last4?: string | null
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      ashby_orders: {
        Row: {
          created_at: string
          due_date: string | null
          freight: number | null
          id: string
          liters: number | null
          month: number
          notes: string | null
          order_date: string
          quarter: number
          status: Database["public"]["Enums"]["ashby_status"]
          total: number
          transaction_freight_id: string | null
          transaction_principal_id: string | null
          value_com_nf: number | null
          value_sem_nf: number | null
          year: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          freight?: number | null
          id?: string
          liters?: number | null
          month: number
          notes?: string | null
          order_date: string
          quarter: number
          status?: Database["public"]["Enums"]["ashby_status"]
          total: number
          transaction_freight_id?: string | null
          transaction_principal_id?: string | null
          value_com_nf?: number | null
          value_sem_nf?: number | null
          year: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          freight?: number | null
          id?: string
          liters?: number | null
          month?: number
          notes?: string | null
          order_date?: string
          quarter?: number
          status?: Database["public"]["Enums"]["ashby_status"]
          total?: number
          transaction_freight_id?: string | null
          transaction_principal_id?: string | null
          value_com_nf?: number | null
          value_sem_nf?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ashby_orders_transaction_freight_id_fkey"
            columns: ["transaction_freight_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ashby_orders_transaction_principal_id_fkey"
            columns: ["transaction_principal_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          beneficiario: string | null
          created_at: string
          description: string | null
          due_date: string
          entity_id: string
          id: string
          image_base64: string | null
          notes: string | null
          paid_at: string | null
          status: string
          tipo_nota: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiario?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          entity_id: string
          id?: string
          image_base64?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string
          tipo_nota: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiario?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          entity_id?: string
          id?: string
          image_base64?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string
          tipo_nota?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletos_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      categories: {
        Row: {
          created_at: string
          group: Database["public"]["Enums"]["category_group"] | null
          id: string
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["category_type"]
        }
        Insert: {
          created_at?: string
          group?: Database["public"]["Enums"]["category_group"] | null
          id?: string
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["category_type"]
        }
        Update: {
          created_at?: string
          group?: Database["public"]["Enums"]["category_group"] | null
          id?: string
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["category_type"]
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      credit_card_invoices: {
        Row: {
          closing_date: string | null
          competencia: string
          created_at: string
          credit_card_id: string
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["card_invoice_status"]
          total_value: number
          transaction_pagamento_id: string | null
        }
        Insert: {
          closing_date?: string | null
          competencia: string
          created_at?: string
          credit_card_id: string
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["card_invoice_status"]
          total_value?: number
          transaction_pagamento_id?: string | null
        }
        Update: {
          closing_date?: string | null
          competencia?: string
          created_at?: string
          credit_card_id?: string
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["card_invoice_status"]
          total_value?: number
          transaction_pagamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoices_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoices_transaction_pagamento_id_fkey"
            columns: ["transaction_pagamento_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string
          description: string | null
          entity_id: string | null
          id: string
          installment_number: number
          invoice_id: string | null
          purchase_date: string
          subcategory_id: string | null
          total_installments: number
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          credit_card_id: string
          description?: string | null
          entity_id?: string | null
          id?: string
          installment_number?: number
          invoice_id?: string | null
          purchase_date: string
          subcategory_id?: string | null
          total_installments?: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          installment_number?: number
          invoice_id?: string | null
          purchase_date?: string
          subcategory_id?: string | null
          total_installments?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_liquidacao_id: string | null
          closing_day: number | null
          created_at: string
          due_day: number | null
          entity_id: string | null
          id: string
          is_active: boolean
          limit_value: number | null
          name: string
        }
        Insert: {
          account_liquidacao_id?: string | null
          closing_day?: number | null
          created_at?: string
          due_day?: number | null
          entity_id?: string | null
          id?: string
          is_active?: boolean
          limit_value?: number | null
          name: string
        }
        Update: {
          account_liquidacao_id?: string | null
          closing_day?: number | null
          created_at?: string
          due_day?: number | null
          entity_id?: string | null
          id?: string
          is_active?: boolean
          limit_value?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_account_liquidacao_id_fkey"
            columns: ["account_liquidacao_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_cards_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          hourly_cost: number | null
          id: string
          is_active: boolean
          monthly_salary: number | null
          name: string
          role: string | null
        }
        Insert: {
          created_at?: string
          hourly_cost?: number | null
          id?: string
          is_active?: boolean
          monthly_salary?: number | null
          name: string
          role?: string | null
        }
        Update: {
          created_at?: string
          hourly_cost?: number | null
          id?: string
          is_active?: boolean
          monthly_salary?: number | null
          name?: string
          role?: string | null
        }
        Relationships: []
      }
      entities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["entity_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["entity_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["entity_type"]
        }
        Relationships: []
      }
      evolution_chats: {
        Row: {
          created_at: string
          id: string
          instance_name: string
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          linked_to_chat_id: string | null
          profile_pic_url: string | null
          push_name: string | null
          remote_jid: string
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          linked_to_chat_id?: string | null
          profile_pic_url?: string | null
          push_name?: string | null
          remote_jid: string
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          linked_to_chat_id?: string | null
          profile_pic_url?: string | null
          push_name?: string | null
          remote_jid?: string
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_chats_linked_to_chat_id_fkey"
            columns: ["linked_to_chat_id"]
            isOneToOne: false
            referencedRelation: "evolution_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_messages: {
        Row: {
          body: string | null
          chat_id: string | null
          created_at: string
          from_me: boolean
          id: string
          instance_name: string
          media_url: string | null
          message_id: string
          message_type: string | null
          remote_jid: string
          status: string | null
          timestamp: string
        }
        Insert: {
          body?: string | null
          chat_id?: string | null
          created_at?: string
          from_me?: boolean
          id?: string
          instance_name: string
          media_url?: string | null
          message_id: string
          message_type?: string | null
          remote_jid: string
          status?: string | null
          timestamp: string
        }
        Update: {
          body?: string | null
          chat_id?: string | null
          created_at?: string
          from_me?: boolean
          id?: string
          instance_name?: string
          media_url?: string | null
          message_id?: string
          message_type?: string | null
          remote_jid?: string
          status?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "evolution_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_hours_summary: {
        Row: {
          created_at: string
          employee_id: string
          horas_extras: number
          horas_faltas: number
          id: string
          reference_month: string
          saldo_banco_horas: number
          transaction_pagamento_id: string | null
          valor_extras: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          horas_extras?: number
          horas_faltas?: number
          id?: string
          reference_month: string
          saldo_banco_horas?: number
          transaction_pagamento_id?: string | null
          valor_extras?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          horas_extras?: number
          horas_faltas?: number
          id?: string
          reference_month?: string
          saldo_banco_horas?: number
          transaction_pagamento_id?: string | null
          valor_extras?: number
        }
        Relationships: [
          {
            foreignKeyName: "extra_hours_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_hours_summary_transaction_pagamento_id_fkey"
            columns: ["transaction_pagamento_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_csv_raw: {
        Row: {
          c1: string | null
          c10: string | null
          c11: string | null
          c12: string | null
          c13: string | null
          c14: string | null
          c15: string | null
          c2: string | null
          c3: string | null
          c4: string | null
          c5: string | null
          c6: string | null
          c7: string | null
          c8: string | null
          c9: string | null
        }
        Insert: {
          c1?: string | null
          c10?: string | null
          c11?: string | null
          c12?: string | null
          c13?: string | null
          c14?: string | null
          c15?: string | null
          c2?: string | null
          c3?: string | null
          c4?: string | null
          c5?: string | null
          c6?: string | null
          c7?: string | null
          c8?: string | null
          c9?: string | null
        }
        Update: {
          c1?: string | null
          c10?: string | null
          c11?: string | null
          c12?: string | null
          c13?: string | null
          c14?: string | null
          c15?: string | null
          c2?: string | null
          c3?: string | null
          c4?: string | null
          c5?: string | null
          c6?: string | null
          c7?: string | null
          c8?: string | null
          c9?: string | null
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
          conversa_id: string | null
          created_at: string | null
          data_hora: string | null
          id: string
          lida: boolean | null
          mensagem: string
          nome_cliente: string
          status: string
          tipo: string | null
        }
        Insert: {
          campanha_id?: string | null
          cliente_id?: string | null
          conversa_id?: string | null
          created_at?: string | null
          data_hora?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          nome_cliente: string
          status?: string
          tipo?: string | null
        }
        Update: {
          campanha_id?: string | null
          cliente_id?: string | null
          conversa_id?: string | null
          created_at?: string | null
          data_hora?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          nome_cliente?: string
          status?: string
          tipo?: string | null
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
          {
            foreignKeyName: "mensagens_whatsapp_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
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
          data_pagamento: string | null
          data_pedido: string
          id: string
          metodo_pagamento: string | null
          numero_pedido: string
          observacoes: string | null
          status: string
          status_history: Json | null
          transaction_id: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_entrega?: string | null
          data_pagamento?: string | null
          data_pedido?: string
          id?: string
          metodo_pagamento?: string | null
          numero_pedido: string
          observacoes?: string | null
          status?: string
          status_history?: Json | null
          transaction_id?: string | null
          updated_at?: string
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_entrega?: string | null
          data_pagamento?: string | null
          data_pedido?: string
          id?: string
          metodo_pagamento?: string | null
          numero_pedido?: string
          observacoes?: string | null
          status?: string
          status_history?: Json | null
          transaction_id?: string | null
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
          {
            foreignKeyName: "pedidos_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      recorrencias: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          description: string
          due_day: number
          end_month: string | null
          entity_id: string
          id: string
          start_month: string
          status: Database["public"]["Enums"]["recorrencia_status"]
          subcategory_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          due_day: number
          end_month?: string | null
          entity_id: string
          id?: string
          start_month: string
          status?: Database["public"]["Enums"]["recorrencia_status"]
          subcategory_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          due_day?: number
          end_month?: string | null
          entity_id?: string
          id?: string
          start_month?: string
          status?: Database["public"]["Enums"]["recorrencia_status"]
          subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recorrencias_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          anexos: Json | null
          assunto: string
          created_at: string
          data_abertura: string
          descricao: string
          id: string
          prioridade: Database["public"]["Enums"]["prioridade_ticket"]
          resolucao: string | null
          responsavel: string | null
          status: Database["public"]["Enums"]["status_ticket"]
          ultima_atualizacao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anexos?: Json | null
          assunto: string
          created_at?: string
          data_abertura?: string
          descricao: string
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_ticket"]
          resolucao?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_ticket"]
          ultima_atualizacao?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anexos?: Json | null
          assunto?: string
          created_at?: string
          data_abertura?: string
          descricao?: string
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_ticket"]
          resolucao?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_ticket"]
          ultima_atualizacao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timesheet_entries: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          hours: number
          id: string
          observation: string | null
          tipo: Database["public"]["Enums"]["timesheet_tipo"]
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          hours: number
          id?: string
          observation?: string | null
          tipo: Database["public"]["Enums"]["timesheet_tipo"]
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          hours?: number
          id?: string
          observation?: string | null
          tipo?: Database["public"]["Enums"]["timesheet_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: string
          amount_raw: string | null
          category_id: string | null
          created_at: string
          description: string | null
          due_date: string
          entity_id: string
          id: string
          notes: string | null
          origin: Database["public"]["Enums"]["transaction_origin"]
          payment_date: string | null
          recurrence_id: string | null
          reference_month: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          subcategory_id: string | null
          tags: Json | null
          tipo: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          account_id?: string | null
          amount: string
          amount_raw?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          entity_id: string
          id?: string
          notes?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"]
          payment_date?: string | null
          recurrence_id?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          subcategory_id?: string | null
          tags?: Json | null
          tipo: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          account_id?: string | null
          amount?: string
          amount_raw?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          entity_id?: string
          id?: string
          notes?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"]
          payment_date?: string | null
          recurrence_id?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          subcategory_id?: string | null
          tags?: Json | null
          tipo?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recorrencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_import_stage: {
        Row: {
          account_id: string | null
          amount: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          notes: string | null
          origin: Database["public"]["Enums"]["transaction_origin"] | null
          payment_date: string | null
          recurrence_id: string | null
          reference_month: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id: string | null
          tipo: Database["public"]["Enums"]["transaction_type"] | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"] | null
          payment_date?: string | null
          recurrence_id?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id?: string | null
          tipo?: Database["public"]["Enums"]["transaction_type"] | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"] | null
          payment_date?: string | null
          recurrence_id?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id?: string | null
          tipo?: Database["public"]["Enums"]["transaction_type"] | null
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
      whatsapp_contacts: {
        Row: {
          created_at: string
          id: string
          instance_name: string
          name: string | null
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name: string
          name?: string | null
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string
          name?: string | null
          phone?: string
        }
        Relationships: []
      }
      whatsapp_conversas: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          nao_lida: boolean | null
          nome_contato: string
          status: string
          tags: Json | null
          telefone: string
          ultima_interacao: string | null
          ultima_mensagem: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          nao_lida?: boolean | null
          nome_contato: string
          status?: string
          tags?: Json | null
          telefone: string
          ultima_interacao?: string | null
          ultima_mensagem?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          nao_lida?: boolean | null
          nome_contato?: string
          status?: string
          tags?: Json | null
          telefone?: string
          ultima_interacao?: string | null
          ultima_mensagem?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          chat_id: string
          contact_id: string | null
          created_at: string
          id: string
          instance_name: string
          is_archived: boolean
          last_message: string | null
          last_message_at: string | null
          unread_count: number
        }
        Insert: {
          chat_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          instance_name: string
          is_archived?: boolean
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number
        }
        Update: {
          chat_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          instance_name?: string
          is_archived?: boolean
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          client_slug: string | null
          created_at: string | null
          id: string
          instance_name: string
          is_active: boolean | null
          is_connected: boolean | null
        }
        Insert: {
          client_slug?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          is_active?: boolean | null
          is_connected?: boolean | null
        }
        Update: {
          client_slug?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string
          is_active?: boolean | null
          is_connected?: boolean | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          from_me: boolean
          id: string
          media_url: string | null
          status: string | null
          timestamp: string
          type: string
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          from_me: boolean
          id?: string
          media_url?: string | null
          status?: string | null
          timestamp: string
          type?: string
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          from_me?: boolean
          id?: string
          media_url?: string | null
          status?: string | null
          timestamp?: string
          type?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          id: string
          mensagem: string
          nome: string
          updated_at: string
          variaveis: Json | null
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          id?: string
          mensagem: string
          nome: string
          updated_at?: string
          variaveis?: Json | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          mensagem?: string
          nome?: string
          updated_at?: string
          variaveis?: Json | null
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
      account_type: "BANCO" | "CAIXA" | "CARTAO_CREDITO"
      app_role: "admin" | "moderator" | "user"
      ashby_status: "PREVISTO" | "FATURADO" | "PAGO" | "CANCELADO"
      card_invoice_status: "ABERTA" | "FECHADA" | "PAGA"
      category_group:
        | "FIXA"
        | "VARIAVEL"
        | "IMPOSTO"
        | "PESSOA"
        | "ASHBY"
        | "PARTICULAR"
        | "GERAL"
      category_type: "DESPESA" | "RECEITA"
      entity_type: "LOJA" | "PARTICULAR"
      prioridade_ticket: "baixa" | "media" | "alta" | "urgente"
      recorrencia_status: "ATIVA" | "PAUSADA"
      status_ticket: "aberto" | "em_andamento" | "resolvido" | "fechado"
      timesheet_tipo: "NORMAL" | "EXTRA" | "FALTA" | "FERIADO" | "OUTRO"
      transaction_origin:
        | "MANUAL"
        | "RECORRENTE"
        | "CARTAO"
        | "ASHBY"
        | "HORAS_EXTRAS"
      transaction_status: "PREVISTO" | "PAGO" | "ATRASADO" | "CANCELADO"
      transaction_type: "PAGAR" | "RECEBER"
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
      account_type: ["BANCO", "CAIXA", "CARTAO_CREDITO"],
      app_role: ["admin", "moderator", "user"],
      ashby_status: ["PREVISTO", "FATURADO", "PAGO", "CANCELADO"],
      card_invoice_status: ["ABERTA", "FECHADA", "PAGA"],
      category_group: [
        "FIXA",
        "VARIAVEL",
        "IMPOSTO",
        "PESSOA",
        "ASHBY",
        "PARTICULAR",
        "GERAL",
      ],
      category_type: ["DESPESA", "RECEITA"],
      entity_type: ["LOJA", "PARTICULAR"],
      prioridade_ticket: ["baixa", "media", "alta", "urgente"],
      recorrencia_status: ["ATIVA", "PAUSADA"],
      status_ticket: ["aberto", "em_andamento", "resolvido", "fechado"],
      timesheet_tipo: ["NORMAL", "EXTRA", "FALTA", "FERIADO", "OUTRO"],
      transaction_origin: [
        "MANUAL",
        "RECORRENTE",
        "CARTAO",
        "ASHBY",
        "HORAS_EXTRAS",
      ],
      transaction_status: ["PREVISTO", "PAGO", "ATRASADO", "CANCELADO"],
      transaction_type: ["PAGAR", "RECEBER"],
    },
  },
} as const
