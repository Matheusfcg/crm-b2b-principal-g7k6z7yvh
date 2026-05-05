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
            referencedRelation: 'profiles'
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
        }
        Relationships: [
          {
            foreignKeyName: 'leads_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
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
            referencedRelation: 'profiles'
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
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
// Table: profiles
//   id: uuid (not null)
//   name: text (not null)
//   role: character varying (not null, default: 'vendedor'::character varying)
//   created_at: timestamp with time zone (not null, default: now())
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

// --- CONSTRAINTS ---
// Table: interactions
//   FOREIGN KEY interactions_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
//   PRIMARY KEY interactions_pkey: PRIMARY KEY (id)
//   FOREIGN KEY interactions_user_id_fkey: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
// Table: leads
//   FOREIGN KEY leads_created_by_fkey: FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
//   PRIMARY KEY leads_pkey: PRIMARY KEY (id)
// Table: profiles
//   FOREIGN KEY profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY profiles_pkey: PRIMARY KEY (id)
// Table: proposals
//   FOREIGN KEY proposals_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
//   PRIMARY KEY proposals_pkey: PRIMARY KEY (id)
//   FOREIGN KEY proposals_user_id_fkey: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
// Table: tasks
//   FOREIGN KEY tasks_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
//   PRIMARY KEY tasks_pkey: PRIMARY KEY (id)
//   FOREIGN KEY tasks_user_id_fkey: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE

// --- ROW LEVEL SECURITY POLICIES ---
// Table: interactions
//   Policy "interactions_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
//   Policy "interactions_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "interactions_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
//   Policy "interactions_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
//     WITH CHECK: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
// Table: leads
//   Policy "leads_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((created_by = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
//   Policy "leads_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (created_by = auth.uid())
//   Policy "leads_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((created_by = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
//   Policy "leads_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((created_by = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
// Table: profiles
//   Policy "profiles_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (id = auth.uid())
//   Policy "profiles_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "profiles_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (id = auth.uid())
// Table: proposals
//   Policy "proposals_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "proposals_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
// Table: tasks
//   Policy "tasks_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
//   Policy "tasks_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "tasks_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
//   Policy "tasks_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))
//     WITH CHECK: ((user_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['gerente'::character varying, 'admin'::character varying])::text[]))))))

// --- DATABASE FUNCTIONS ---
// FUNCTION handle_new_user()
//   CREATE OR REPLACE FUNCTION public.handle_new_user()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     INSERT INTO public.profiles (id, name, role)
//     VALUES (
//       NEW.id,
//       COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
//       'vendedor'
//     )
//     ON CONFLICT (id) DO UPDATE
//     SET name = EXCLUDED.name;
//
//     RETURN NEW;
//   END;
//   $function$
//
