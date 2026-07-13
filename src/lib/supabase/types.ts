// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      configuracoes_whatsapp: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          phone_number_id: string
          user_id: string
          waba_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          phone_number_id: string
          user_id: string
          waba_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          phone_number_id?: string
          user_id?: string
          waba_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'configuracoes_whatsapp_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          instance_id: string
          profile_picture: string | null
          push_name: string | null
          remote_jid: string
        }
        Insert: {
          id?: string
          instance_id: string
          profile_picture?: string | null
          push_name?: string | null
          remote_jid: string
        }
        Update: {
          id?: string
          instance_id?: string
          profile_picture?: string | null
          push_name?: string | null
          remote_jid?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          contact_id: string
          id: string
          instance_id: string
          last_message: string | null
          unread_count: number
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          id?: string
          instance_id: string
          last_message?: string | null
          unread_count?: number
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          id?: string
          instance_id?: string
          last_message?: string | null
          unread_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
        ]
      }
      interactions: {
        Row: {
          data: string
          descricao: string
          id: string
          lead_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          data?: string
          descricao: string
          id?: string
          lead_id: string
          tipo: string
          user_id: string
        }
        Update: {
          data?: string
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'interactions_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'interactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      leads: {
        Row: {
          contato: string
          created_at: string
          created_by: string
          email: string
          empresa: string
          id: string
          origem: string
          segmento: string
          status: string
          tamanho: string
          telefone: string
          whatsapp_external_id: string | null
        }
        Insert: {
          contato: string
          created_at?: string
          created_by: string
          email: string
          empresa: string
          id?: string
          origem: string
          segmento: string
          status?: string
          tamanho: string
          telefone: string
          whatsapp_external_id?: string | null
        }
        Update: {
          contato?: string
          created_at?: string
          created_by?: string
          email?: string
          empresa?: string
          id?: string
          origem?: string
          segmento?: string
          status?: string
          tamanho?: string
          telefone?: string
          whatsapp_external_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'leads_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          from_me: boolean | null
          id: string
          media_filename: string | null
          media_mimetype: string | null
          media_url: string | null
          message_id: string
          status: string
          timestamp: string | null
          type: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          from_me?: boolean | null
          id?: string
          media_filename?: string | null
          media_mimetype?: string | null
          media_url?: string | null
          message_id: string
          status?: string
          timestamp?: string | null
          type?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          from_me?: boolean | null
          id?: string
          media_filename?: string | null
          media_mimetype?: string | null
          media_url?: string | null
          message_id?: string
          status?: string
          timestamp?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          itens: Json | null
          lead_id: string
          observacoes: string | null
          status: string
          titulo: string
          user_id: string
          validade: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          itens?: Json | null
          lead_id: string
          observacoes?: string | null
          status?: string
          titulo: string
          user_id: string
          validade?: string | null
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          itens?: Json | null
          lead_id?: string
          observacoes?: string | null
          status?: string
          titulo?: string
          user_id?: string
          validade?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: 'proposals_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'proposals_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lead_id: string
          prazo: string | null
          status: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id: string
          prazo?: string | null
          status?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id?: string
          prazo?: string | null
          status?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          chat_wallpaper: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          chat_wallpaper?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
        }
        Update: {
          avatar_url?: string | null
          chat_wallpaper?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      whatsapp_accounts: {
        Row: {
          access_token: string
          business_id: string
          created_at: string | null
          display_phone_number: string | null
          id: string
          phone_number_id: string
          token_type: string | null
          user_id: string
          waba_id: string
        }
        Insert: {
          access_token: string
          business_id: string
          created_at?: string | null
          display_phone_number?: string | null
          id?: string
          phone_number_id: string
          token_type?: string | null
          user_id: string
          waba_id: string
        }
        Update: {
          access_token?: string
          business_id?: string
          created_at?: string | null
          display_phone_number?: string | null
          id?: string
          phone_number_id?: string
          token_type?: string | null
          user_id?: string
          waba_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string | null
          id: string
          instance_name: string
          instance_token: string | null
          last_connection: string | null
          last_error: string | null
          phone: string | null
          qrcode: string | null
          server_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_name: string
          instance_token?: string | null
          last_connection?: string | null
          last_error?: string | null
          phone?: string | null
          qrcode?: string | null
          server_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_name?: string
          instance_token?: string | null
          last_connection?: string | null
          last_error?: string | null
          phone?: string | null
          qrcode?: string | null
          server_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: string
          instance_name: string | null
          payload: Json | null
          response: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          instance_name?: string | null
          payload?: Json | null
          response?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          instance_name?: string | null
          payload?: Json | null
          response?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          new_email: string
          new_name: string
          new_password: string
          new_role: string
        }
        Returns: string
      }
      admin_update_user: {
        Args: { new_name: string; new_role: string; target_user_id: string }
        Returns: undefined
      }
      is_admin_or_manager: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
