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
        Relationships: [
          {
            foreignKeyName: 'contacts_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_instances'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: {
          contact_id: string
          id: string
          instance_id: string
          last_message: string | null
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          id?: string
          instance_id: string
          last_message?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          id?: string
          instance_id?: string
          last_message?: string | null
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
          {
            foreignKeyName: 'conversations_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_instances'
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
          message_id: string
          timestamp: string | null
          type: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          from_me?: boolean | null
          id?: string
          message_id: string
          timestamp?: string | null
          type?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          from_me?: boolean | null
          id?: string
          message_id?: string
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
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string | null
          id: string
          instance_name: string
          last_connection: string | null
          qrcode: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_name: string
          last_connection?: string | null
          qrcode?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_name?: string
          last_connection?: string | null
          qrcode?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'whatsapp_instances_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
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

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: contacts
//   id: uuid (not null, default: gen_random_uuid())
//   instance_id: uuid (not null)
//   remote_jid: text (not null)
//   push_name: text (nullable)
//   profile_picture: text (nullable)
// Table: conversations
//   id: uuid (not null, default: gen_random_uuid())
//   instance_id: uuid (not null)
//   contact_id: uuid (not null)
//   last_message: text (nullable)
//   updated_at: timestamp with time zone (nullable, default: now())
// Table: interactions
//   id: uuid (not null, default: gen_random_uuid())
//   lead_id: uuid (not null)
//   user_id: uuid (not null)
//   tipo: text (not null)
//   descricao: text (not null)
//   data: timestamp with time zone (not null, default: now())
// Table: leads
//   id: uuid (not null, default: gen_random_uuid())
//   empresa: text (not null)
//   contato: text (not null)
//   email: text (not null)
//   telefone: text (not null)
//   segmento: text (not null)
//   tamanho: text (not null)
//   origem: text (not null)
//   status: text (not null, default: 'Novo'::text)
//   created_by: uuid (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   whatsapp_external_id: text (nullable)
// Table: messages
//   id: uuid (not null, default: gen_random_uuid())
//   conversation_id: uuid (not null)
//   message_id: text (not null)
//   from_me: boolean (nullable, default: false)
//   content: text (nullable)
//   type: text (nullable)
//   timestamp: timestamp with time zone (nullable, default: now())
// Table: proposals
//   id: uuid (not null, default: gen_random_uuid())
//   lead_id: uuid (not null)
//   user_id: uuid (not null)
//   titulo: text (not null)
//   valor: numeric (not null, default: 0)
//   status: text (not null, default: 'Aberto'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   descricao: text (nullable)
//   itens: jsonb (nullable, default: '[]'::jsonb)
//   observacoes: text (nullable)
//   validade: timestamp with time zone (nullable)
// Table: tasks
//   id: uuid (not null, default: gen_random_uuid())
//   lead_id: uuid (not null)
//   user_id: uuid (not null)
//   titulo: text (not null)
//   descricao: text (nullable)
//   prazo: timestamp with time zone (nullable)
//   status: text (not null, default: 'Pendente'::text)
//   created_at: timestamp with time zone (not null, default: now())
// Table: users
//   id: uuid (not null)
//   email: text (not null)
//   name: text (not null)
//   role: text (not null, default: 'vendedor'::text)
//   created_at: timestamp with time zone (not null, default: now())
// Table: whatsapp_instances
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (not null)
//   instance_name: text (not null)
//   status: text (nullable, default: 'disconnected'::text)
//   qrcode: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   last_connection: timestamp with time zone (nullable)

// --- CONSTRAINTS ---
// Table: contacts
//   FOREIGN KEY contacts_instance_id_fkey: FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE
//   UNIQUE contacts_instance_id_remote_jid_key: UNIQUE (instance_id, remote_jid)
//   PRIMARY KEY contacts_pkey: PRIMARY KEY (id)
// Table: conversations
//   FOREIGN KEY conversations_contact_id_fkey: FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
//   UNIQUE conversations_instance_id_contact_id_key: UNIQUE (instance_id, contact_id)
//   FOREIGN KEY conversations_instance_id_fkey: FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE
//   PRIMARY KEY conversations_pkey: PRIMARY KEY (id)
// Table: interactions
//   FOREIGN KEY interactions_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
//   PRIMARY KEY interactions_pkey: PRIMARY KEY (id)
//   FOREIGN KEY interactions_user_id_fkey: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
// Table: leads
//   FOREIGN KEY leads_created_by_fkey: FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
//   PRIMARY KEY leads_pkey: PRIMARY KEY (id)
// Table: messages
//   FOREIGN KEY messages_conversation_id_fkey: FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
//   UNIQUE messages_message_id_key: UNIQUE (message_id)
//   PRIMARY KEY messages_pkey: PRIMARY KEY (id)
// Table: proposals
//   FOREIGN KEY proposals_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
//   PRIMARY KEY proposals_pkey: PRIMARY KEY (id)
//   FOREIGN KEY proposals_user_id_fkey: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
// Table: tasks
//   FOREIGN KEY tasks_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
//   PRIMARY KEY tasks_pkey: PRIMARY KEY (id)
//   FOREIGN KEY tasks_user_id_fkey: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
// Table: users
//   FOREIGN KEY users_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY users_pkey: PRIMARY KEY (id)
// Table: whatsapp_instances
//   UNIQUE whatsapp_instances_instance_name_key: UNIQUE (instance_name)
//   PRIMARY KEY whatsapp_instances_pkey: PRIMARY KEY (id)
//   FOREIGN KEY whatsapp_instances_user_id_fkey: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

// --- ROW LEVEL SECURITY POLICIES ---
// Table: contacts
//   Policy "Contacts_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.id = contacts.instance_id) AND (wi.user_id = auth.uid()))))
//   Policy "Contacts_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.id = contacts.instance_id) AND (wi.user_id = auth.uid()))))
//   Policy "Contacts_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.id = contacts.instance_id) AND ((wi.user_id = auth.uid()) OR (EXISTS ( SELECT 1            FROM users u           WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))))))
//   Policy "Contacts_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.id = contacts.instance_id) AND (wi.user_id = auth.uid()))))
// Table: conversations
//   Policy "Conversations_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.id = conversations.instance_id) AND (wi.user_id = auth.uid()))))
//   Policy "Conversations_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.id = conversations.instance_id) AND (wi.user_id = auth.uid()))))
//   Policy "Conversations_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.id = conversations.instance_id) AND ((wi.user_id = auth.uid()) OR (EXISTS ( SELECT 1            FROM users u           WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))))))
//   Policy "Conversations_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM whatsapp_instances wi   WHERE ((wi.id = conversations.instance_id) AND (wi.user_id = auth.uid()))))
// Table: interactions
//   Policy "interactions_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
//   Policy "interactions_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "interactions_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
//   Policy "interactions_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
// Table: leads
//   Policy "leads_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((created_by = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
//   Policy "leads_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (created_by = auth.uid())
//   Policy "leads_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((created_by = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
//   Policy "leads_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((created_by = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
// Table: messages
//   Policy "Messages_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM (conversations c      JOIN whatsapp_instances wi ON ((wi.id = c.instance_id)))   WHERE ((c.id = messages.conversation_id) AND (wi.user_id = auth.uid()))))
//   Policy "Messages_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM (conversations c      JOIN whatsapp_instances wi ON ((wi.id = c.instance_id)))   WHERE ((c.id = messages.conversation_id) AND (wi.user_id = auth.uid()))))
//   Policy "Messages_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM (conversations c      JOIN whatsapp_instances wi ON ((wi.id = c.instance_id)))   WHERE ((c.id = messages.conversation_id) AND ((wi.user_id = auth.uid()) OR (EXISTS ( SELECT 1            FROM users u           WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))))))
//   Policy "Messages_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM (conversations c      JOIN whatsapp_instances wi ON ((wi.id = c.instance_id)))   WHERE ((c.id = messages.conversation_id) AND (wi.user_id = auth.uid()))))
// Table: proposals
//   Policy "proposals_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
//   Policy "proposals_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "proposals_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
//   Policy "proposals_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
// Table: tasks
//   Policy "tasks_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
//   Policy "tasks_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "tasks_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
//   Policy "tasks_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
// Table: users
//   Policy "users_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (id = auth.uid())
//   Policy "users_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "users_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((id = auth.uid()) OR (EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'gerente'::text]))))))
// Table: whatsapp_instances
//   Policy "whatsapp_instances_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//   Policy "whatsapp_instances_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "whatsapp_instances_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//   Policy "whatsapp_instances_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())

// --- DATABASE FUNCTIONS ---
// FUNCTION admin_create_user(text, text, text, text)
//   CREATE OR REPLACE FUNCTION public.admin_create_user(new_email text, new_password text, new_name text, new_role text)
//    RETURNS uuid
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     new_user_id UUID;
//   BEGIN
//     IF NOT EXISTS (
//       SELECT 1 FROM public.users
//       WHERE id = auth.uid() AND role = 'admin'
//     ) THEN
//       RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar usuários.';
//     END IF;
//
//     IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
//       RAISE EXCEPTION 'E-mail já está em uso.';
//     END IF;
//
//     new_user_id := gen_random_uuid();
//
//     INSERT INTO auth.users (
//       id, instance_id, email, encrypted_password, email_confirmed_at,
//       created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
//       is_super_admin, role, aud,
//       confirmation_token, recovery_token, email_change_token_new,
//       email_change, email_change_token_current,
//       phone, phone_change, phone_change_token, reauthentication_token
//     ) VALUES (
//       new_user_id,
//       '00000000-0000-0000-0000-000000000000',
//       new_email,
//       crypt(new_password, gen_salt('bf')),
//       NOW(), NOW(), NOW(),
//       '{"provider": "email", "providers": ["email"]}',
//       jsonb_build_object('name', new_name),
//       false, 'authenticated', 'authenticated',
//       '', '', '', '', '',
//       NULL, '', '', ''
//     );
//
//     INSERT INTO public.users (id, name, email, role)
//     VALUES (new_user_id, new_name, new_email, new_role)
//     ON CONFLICT (id) DO UPDATE
//     SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;
//
//     RETURN new_user_id;
//   END;
//   $function$
//
// FUNCTION admin_update_user(uuid, text, text)
//   CREATE OR REPLACE FUNCTION public.admin_update_user(target_user_id uuid, new_name text, new_role text)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF NOT EXISTS (
//       SELECT 1 FROM public.users
//       WHERE id = auth.uid() AND role = 'admin'
//     ) THEN
//       RAISE EXCEPTION 'Acesso negado: apenas administradores podem editar usuários.';
//     END IF;
//
//     UPDATE public.users
//     SET name = new_name, role = new_role
//     WHERE id = target_user_id;
//
//     UPDATE auth.users
//     SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{name}', to_jsonb(new_name))
//     WHERE id = target_user_id;
//   END;
//   $function$
//
// FUNCTION handle_new_user()
//   CREATE OR REPLACE FUNCTION public.handle_new_user()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     INSERT INTO public.users (id, name, email, role)
//     VALUES (
//       NEW.id,
//       COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
//       NEW.email,
//       'vendedor'
//     )
//     ON CONFLICT (id) DO UPDATE
//     SET name = EXCLUDED.name, email = EXCLUDED.email;
//
//     RETURN NEW;
//   END;
//   $function$
//

// --- INDEXES ---
// Table: contacts
//   CREATE UNIQUE INDEX contacts_instance_id_remote_jid_key ON public.contacts USING btree (instance_id, remote_jid)
// Table: conversations
//   CREATE UNIQUE INDEX conversations_instance_id_contact_id_key ON public.conversations USING btree (instance_id, contact_id)
// Table: leads
//   CREATE INDEX leads_whatsapp_external_id_idx ON public.leads USING btree (whatsapp_external_id)
// Table: messages
//   CREATE UNIQUE INDEX messages_message_id_key ON public.messages USING btree (message_id)
// Table: whatsapp_instances
//   CREATE UNIQUE INDEX whatsapp_instances_instance_name_key ON public.whatsapp_instances USING btree (instance_name)
