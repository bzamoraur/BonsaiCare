export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_errors: {
        Row: {
          context: string | null;
          digest: string | null;
          id: number;
          message: string | null;
          occurred_at: string;
          owner_id: string | null;
          path: string | null;
          release: string | null;
          source: string;
          user_agent: string | null;
        };
        Insert: {
          context?: string | null;
          digest?: string | null;
          id?: never;
          message?: string | null;
          occurred_at?: string;
          owner_id?: string | null;
          path?: string | null;
          release?: string | null;
          source: string;
          user_agent?: string | null;
        };
        Update: {
          context?: string | null;
          digest?: string | null;
          id?: never;
          message?: string | null;
          occurred_at?: string;
          owner_id?: string | null;
          path?: string | null;
          release?: string | null;
          source?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      b2_purge_queue: {
        Row: {
          purged_at: string | null;
          requested_at: string;
          uid: string;
        };
        Insert: {
          purged_at?: string | null;
          requested_at?: string;
          uid: string;
        };
        Update: {
          purged_at?: string | null;
          requested_at?: string;
          uid?: string;
        };
        Relationships: [];
      };
      care_log_entries: {
        Row: {
          created_at: string;
          details: Json;
          id: string;
          notes: string | null;
          occurred_on: string;
          owner_id: string;
          task_id: string | null;
          title: string | null;
          tree_id: string;
          type: Database["public"]["Enums"]["care_event_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          details?: Json;
          id?: string;
          notes?: string | null;
          occurred_on?: string;
          owner_id: string;
          task_id?: string | null;
          title?: string | null;
          tree_id: string;
          type: Database["public"]["Enums"]["care_event_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          details?: Json;
          id?: string;
          notes?: string | null;
          occurred_on?: string;
          owner_id?: string;
          task_id?: string | null;
          title?: string | null;
          tree_id?: string;
          type?: Database["public"]["Enums"]["care_event_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "care_log_entries_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "care_log_entries_tree_id_fkey";
            columns: ["tree_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "trees";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      locations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          owner_id?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          caption: string | null;
          care_log_entry_id: string | null;
          created_at: string;
          height: number | null;
          id: string;
          owner_id: string;
          storage_path: string;
          taken_at: string;
          tree_id: string;
          width: number | null;
        };
        Insert: {
          caption?: string | null;
          care_log_entry_id?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          owner_id: string;
          storage_path: string;
          taken_at?: string;
          tree_id: string;
          width?: number | null;
        };
        Update: {
          caption?: string | null;
          care_log_entry_id?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          owner_id?: string;
          storage_path?: string;
          taken_at?: string;
          tree_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "photos_care_log_entry_id_fkey";
            columns: ["care_log_entry_id"];
            isOneToOne: false;
            referencedRelation: "care_log_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_tree_id_fkey";
            columns: ["tree_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "trees";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      profiles: {
        Row: {
          climate_zone: string | null;
          created_at: string;
          display_name: string | null;
          hemisphere: Database["public"]["Enums"]["hemisphere"];
          id: string;
          units: Database["public"]["Enums"]["units"];
          updated_at: string;
        };
        Insert: {
          climate_zone?: string | null;
          created_at?: string;
          display_name?: string | null;
          hemisphere?: Database["public"]["Enums"]["hemisphere"];
          id: string;
          units?: Database["public"]["Enums"]["units"];
          updated_at?: string;
        };
        Update: {
          climate_zone?: string | null;
          created_at?: string;
          display_name?: string | null;
          hemisphere?: Database["public"]["Enums"]["hemisphere"];
          id?: string;
          units?: Database["public"]["Enums"]["units"];
          updated_at?: string;
        };
        Relationships: [];
      };
      species: {
        Row: {
          common_name: string;
          created_at: string;
          default_care: Json | null;
          id: string;
          owner_id: string | null;
          scientific_name: string | null;
          type: Database["public"]["Enums"]["species_type"] | null;
        };
        Insert: {
          common_name: string;
          created_at?: string;
          default_care?: Json | null;
          id?: string;
          owner_id?: string | null;
          scientific_name?: string | null;
          type?: Database["public"]["Enums"]["species_type"] | null;
        };
        Update: {
          common_name?: string;
          created_at?: string;
          default_care?: Json | null;
          id?: string;
          owner_id?: string | null;
          scientific_name?: string | null;
          type?: Database["public"]["Enums"]["species_type"] | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          due_on: string;
          id: string;
          notes: string | null;
          owner_id: string;
          recurrence: Json | null;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          tree_id: string | null;
          type: Database["public"]["Enums"]["task_type"];
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          due_on: string;
          id?: string;
          notes?: string | null;
          owner_id: string;
          recurrence?: Json | null;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          tree_id?: string | null;
          type: Database["public"]["Enums"]["task_type"];
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          due_on?: string;
          id?: string;
          notes?: string | null;
          owner_id?: string;
          recurrence?: Json | null;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          tree_id?: string | null;
          type?: Database["public"]["Enums"]["task_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_tree_id_fkey";
            columns: ["tree_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "trees";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      tree_tags: {
        Row: {
          owner_id: string;
          tag_id: string;
          tree_id: string;
        };
        Insert: {
          owner_id: string;
          tag_id: string;
          tree_id: string;
        };
        Update: {
          owner_id?: string;
          tag_id?: string;
          tree_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tree_tags_tag_id_fkey";
            columns: ["tag_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "tree_tags_tree_id_fkey";
            columns: ["tree_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "trees";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      trees: {
        Row: {
          acquired_from: string | null;
          acquired_on: string | null;
          archived_at: string | null;
          cover_photo_id: string | null;
          created_at: string;
          current_pot: string | null;
          current_substrate: string | null;
          development_stage: Database["public"]["Enums"]["development_stage"] | null;
          health_status: Database["public"]["Enums"]["health_status"] | null;
          id: string;
          location_id: string | null;
          name: string;
          notes: string | null;
          origin: Database["public"]["Enums"]["tree_origin"] | null;
          owner_id: string;
          species_id: string | null;
          species_label: string | null;
          style: string | null;
          updated_at: string;
        };
        Insert: {
          acquired_from?: string | null;
          acquired_on?: string | null;
          archived_at?: string | null;
          cover_photo_id?: string | null;
          created_at?: string;
          current_pot?: string | null;
          current_substrate?: string | null;
          development_stage?: Database["public"]["Enums"]["development_stage"] | null;
          health_status?: Database["public"]["Enums"]["health_status"] | null;
          id?: string;
          location_id?: string | null;
          name: string;
          notes?: string | null;
          origin?: Database["public"]["Enums"]["tree_origin"] | null;
          owner_id: string;
          species_id?: string | null;
          species_label?: string | null;
          style?: string | null;
          updated_at?: string;
        };
        Update: {
          acquired_from?: string | null;
          acquired_on?: string | null;
          archived_at?: string | null;
          cover_photo_id?: string | null;
          created_at?: string;
          current_pot?: string | null;
          current_substrate?: string | null;
          development_stage?: Database["public"]["Enums"]["development_stage"] | null;
          health_status?: Database["public"]["Enums"]["health_status"] | null;
          id?: string;
          location_id?: string | null;
          name?: string;
          notes?: string | null;
          origin?: Database["public"]["Enums"]["tree_origin"] | null;
          owner_id?: string;
          species_id?: string | null;
          species_label?: string | null;
          style?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trees_cover_photo_id_fkey";
            columns: ["cover_photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trees_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trees_species_id_fkey";
            columns: ["species_id"];
            isOneToOne: false;
            referencedRelation: "species";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_task: {
        Args: {
          p_care_notes?: string;
          p_care_type?: Database["public"]["Enums"]["care_event_type"];
          p_completed_on: string;
          p_log_event?: boolean;
          p_next_due_on?: string;
          p_outcome: Database["public"]["Enums"]["task_status"];
          p_task_id: string;
        };
        Returns: Json;
      };
      delete_my_account: { Args: never; Returns: undefined };
      owner_metrics: { Args: never; Returns: Json };
      recent_app_errors: { Args: { p_limit?: number }; Returns: Json };
      record_client_error: {
        Args: {
          p_context?: string;
          p_digest?: string;
          p_message?: string;
          p_path?: string;
          p_release?: string;
          p_source: string;
          p_user_agent?: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      care_event_type:
        | "watering"
        | "fertilizing"
        | "pruning"
        | "wiring"
        | "repotting"
        | "pest_treatment"
        | "styling"
        | "defoliation"
        | "observation"
        | "note";
      development_stage: "raw_material" | "development" | "refinement" | "maintenance";
      health_status: "thriving" | "healthy" | "struggling" | "critical" | "dormant";
      hemisphere: "northern" | "southern";
      species_type: "conifer" | "deciduous" | "broadleaf_evergreen" | "tropical" | "other";
      task_status: "pending" | "done" | "skipped";
      task_type:
        | "watering"
        | "fertilizing"
        | "pruning"
        | "repotting"
        | "wiring"
        | "inspection"
        | "photo"
        | "custom";
      tree_origin:
        "nursery_stock" | "pre_bonsai" | "yamadori" | "seed" | "cutting" | "gift" | "other";
      units: "metric" | "imperial";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      care_event_type: [
        "watering",
        "fertilizing",
        "pruning",
        "wiring",
        "repotting",
        "pest_treatment",
        "styling",
        "defoliation",
        "observation",
        "note",
      ],
      development_stage: ["raw_material", "development", "refinement", "maintenance"],
      health_status: ["thriving", "healthy", "struggling", "critical", "dormant"],
      hemisphere: ["northern", "southern"],
      species_type: ["conifer", "deciduous", "broadleaf_evergreen", "tropical", "other"],
      task_status: ["pending", "done", "skipped"],
      task_type: [
        "watering",
        "fertilizing",
        "pruning",
        "repotting",
        "wiring",
        "inspection",
        "photo",
        "custom",
      ],
      tree_origin: ["nursery_stock", "pre_bonsai", "yamadori", "seed", "cutting", "gift", "other"],
      units: ["metric", "imperial"],
    },
  },
} as const;
