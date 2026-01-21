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
      accounts: {
        Row: {
          account_number: string | null
          agency: string | null
          bank_name: string | null
          created_at: string | null
          current_balance: number | null
          entity_id: string | null
          id: string
          initial_balance: number | null
          is_active: boolean | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          agency?: string | null
          bank_name?: string | null
          created_at?: string | null
          current_balance?: number | null
          entity_id?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          agency?: string | null
          bank_name?: string | null
          created_at?: string | null
          current_balance?: number | null
          entity_id?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
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
      ai_agents: {
        Row: {
          created_at: string
          description: string | null
          elevenlabs_voice_id: string | null
          greeting_message: string | null
          id: string
          instance_id: string | null
          is_active: boolean | null
          knowledge_tables: string[] | null
          max_tokens: number | null
          model: string
          name: string
          qualification_criteria: Json | null
          system_prompt: string
          temperature: number | null
          transfer_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          elevenlabs_voice_id?: string | null
          greeting_message?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          knowledge_tables?: string[] | null
          max_tokens?: number | null
          model?: string
          name: string
          qualification_criteria?: Json | null
          system_prompt: string
          temperature?: number | null
          transfer_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          elevenlabs_voice_id?: string | null
          greeting_message?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          knowledge_tables?: string[] | null
          max_tokens?: number | null
          model?: string
          name?: string
          qualification_criteria?: Json | null
          system_prompt?: string
          temperature?: number | null
          transfer_keywords?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          agent_id: string
          cliente_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          qualification_notes: string | null
          qualification_score: number | null
          qualification_status: string | null
          remote_jid: string
          status: string | null
          transferred_at: string | null
          transferred_reason: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          cliente_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          qualification_notes?: string | null
          qualification_score?: number | null
          qualification_status?: string | null
          remote_jid: string
          status?: string | null
          transferred_at?: string | null
          transferred_reason?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          cliente_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          qualification_notes?: string | null
          qualification_score?: number | null
          qualification_status?: string | null
          remote_jid?: string
          status?: string | null
          transferred_at?: string | null
          transferred_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ashby_orders: {
        Row: {
          amount: number | null
          created_at: string | null
          delivery_date: string | null
          description: string | null
          freight: number | null
          id: string
          liters: number | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          payment_date: string | null
          quarter: number
          status: Database["public"]["Enums"]["ashby_status"] | null
          total: number | null
          transaction_id: string | null
          updated_at: string | null
          value_com_nf: number | null
          value_sem_nf: number | null
          year: number
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          delivery_date?: string | null
          description?: string | null
          freight?: number | null
          id?: string
          liters?: number | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          payment_date?: string | null
          quarter: number
          status?: Database["public"]["Enums"]["ashby_status"] | null
          total?: number | null
          transaction_id?: string | null
          updated_at?: string | null
          value_com_nf?: number | null
          value_sem_nf?: number | null
          year: number
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          delivery_date?: string | null
          description?: string | null
          freight?: number | null
          id?: string
          liters?: number | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          payment_date?: string | null
          quarter?: number
          status?: Database["public"]["Enums"]["ashby_status"] | null
          total?: number | null
          transaction_id?: string | null
          updated_at?: string | null
          value_com_nf?: number | null
          value_sem_nf?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ashby_orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      barril_movimentacoes: {
        Row: {
          barril_id: string
          cliente_id: string | null
          created_at: string
          data_movimento: string
          id: string
          localizacao_anterior:
            | Database["public"]["Enums"]["barril_localizacao"]
            | null
          localizacao_nova:
            | Database["public"]["Enums"]["barril_localizacao"]
            | null
          observacoes: string | null
          pedido_id: string | null
          status_conteudo: Database["public"]["Enums"]["barril_status_conteudo"]
          tipo_movimento: Database["public"]["Enums"]["barril_tipo_movimento"]
        }
        Insert: {
          barril_id: string
          cliente_id?: string | null
          created_at?: string
          data_movimento?: string
          id?: string
          localizacao_anterior?:
            | Database["public"]["Enums"]["barril_localizacao"]
            | null
          localizacao_nova?:
            | Database["public"]["Enums"]["barril_localizacao"]
            | null
          observacoes?: string | null
          pedido_id?: string | null
          status_conteudo: Database["public"]["Enums"]["barril_status_conteudo"]
          tipo_movimento: Database["public"]["Enums"]["barril_tipo_movimento"]
        }
        Update: {
          barril_id?: string
          cliente_id?: string | null
          created_at?: string
          data_movimento?: string
          id?: string
          localizacao_anterior?:
            | Database["public"]["Enums"]["barril_localizacao"]
            | null
          localizacao_nova?:
            | Database["public"]["Enums"]["barril_localizacao"]
            | null
          observacoes?: string | null
          pedido_id?: string | null
          status_conteudo?: Database["public"]["Enums"]["barril_status_conteudo"]
          tipo_movimento?: Database["public"]["Enums"]["barril_tipo_movimento"]
        }
        Relationships: [
          {
            foreignKeyName: "barril_movimentacoes_barril_id_fkey"
            columns: ["barril_id"]
            isOneToOne: false
            referencedRelation: "barris"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barril_movimentacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barril_movimentacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      barris: {
        Row: {
          capacidade: number
          cliente_id: string | null
          codigo: string
          created_at: string
          data_ultima_movimentacao: string | null
          id: string
          localizacao: Database["public"]["Enums"]["barril_localizacao"]
          lojista_id: string | null
          observacoes: string | null
          status_conteudo: Database["public"]["Enums"]["barril_status_conteudo"]
          updated_at: string
        }
        Insert: {
          capacidade?: number
          cliente_id?: string | null
          codigo: string
          created_at?: string
          data_ultima_movimentacao?: string | null
          id?: string
          localizacao?: Database["public"]["Enums"]["barril_localizacao"]
          lojista_id?: string | null
          observacoes?: string | null
          status_conteudo?: Database["public"]["Enums"]["barril_status_conteudo"]
          updated_at?: string
        }
        Update: {
          capacidade?: number
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          data_ultima_movimentacao?: string | null
          id?: string
          localizacao?: Database["public"]["Enums"]["barril_localizacao"]
          lojista_id?: string | null
          observacoes?: string | null
          status_conteudo?: Database["public"]["Enums"]["barril_status_conteudo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barris_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barris_lojista_id_fkey"
            columns: ["lojista_id"]
            isOneToOne: false
            referencedRelation: "lojistas"
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
          created_at: string | null
          description: string | null
          due_date: string
          entity_id: string
          id: string
          image_base64: string | null
          notes: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["boleto_status"] | null
          tipo_nota: Database["public"]["Enums"]["boleto_tipo_nota"] | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiario?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          entity_id: string
          id?: string
          image_base64?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["boleto_status"] | null
          tipo_nota?: Database["public"]["Enums"]["boleto_tipo_nota"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiario?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          entity_id?: string
          id?: string
          image_base64?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["boleto_status"] | null
          tipo_nota?: Database["public"]["Enums"]["boleto_tipo_nota"] | null
          transaction_id?: string | null
          updated_at?: string | null
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
      campanha_envios: {
        Row: {
          campanha_id: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string | null
          error_message: string | null
          id: string
          remote_jid: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campanha_id?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          remote_jid?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campanha_id?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          remote_jid?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanha_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          conversoes: number | null
          created_at: string | null
          data: string | null
          filters: Json | null
          id: string
          instance_id: string | null
          media_type: string | null
          media_url: string | null
          mensagens_entregues: number | null
          mensagens_enviadas: number | null
          mensagens_lidas: number | null
          message_template: string | null
          nome: string
          publico_alvo: number | null
          respostas: number | null
          scheduled_at: string | null
          status: string | null
          taxa_conversao: number | null
          taxa_resposta: number | null
        }
        Insert: {
          conversoes?: number | null
          created_at?: string | null
          data?: string | null
          filters?: Json | null
          id?: string
          instance_id?: string | null
          media_type?: string | null
          media_url?: string | null
          mensagens_entregues?: number | null
          mensagens_enviadas?: number | null
          mensagens_lidas?: number | null
          message_template?: string | null
          nome: string
          publico_alvo?: number | null
          respostas?: number | null
          scheduled_at?: string | null
          status?: string | null
          taxa_conversao?: number | null
          taxa_resposta?: number | null
        }
        Update: {
          conversoes?: number | null
          created_at?: string | null
          data?: string | null
          filters?: Json | null
          id?: string
          instance_id?: string | null
          media_type?: string | null
          media_url?: string | null
          mensagens_entregues?: number | null
          mensagens_enviadas?: number | null
          mensagens_lidas?: number | null
          message_template?: string | null
          nome?: string
          publico_alvo?: number | null
          respostas?: number | null
          scheduled_at?: string | null
          status?: string | null
          taxa_conversao?: number | null
          taxa_resposta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      card_purchases: {
        Row: {
          category_id: string | null
          created_at: string | null
          credit_card_id: string
          first_installment_date: string | null
          id: string
          installments_total: number | null
          merchant_normalized: string | null
          original_description: string | null
          purchase_fingerprint: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          credit_card_id: string
          first_installment_date?: string | null
          id?: string
          installments_total?: number | null
          merchant_normalized?: string | null
          original_description?: string | null
          purchase_fingerprint?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          credit_card_id?: string
          first_installment_date?: string | null
          id?: string
          installments_total?: number | null
          merchant_normalized?: string | null
          original_description?: string | null
          purchase_fingerprint?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_purchases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_purchases_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_group: Database["public"]["Enums"]["category_group"] | null
          color: string | null
          created_at: string | null
          description: string | null
          group: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string | null
        }
        Insert: {
          category_group?: Database["public"]["Enums"]["category_group"] | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          group?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string | null
        }
        Update: {
          category_group?: Database["public"]["Enums"]["category_group"] | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          group?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string | null
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          telefone?: string
          ticket_medio?: number | null
          ultimo_contato?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_card_imports: {
        Row: {
          competencia: string | null
          created_at: string | null
          credit_card_id: string
          file_hash: string | null
          file_name: string | null
          id: string
          import_date: string | null
          notes: string | null
          raw_data: Json | null
          records_imported: number | null
          status: string | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string | null
          credit_card_id: string
          file_hash?: string | null
          file_name?: string | null
          id?: string
          import_date?: string | null
          notes?: string | null
          raw_data?: Json | null
          records_imported?: number | null
          status?: string | null
        }
        Update: {
          competencia?: string | null
          created_at?: string | null
          credit_card_id?: string
          file_hash?: string | null
          file_name?: string | null
          id?: string
          import_date?: string | null
          notes?: string | null
          raw_data?: Json | null
          records_imported?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_imports_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_invoices: {
        Row: {
          closing_date: string | null
          competencia: string
          confirmed_at: string | null
          created_at: string | null
          credit_card_id: string
          due_date: string | null
          id: string
          imported_at: string | null
          lock_status: boolean | null
          payment_date: string | null
          posted_at: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          total_value: number | null
          transaction_id: string | null
          transaction_posted_id: string | null
          updated_at: string | null
        }
        Insert: {
          closing_date?: string | null
          competencia: string
          confirmed_at?: string | null
          created_at?: string | null
          credit_card_id: string
          due_date?: string | null
          id?: string
          imported_at?: string | null
          lock_status?: boolean | null
          payment_date?: string | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          total_value?: number | null
          transaction_id?: string | null
          transaction_posted_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closing_date?: string | null
          competencia?: string
          confirmed_at?: string | null
          created_at?: string | null
          credit_card_id?: string
          due_date?: string | null
          id?: string
          imported_at?: string | null
          lock_status?: boolean | null
          payment_date?: string | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          total_value?: number | null
          transaction_id?: string | null
          transaction_posted_id?: string | null
          updated_at?: string | null
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
            foreignKeyName: "credit_card_invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoices_transaction_posted_id_fkey"
            columns: ["transaction_posted_id"]
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
          competencia: string
          created_at: string | null
          credit_card_id: string
          dedupe_key: string | null
          description: string
          id: string
          installment_info: string | null
          installment_number: number | null
          invoice_id: string | null
          is_recurring: boolean | null
          item_status: string | null
          notes: string | null
          original_amount: number | null
          parent_purchase_id: string | null
          purchase_date: string
          source_import_id: string | null
          subcategory_id: string | null
          total_installments: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          competencia: string
          created_at?: string | null
          credit_card_id: string
          dedupe_key?: string | null
          description: string
          id?: string
          installment_info?: string | null
          installment_number?: number | null
          invoice_id?: string | null
          is_recurring?: boolean | null
          item_status?: string | null
          notes?: string | null
          original_amount?: number | null
          parent_purchase_id?: string | null
          purchase_date: string
          source_import_id?: string | null
          subcategory_id?: string | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          competencia?: string
          created_at?: string | null
          credit_card_id?: string
          dedupe_key?: string | null
          description?: string
          id?: string
          installment_info?: string | null
          installment_number?: number | null
          invoice_id?: string | null
          is_recurring?: boolean | null
          item_status?: string | null
          notes?: string | null
          original_amount?: number | null
          parent_purchase_id?: string | null
          purchase_date?: string
          source_import_id?: string | null
          subcategory_id?: string | null
          total_installments?: number | null
          updated_at?: string | null
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
            foreignKeyName: "credit_card_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "credit_card_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_purchase"
            columns: ["parent_purchase_id"]
            isOneToOne: false
            referencedRelation: "card_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_liquidacao_id: string | null
          brand: string | null
          card_provider: string | null
          closing_day: number | null
          created_at: string | null
          credit_limit: number | null
          due_day: number | null
          entity_id: string | null
          id: string
          is_active: boolean | null
          last_digits: string | null
          limit_value: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          account_liquidacao_id?: string | null
          brand?: string | null
          card_provider?: string | null
          closing_day?: number | null
          created_at?: string | null
          credit_limit?: number | null
          due_day?: number | null
          entity_id?: string | null
          id?: string
          is_active?: boolean | null
          last_digits?: string | null
          limit_value?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          account_liquidacao_id?: string | null
          brand?: string | null
          card_provider?: string | null
          closing_day?: number | null
          created_at?: string | null
          credit_limit?: number | null
          due_day?: number | null
          entity_id?: string | null
          id?: string
          is_active?: boolean | null
          last_digits?: string | null
          limit_value?: number | null
          name?: string
          updated_at?: string | null
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
      delivery_receipts: {
        Row: {
          cliente_cpf_cnpj: string | null
          cliente_endereco: Json | null
          cliente_nome: string | null
          cliente_telefone: string | null
          controle_barris: Json | null
          created_at: string
          data_entrega: string | null
          id: string
          metodo_pagamento: string | null
          observacoes: string | null
          pedido_id: string
          periodo_entrega: string | null
          sent_at: string | null
          signature_data: string | null
          signed_at: string | null
          signed_ip: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          cliente_cpf_cnpj?: string | null
          cliente_endereco?: Json | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          controle_barris?: Json | null
          created_at?: string
          data_entrega?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          pedido_id: string
          periodo_entrega?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          cliente_cpf_cnpj?: string | null
          cliente_endereco?: Json | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          controle_barris?: Json | null
          created_at?: string
          data_entrega?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          pedido_id?: string
          periodo_entrega?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_receipts_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          cargo: string | null
          created_at: string | null
          department: string | null
          email: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          overtime_rate: number | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          overtime_rate?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          overtime_rate?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      entities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["entity_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["entity_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["entity_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      extra_hours_summary: {
        Row: {
          created_at: string | null
          employee_id: string
          horas_extras: number | null
          horas_faltas: number | null
          id: string
          paid_at: string | null
          reference_month: string
          saldo_banco_horas: number | null
          status: string | null
          total_overtime_hours: number | null
          total_overtime_value: number | null
          transaction_pagamento_id: string | null
          updated_at: string | null
          valor_extras: number | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          horas_extras?: number | null
          horas_faltas?: number | null
          id?: string
          paid_at?: string | null
          reference_month: string
          saldo_banco_horas?: number | null
          status?: string | null
          total_overtime_hours?: number | null
          total_overtime_value?: number | null
          transaction_pagamento_id?: string | null
          updated_at?: string | null
          valor_extras?: number | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          horas_extras?: number | null
          horas_faltas?: number | null
          id?: string
          paid_at?: string | null
          reference_month?: string
          saldo_banco_horas?: number | null
          status?: string | null
          total_overtime_hours?: number | null
          total_overtime_value?: number | null
          transaction_pagamento_id?: string | null
          updated_at?: string | null
          valor_extras?: number | null
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
      interacoes: {
        Row: {
          cliente_id: string
          created_at: string | null
          data: string | null
          descricao: string
          id: string
          responsavel: string | null
          tipo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data?: string | null
          descricao: string
          id?: string
          responsavel?: string | null
          tipo: string
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data?: string | null
          descricao?: string
          id?: string
          responsavel?: string | null
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
          cliente_id: string
          created_at: string | null
          data_criacao: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string
          responsavel: string | null
          status: string | null
          telefone: string
          ultima_atualizacao: string | null
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_criacao?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem: string
          responsavel?: string | null
          status?: string | null
          telefone: string
          ultima_atualizacao?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_criacao?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string
          responsavel?: string | null
          status?: string | null
          telefone?: string
          ultima_atualizacao?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      lojistas: {
        Row: {
          cnpj: string | null
          contato_responsavel: string | null
          created_at: string | null
          data_cadastro: string | null
          email: string | null
          endereco: Json | null
          id: string
          nome: string
          nome_fantasia: string | null
          observacoes: string | null
          status: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          contato_responsavel?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          nome: string
          nome_fantasia?: string | null
          observacoes?: string | null
          status?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          contato_responsavel?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          nome?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          status?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string | null
          id: string
          motivo: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number | null
          quantidade_nova: number | null
          referencia_id: string | null
          responsavel: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior?: number | null
          quantidade_nova?: number | null
          referencia_id?: string | null
          responsavel?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          produto_id?: string
          quantidade?: number
          quantidade_anterior?: number | null
          quantidade_nova?: number | null
          referencia_id?: string | null
          responsavel?: string | null
          tipo?: string
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
          created_at: string | null
          id: string
          observacoes: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          quantidade_devolvida: number | null
          subtotal: number
          updated_at: string | null
          valor_devolvido: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          observacoes?: string | null
          pedido_id: string
          preco_unitario: number
          produto_id?: string | null
          quantidade?: number
          quantidade_devolvida?: number | null
          subtotal: number
          updated_at?: string | null
          valor_devolvido?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          observacoes?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          quantidade_devolvida?: number | null
          subtotal?: number
          updated_at?: string | null
          valor_devolvido?: number | null
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
          cliente_id: string | null
          created_at: string | null
          data_entrega: string | null
          data_pagamento: string | null
          data_pedido: string | null
          endereco_entrega: Json | null
          historico: Json | null
          id: string
          lojista_id: string | null
          metodo_pagamento: string | null
          numero_pedido: number
          observacoes: string | null
          status: string | null
          status_history: Json | null
          transaction_id: string | null
          updated_at: string | null
          valor_sinal: number | null
          valor_total: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_entrega?: string | null
          data_pagamento?: string | null
          data_pedido?: string | null
          endereco_entrega?: Json | null
          historico?: Json | null
          id?: string
          lojista_id?: string | null
          metodo_pagamento?: string | null
          numero_pedido?: number
          observacoes?: string | null
          status?: string | null
          status_history?: Json | null
          transaction_id?: string | null
          updated_at?: string | null
          valor_sinal?: number | null
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_entrega?: string | null
          data_pagamento?: string | null
          data_pedido?: string | null
          endereco_entrega?: Json | null
          historico?: Json | null
          id?: string
          lojista_id?: string | null
          metodo_pagamento?: string | null
          numero_pedido?: number
          observacoes?: string | null
          status?: string | null
          status_history?: Json | null
          transaction_id?: string | null
          updated_at?: string | null
          valor_sinal?: number | null
          valor_total?: number | null
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
            foreignKeyName: "pedidos_lojista_id_fkey"
            columns: ["lojista_id"]
            isOneToOne: false
            referencedRelation: "lojistas"
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
          ativo: boolean | null
          capacidade_barril: number | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          estoque: number | null
          estoque_litros: number | null
          estoque_minimo: number | null
          fornecedor: string | null
          id: string
          imagem_url: string | null
          localizacao: string | null
          margem_lucro: number | null
          nome: string
          preco: number
          preco_custo: number | null
          sku: string | null
          tipo_produto: string | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          capacidade_barril?: number | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          estoque?: number | null
          estoque_litros?: number | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          margem_lucro?: number | null
          nome: string
          preco?: number
          preco_custo?: number | null
          sku?: string | null
          tipo_produto?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          capacidade_barril?: number | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          estoque?: number | null
          estoque_litros?: number | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          margem_lucro?: number | null
          nome?: string
          preco?: number
          preco_custo?: number | null
          sku?: string | null
          tipo_produto?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string | null
          id: string
          is_owner: boolean | null
          nome: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          id: string
          is_owner?: boolean | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          id?: string
          is_owner?: boolean | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recorrencias: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          day_of_month: number | null
          description: string
          end_date: string | null
          entity_id: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"] | null
          id: string
          is_active: boolean | null
          last_generated_date: string | null
          start_date: string
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number | null
          description: string
          end_date?: string | null
          entity_id?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"] | null
          id?: string
          is_active?: boolean | null
          last_generated_date?: string | null
          start_date: string
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number | null
          description?: string
          end_date?: string | null
          entity_id?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"] | null
          id?: string
          is_active?: boolean | null
          last_generated_date?: string | null
          start_date?: string
          tipo?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Relationships: [
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
        ]
      }
      recurring_expenses: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string | null
          day_of_month: number | null
          description: string
          end_date: string | null
          entity_id: string | null
          frequency: string
          id: string
          is_active: boolean | null
          notes: string | null
          start_date: string
          subcategory_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number | null
          description: string
          end_date?: string | null
          entity_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          start_date: string
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number | null
          description?: string
          end_date?: string | null
          entity_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          start_date?: string
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_subcategory_id_fkey"
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
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
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
          anexos: string[] | null
          assunto: string
          created_at: string | null
          data_abertura: string | null
          descricao: string
          email: string
          id: string
          nome: string
          prioridade: string | null
          resolucao: string | null
          responsavel: string | null
          status: string | null
          ultima_atualizacao: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anexos?: string[] | null
          assunto: string
          created_at?: string | null
          data_abertura?: string | null
          descricao: string
          email: string
          id?: string
          nome: string
          prioridade?: string | null
          resolucao?: string | null
          responsavel?: string | null
          status?: string | null
          ultima_atualizacao?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anexos?: string[] | null
          assunto?: string
          created_at?: string | null
          data_abertura?: string | null
          descricao?: string
          email?: string
          id?: string
          nome?: string
          prioridade?: string | null
          resolucao?: string | null
          responsavel?: string | null
          status?: string | null
          ultima_atualizacao?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      timesheet_entries: {
        Row: {
          break_minutes: number | null
          created_at: string | null
          employee_id: string
          entry_date: string
          entry_time: string | null
          exit_time: string | null
          id: string
          notes: string | null
          overtime_hours: number | null
          status: string | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string | null
          employee_id: string
          entry_date: string
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          break_minutes?: number | null
          created_at?: string | null
          employee_id?: string
          entry_date?: string
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
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
          amount: number
          category_id: string | null
          created_at: string | null
          description: string
          due_date: string
          entity_id: string | null
          id: string
          notes: string | null
          origin: Database["public"]["Enums"]["transaction_origin"] | null
          origin_reference_id: string | null
          payment_date: string | null
          recurrence_id: string | null
          reference_month: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id: string | null
          tags: string[] | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string | null
          description: string
          due_date: string
          entity_id?: string | null
          id?: string
          notes?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"] | null
          origin_reference_id?: string | null
          payment_date?: string | null
          recurrence_id?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id?: string | null
          tags?: string[] | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string
          due_date?: string
          entity_id?: string | null
          id?: string
          notes?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"] | null
          origin_reference_id?: string | null
          payment_date?: string | null
          recurrence_id?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id?: string | null
          tags?: string[] | null
          tipo?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
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
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string | null
          id: string
          instance_name: string
          name: string
          phone_number: string | null
          qr_code: string | null
          status: string | null
          updated_at: string | null
          webhook_enabled: boolean | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_name: string
          name: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_name?: string
          name?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          created_at: string | null
          direction: string
          external_id: string | null
          id: string
          instance_id: string | null
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          remote_jid: string
          status: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          direction: string
          external_id?: string | null
          id?: string
          instance_id?: string | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          remote_jid: string
          status?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          direction?: string
          external_id?: string | null
          id?: string
          instance_id?: string | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          remote_jid?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_competencia_date: {
        Args: { closing_day: number; purchase_date: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_all_invoices_for_card: {
        Args: { card_id: string }
        Returns: number
      }
      recalculate_invoice_total: {
        Args: { invoice_id: string }
        Returns: number
      }
      sync_boleto_to_transaction: {
        Args: { boleto_id: string }
        Returns: string
      }
      sync_invoice_to_transaction: {
        Args: { invoice_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      ashby_status: "PENDENTE" | "ENTREGUE" | "PAGO" | "CANCELADO"
      barril_localizacao: "LOJA" | "CLIENTE" | "FABRICA"
      barril_status_conteudo: "CHEIO" | "VAZIO"
      barril_tipo_movimento: "SAIDA" | "RETORNO"
      boleto_status:
        | "PENDENTE"
        | "APROVADO"
        | "PAGO"
        | "REJEITADO"
        | "CANCELADO"
      boleto_tipo_nota: "COM_NOTA" | "SEM_NOTA"
      card_transaction_status:
        | "IMPORTADO"
        | "CLASSIFICADO"
        | "CONFIRMADO"
        | "POSTADO"
      category_group: "FIXO" | "VARIAVEL" | "INVESTIMENTO"
      category_type: "DESPESA" | "RECEITA"
      entity_type: "LOJA" | "PARTICULAR"
      invoice_status: "ABERTA" | "FECHADA" | "PAGA"
      recurrence_frequency: "MENSAL" | "SEMANAL" | "QUINZENAL" | "ANUAL"
      transaction_origin:
        | "MANUAL"
        | "RECORRENTE"
        | "CARTAO"
        | "ASHBY"
        | "HORAS_EXTRAS"
        | "PEDIDO"
        | "BOLETO"
        | "FATURA_CARTAO"
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
      app_role: ["admin", "moderator", "user"],
      ashby_status: ["PENDENTE", "ENTREGUE", "PAGO", "CANCELADO"],
      barril_localizacao: ["LOJA", "CLIENTE", "FABRICA"],
      barril_status_conteudo: ["CHEIO", "VAZIO"],
      barril_tipo_movimento: ["SAIDA", "RETORNO"],
      boleto_status: ["PENDENTE", "APROVADO", "PAGO", "REJEITADO", "CANCELADO"],
      boleto_tipo_nota: ["COM_NOTA", "SEM_NOTA"],
      card_transaction_status: [
        "IMPORTADO",
        "CLASSIFICADO",
        "CONFIRMADO",
        "POSTADO",
      ],
      category_group: ["FIXO", "VARIAVEL", "INVESTIMENTO"],
      category_type: ["DESPESA", "RECEITA"],
      entity_type: ["LOJA", "PARTICULAR"],
      invoice_status: ["ABERTA", "FECHADA", "PAGA"],
      recurrence_frequency: ["MENSAL", "SEMANAL", "QUINZENAL", "ANUAL"],
      transaction_origin: [
        "MANUAL",
        "RECORRENTE",
        "CARTAO",
        "ASHBY",
        "HORAS_EXTRAS",
        "PEDIDO",
        "BOLETO",
        "FATURA_CARTAO",
      ],
      transaction_status: ["PREVISTO", "PAGO", "ATRASADO", "CANCELADO"],
      transaction_type: ["PAGAR", "RECEBER"],
    },
  },
} as const
