export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
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
            foreignKeyName: "photos_tree_id_fkey";
            columns: ["tree_id"];
            isOneToOne: false;
            referencedRelation: "trees";
            referencedColumns: ["id"];
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
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tree_tags_tree_id_fkey";
            columns: ["tree_id"];
            isOneToOne: false;
            referencedRelation: "trees";
            referencedColumns: ["id"];
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
      [_ in never]: never;
    };
    Enums: {
      development_stage: "raw_material" | "development" | "refinement" | "maintenance";
      health_status: "thriving" | "healthy" | "struggling" | "critical" | "dormant";
      hemisphere: "northern" | "southern";
      species_type: "conifer" | "deciduous" | "broadleaf_evergreen" | "tropical" | "other";
      tree_origin:
        | "nursery_stock"
        | "pre_bonsai"
        | "yamadori"
        | "seed"
        | "cutting"
        | "gift"
        | "other";
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      development_stage: ["raw_material", "development", "refinement", "maintenance"],
      health_status: ["thriving", "healthy", "struggling", "critical", "dormant"],
      hemisphere: ["northern", "southern"],
      species_type: ["conifer", "deciduous", "broadleaf_evergreen", "tropical", "other"],
      tree_origin: ["nursery_stock", "pre_bonsai", "yamadori", "seed", "cutting", "gift", "other"],
      units: ["metric", "imperial"],
    },
  },
} as const;
