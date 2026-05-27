export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string;
          parent_id: string | null;
          teacher_id: string | null;
          class_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string;
          parent_id?: string | null;
          teacher_id?: string | null;
          class_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string;
          parent_id?: string | null;
          teacher_id?: string | null;
          class_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          student_id: string;
          image_url: string;
          raw_text: string | null;
          status: Database["public"]["Enums"]["question_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          image_url: string;
          raw_text?: string | null;
          status?: Database["public"]["Enums"]["question_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          image_url?: string;
          raw_text?: string | null;
          status?: Database["public"]["Enums"]["question_status"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recovery_missions: {
        Row: {
          id: string;
          question_id: string;
          steps: Json;
          current_step: number;
          is_completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          steps: Json;
          current_step?: number;
          is_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          steps?: Json;
          current_step?: number;
          is_completed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_missions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      question_status: "pending" | "recovering" | "resolved";
      user_role: "student" | "parent" | "teacher";
    };
    CompositeTypes: Record<string, never>;
  };
};
