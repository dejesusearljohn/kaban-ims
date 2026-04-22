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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      daily_checks: {
        Row: {
          check_date: string | null
          check_id: number
          department_id: number | null
          is_submitted: boolean | null
          submitted_by: string | null
        }
        Insert: {
          check_date?: string | null
          check_id?: number
          department_id?: number | null
          is_submitted?: boolean | null
          submitted_by?: string | null
        }
        Update: {
          check_date?: string | null
          check_id?: number
          department_id?: number | null
          is_submitted?: boolean | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checks_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          dept_code: string
          dept_name: string
          id: number
        }
        Insert: {
          created_at?: string | null
          dept_code: string
          dept_name: string
          id?: number
        }
        Update: {
          created_at?: string | null
          dept_code?: string
          dept_name?: string
          id?: number
        }
        Relationships: []
      }
      distribution_logs: {
        Row: {
          calamity_name: string | null
          families_helped: number | null
          items_distributed: Json | null
          log_id: number
          operation_date: string | null
          recipient_info: string | null
        }
        Insert: {
          calamity_name?: string | null
          families_helped?: number | null
          items_distributed?: Json | null
          log_id?: number
          operation_date?: string | null
          recipient_info?: string | null
        }
        Update: {
          calamity_name?: string | null
          families_helped?: number | null
          items_distributed?: Json | null
          log_id?: number
          operation_date?: string | null
          recipient_info?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          acquisition_mode: string | null
          created_at: string | null
          date_acquired: string
          department_id: number | null
          expiration_date: string | null
          item_id: number
          item_name: string
          item_type: string
          photo_path: string | null
          property_no: string | null
          qr_code: string | null
          quantity: number | null
          status: string | null
          unit_cost: number | null
          unit_of_measure: string | null
        }
        Insert: {
          acquisition_mode?: string | null
          created_at?: string | null
          date_acquired: string
          department_id?: number | null
          expiration_date?: string | null
          item_id?: number
          item_name: string
          item_type: string
          photo_path?: string | null
          property_no?: string | null
          qr_code?: string | null
          quantity?: number | null
          status?: string | null
          unit_cost?: number | null
          unit_of_measure?: string | null
        }
        Update: {
          acquisition_mode?: string | null
          created_at?: string | null
          date_acquired?: string
          department_id?: number | null
          expiration_date?: string | null
          item_id?: number
          item_name?: string
          item_type?: string
          photo_path?: string | null
          property_no?: string | null
          qr_code?: string | null
          quantity?: number | null
          status?: string | null
          unit_cost?: number | null
          unit_of_measure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_photos: {
        Row: {
          created_at: string | null
          item_id: number | null
          photo_id: number
          photo_url: string
        }
        Insert: {
          created_at?: string | null
          item_id?: number | null
          photo_id?: number
          photo_url: string
        }
        Update: {
          created_at?: string | null
          item_id?: number | null
          photo_id?: number
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_photos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["item_id"]
          },
        ]
      }
      par_records: {
        Row: {
          contact_snapshot: string | null
          cost_snapshot: number | null
          date_acquired_snapshot: string | null
          description_snapshot: string | null
          issue_date: string | null
          issued_to_id: string | null
          item_id: number | null
          par_id: number
          property_no_snapshot: string | null
          quantity_issued: number
          unit_snapshot: string | null
        }
        Insert: {
          contact_snapshot?: string | null
          cost_snapshot?: number | null
          date_acquired_snapshot?: string | null
          description_snapshot?: string | null
          issue_date?: string | null
          issued_to_id?: string | null
          item_id?: number | null
          par_id?: number
          property_no_snapshot?: string | null
          quantity_issued: number
          unit_snapshot?: string | null
        }
        Update: {
          contact_snapshot?: string | null
          cost_snapshot?: number | null
          date_acquired_snapshot?: string | null
          description_snapshot?: string | null
          issue_date?: string | null
          issued_to_id?: string | null
          item_id?: number | null
          par_id?: number
          property_no_snapshot?: string | null
          quantity_issued?: number
          unit_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "par_records_issued_to_id_fkey"
            columns: ["issued_to_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "par_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["item_id"]
          },
        ]
      }
      shift_turnovers: {
        Row: {
          created_at: string | null
          details: string | null
          incoming_staff_id: string | null
          is_approved_by_admin: boolean | null
          outgoing_staff_id: string | null
          turnover_id: number
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          incoming_staff_id?: string | null
          is_approved_by_admin?: boolean | null
          outgoing_staff_id?: string | null
          turnover_id?: number
        }
        Update: {
          created_at?: string | null
          details?: string | null
          incoming_staff_id?: string | null
          is_approved_by_admin?: boolean | null
          outgoing_staff_id?: string | null
          turnover_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_turnovers_incoming_staff_id_fkey"
            columns: ["incoming_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_turnovers_outgoing_staff_id_fkey"
            columns: ["outgoing_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stockpile: {
        Row: {
          category: string | null
          expiration_date: string | null
          item_name: string | null
          packed_date: string | null
          quantity_on_hand: number | null
          stockpile_id: number
          unit_of_measure: string | null
        }
        Insert: {
          category?: string | null
          expiration_date?: string | null
          item_name?: string | null
          packed_date?: string | null
          quantity_on_hand?: number | null
          stockpile_id?: number
          unit_of_measure?: string | null
        }
        Update: {
          category?: string | null
          expiration_date?: string | null
          item_name?: string | null
          packed_date?: string | null
          quantity_on_hand?: number | null
          stockpile_id?: number
          unit_of_measure?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          contact_info: string | null
          created_at: string | null
          department_id: number | null
          email: string
          full_name: string
          id: string
          is_locked: boolean | null
          is_online: boolean | null
          password_hash: string | null
          position: string | null
          qr_code: string | null
          role: string | null
          staff_id: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string | null
          department_id?: number | null
          email: string
          full_name: string
          id?: string
          is_locked?: boolean | null
          is_online?: boolean | null
          password_hash?: string | null
          position?: string | null
          qr_code?: string | null
          role?: string | null
          staff_id: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string | null
          department_id?: number | null
          email?: string
          full_name?: string
          id?: string
          is_locked?: boolean | null
          is_online?: boolean | null
          password_hash?: string | null
          position?: string | null
          qr_code?: string | null
          role?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_repairs: {
        Row: {
          admin_id: string | null
          amount: number | null
          date_repaired: string | null
          job_order_number: string | null
          repair_id: number
          service_center: string | null
          vehicle_id: number | null
        }
        Insert: {
          admin_id?: string | null
          amount?: number | null
          date_repaired?: string | null
          job_order_number?: string | null
          repair_id?: number
          service_center?: string | null
          vehicle_id?: number | null
        }
        Update: {
          admin_id?: string | null
          amount?: number | null
          date_repaired?: string | null
          job_order_number?: string | null
          repair_id?: number
          service_center?: string | null
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_repairs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_repairs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          cr_number: string | null
          engine_number: string | null
          id: number
          is_serviceable: boolean | null
          make_model: string | null
          repair_history_log: string | null
          year_model: number | null
        }
        Insert: {
          cr_number?: string | null
          engine_number?: string | null
          id?: number
          is_serviceable?: boolean | null
          make_model?: string | null
          repair_history_log?: string | null
          year_model?: number | null
        }
        Update: {
          cr_number?: string | null
          engine_number?: string | null
          id?: number
          is_serviceable?: boolean | null
          make_model?: string | null
          repair_history_log?: string | null
          year_model?: number | null
        }
        Relationships: []
      }
      wmr_reports: {
        Row: {
          admin_remarks: string | null
          date_reported: string | null
          item_id: number | null
          last_user_id: string | null
          location: string | null
          reason_damage: string | null
          report_id: number
          status: string | null
        }
        Insert: {
          admin_remarks?: string | null
          date_reported?: string | null
          item_id?: number | null
          last_user_id?: string | null
          location?: string | null
          reason_damage?: string | null
          report_id?: number
          status?: string | null
        }
        Update: {
          admin_remarks?: string | null
          date_reported?: string | null
          item_id?: number | null
          last_user_id?: string | null
          location?: string | null
          reason_damage?: string | null
          report_id?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wmr_reports_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "wmr_reports_last_user_id_fkey"
            columns: ["last_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
