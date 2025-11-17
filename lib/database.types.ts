// Placeholder types file for Supabase database
// In production, generate this with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
export type Database = {
  public: {
    Tables: {
      programs: {
        Row: {
          id: string;
          name: string;
          sponsor: string | null;
          start_date: string | null;
          end_date: string | null;
          created_by: string | null;
          logo_url: string | null;
          app_name: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          accent_color: string | null;
        };
        Insert: Omit<Database['public']['Tables']['programs']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['programs']['Insert']>;
      };
      program_memberships: {
        Row: {
          id: string;
          program_id: string;
          user_id: string;
          role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['program_memberships']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['program_memberships']['Insert']>;
      };
      workstreams: {
        Row: {
          id: string;
          program_id: string;
          name: string;
          lead: string | null;
          status: 'GREEN' | 'YELLOW' | 'RED';
          percent_complete: number;
          summary: string;
          next_milestone: string | null;
          next_milestone_due: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workstreams']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['workstreams']['Insert']>;
      };
      risks: {
        Row: {
          id: string;
          program_id: string;
          workstream_id: string | null;
          title: string;
          severity: 'LOW' | 'MEDIUM' | 'HIGH';
          status: 'OPEN' | 'MITIGATED' | 'CLOSED';
          owner: string | null;
          due_date: string | null;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['risks']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['risks']['Insert']>;
      };
      actions: {
        Row: {
          id: string;
          program_id: string;
          workstream_id: string | null;
          title: string;
          owner: string | null;
          due_date: string | null;
          status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['actions']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['actions']['Insert']>;
      };
      updates: {
        Row: {
          id: string;
          program_id: string;
          raw_text: string;
          parsed_json: unknown;
          applied_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['updates']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['updates']['Insert']>;
      };
    };
  };
};

