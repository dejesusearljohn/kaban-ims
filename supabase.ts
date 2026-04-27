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
      accountability_reports: {
        Row: {
          accountability_id: number
          archived_at: string | null
          contact_snapshot: string | null
          created_at: string
          department_id: number | null
          description_snapshot: string | null
          is_archived: boolean
          issue_date: string
          issued_to_id: string
          item_id: number
          property_no_snapshot: string | null
          quantity_logged: number
          reference_id: number | null
          reference_type: string | null
          remarks: string | null
          source: string
          uid: string
          unit_snapshot: string | null
        }
        Insert: {
          accountability_id?: never
          archived_at?: string | null
          contact_snapshot?: string | null
          created_at?: string
          department_id?: number | null
          description_snapshot?: string | null
          is_archived?: boolean
          issue_date?: string
          issued_to_id: string
          item_id: number
          property_no_snapshot?: string | null
          quantity_logged: number
          reference_id?: number | null
          reference_type?: string | null
          remarks?: string | null
          source?: string
          uid?: string
          unit_snapshot?: string | null
        }
        Update: {
          accountability_id?: never
          archived_at?: string | null
          contact_snapshot?: string | null
          created_at?: string
          department_id?: number | null
          description_snapshot?: string | null
          is_archived?: boolean
          issue_date?: string
          issued_to_id?: string
          item_id?: number
          property_no_snapshot?: string | null
          quantity_logged?: number
          reference_id?: number | null
          reference_type?: string | null
          remarks?: string | null
          source?: string
          uid?: string
          unit_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accountability_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_reports_issued_to_id_fkey"
            columns: ["issued_to_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_reports_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["item_id"]
          },
        ]
      }
      archived_departments: {
        Row: {
          archive_id: number
          archive_reason: string | null
          archived_at: string
          archived_by: string | null
          payload: Json
          source_id: string
        }
        Insert: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload: Json
          source_id: string
        }
        Update: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload?: Json
          source_id?: string
        }
        Relationships: []
      }
      archived_distribution_logs: {
        Row: {
          archive_id: number
          archive_reason: string | null
          archived_at: string
          archived_by: string | null
          payload: Json
          source_id: string
        }
        Insert: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload: Json
          source_id: string
        }
        Update: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload?: Json
          source_id?: string
        }
        Relationships: []
      }
      archived_inventory: {
        Row: {
          archive_id: number
          archive_reason: string | null
          archived_at: string
          archived_by: string | null
          payload: Json
          source_id: string
        }
        Insert: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload: Json
          source_id: string
        }
        Update: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload?: Json
          source_id?: string
        }
        Relationships: []
      }
      archived_par_records: {
        Row: {
          archive_id: number
          archive_reason: string | null
          archived_at: string
          archived_by: string | null
          payload: Json
          source_id: string
        }
        Insert: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload: Json
          source_id: string
        }
        Update: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload?: Json
          source_id?: string
        }
        Relationships: []
      }
      archived_stockpile: {
        Row: {
          archive_id: number
          archive_reason: string | null
          archived_at: string
          archived_by: string | null
          payload: Json
          source_id: string
        }
        Insert: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload: Json
          source_id: string
        }
        Update: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload?: Json
          source_id?: string
        }
        Relationships: []
      }
      archived_users: {
        Row: {
          archive_id: number
          archive_reason: string | null
          archived_at: string
          archived_by: string | null
          payload: Json
          source_id: string
        }
        Insert: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload: Json
          source_id: string
        }
        Update: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload?: Json
          source_id?: string
        }
        Relationships: []
      }
      archived_vehicles: {
        Row: {
          archive_id: number
          archive_reason: string | null
          archived_at: string
          archived_by: string | null
          payload: Json
          source_id: string
        }
        Insert: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload: Json
          source_id: string
        }
        Update: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload?: Json
          source_id?: string
        }
        Relationships: []
      }
      archived_wmr_reports: {
        Row: {
          archive_id: number
          archive_reason: string | null
          archived_at: string
          archived_by: string | null
          payload: Json
          source_id: string
        }
        Insert: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload: Json
          source_id: string
        }
        Update: {
          archive_id?: number
          archive_reason?: string | null
          archived_at?: string
          archived_by?: string | null
          payload?: Json
          source_id?: string
        }
        Relationships: []
      }
      daily_check_items: {
        Row: {
          check_id: number
          check_item_id: number
          condition: string
          item_id: number
          remarks: string | null
          scanned_at: string
          uid: string
        }
        Insert: {
          check_id: number
          check_item_id?: never
          condition: string
          item_id: number
          remarks?: string | null
          scanned_at?: string
          uid?: string
        }
        Update: {
          check_id?: number
          check_item_id?: never
          condition?: string
          item_id?: number
          remarks?: string | null
          scanned_at?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_check_items_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "daily_checks"
            referencedColumns: ["check_id"]
          },
          {
            foreignKeyName: "daily_check_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["item_id"]
          },
        ]
      }
      daily_checks: {
        Row: {
          check_date: string | null
          check_id: number
          department_id: number | null
          is_submitted: boolean | null
          submitted_by: string | null
          uid: string
        }
        Insert: {
          check_date?: string | null
          check_id?: number
          department_id?: number | null
          is_submitted?: boolean | null
          submitted_by?: string | null
          uid?: string
        }
        Update: {
          check_date?: string | null
          check_id?: number
          department_id?: number | null
          is_submitted?: boolean | null
          submitted_by?: string | null
          uid?: string
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
          archived_at: string | null
          created_at: string | null
          dept_code: string
          dept_name: string
          id: number
          is_archived: boolean
          uid: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          dept_code: string
          dept_name: string
          id?: number
          is_archived?: boolean
          uid?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          dept_code?: string
          dept_name?: string
          id?: number
          is_archived?: boolean
          uid?: string
        }
        Relationships: []
      }
      distribution_logs: {
        Row: {
          archived_at: string | null
          calamity_name: string | null
          families_helped: number | null
          is_archived: boolean
          items_distributed: Json | null
          log_id: number
          operation_date: string | null
          recipient_info: string | null
          uid: string
        }
        Insert: {
          archived_at?: string | null
          calamity_name?: string | null
          families_helped?: number | null
          is_archived?: boolean
          items_distributed?: Json | null
          log_id?: number
          operation_date?: string | null
          recipient_info?: string | null
          uid?: string
        }
        Update: {
          archived_at?: string | null
          calamity_name?: string | null
          families_helped?: number | null
          is_archived?: boolean
          items_distributed?: Json | null
          log_id?: number
          operation_date?: string | null
          recipient_info?: string | null
          uid?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          acquisition_mode: string | null
          archived_at: string | null
          condition: string | null
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
          uid: string
          unit_cost: number | null
          unit_of_measure: string | null
        }
        Insert: {
          acquisition_mode?: string | null
          archived_at?: string | null
          condition?: string | null
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
          uid?: string
          unit_cost?: number | null
          unit_of_measure?: string | null
        }
        Update: {
          acquisition_mode?: string | null
          archived_at?: string | null
          condition?: string | null
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
          uid?: string
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
          uid: string
        }
        Insert: {
          created_at?: string | null
          item_id?: number | null
          photo_id?: number
          photo_url: string
          uid?: string
        }
        Update: {
          created_at?: string | null
          item_id?: number | null
          photo_id?: number
          photo_url?: string
          uid?: string
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
          archived_at: string | null
          contact_snapshot: string | null
          cost_snapshot: number | null
          date_acquired_snapshot: string | null
          description_snapshot: string | null
          is_archived: boolean
          issue_date: string | null
          issued_to_id: string | null
          item_id: number | null
          par_id: number
          property_no_snapshot: string | null
          quantity_issued: number
          uid: string
          unit_snapshot: string | null
        }
        Insert: {
          archived_at?: string | null
          contact_snapshot?: string | null
          cost_snapshot?: number | null
          date_acquired_snapshot?: string | null
          description_snapshot?: string | null
          is_archived?: boolean
          issue_date?: string | null
          issued_to_id?: string | null
          item_id?: number | null
          par_id?: number
          property_no_snapshot?: string | null
          quantity_issued: number
          uid?: string
          unit_snapshot?: string | null
        }
        Update: {
          archived_at?: string | null
          contact_snapshot?: string | null
          cost_snapshot?: number | null
          date_acquired_snapshot?: string | null
          description_snapshot?: string | null
          is_archived?: boolean
          issue_date?: string | null
          issued_to_id?: string | null
          item_id?: number | null
          par_id?: number
          property_no_snapshot?: string | null
          quantity_issued?: number
          uid?: string
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
          daily_check_id: number | null
          details: string | null
          incoming_staff_id: string | null
          is_approved_by_admin: boolean | null
          outgoing_staff_id: string | null
          status: string
          turnover_id: number
          uid: string
        }
        Insert: {
          created_at?: string | null
          daily_check_id?: number | null
          details?: string | null
          incoming_staff_id?: string | null
          is_approved_by_admin?: boolean | null
          outgoing_staff_id?: string | null
          status?: string
          turnover_id?: number
          uid?: string
        }
        Update: {
          created_at?: string | null
          daily_check_id?: number | null
          details?: string | null
          incoming_staff_id?: string | null
          is_approved_by_admin?: boolean | null
          outgoing_staff_id?: string | null
          status?: string
          turnover_id?: number
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_turnovers_daily_check_id_fkey"
            columns: ["daily_check_id"]
            isOneToOne: false
            referencedRelation: "daily_checks"
            referencedColumns: ["check_id"]
          },
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
          archived_at: string | null
          category: string | null
          expiration_date: string | null
          is_archived: boolean
          item_name: string | null
          packed_date: string | null
          quantity_on_hand: number | null
          stockpile_id: number
          uid: string
          unit_of_measure: string | null
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          expiration_date?: string | null
          is_archived?: boolean
          item_name?: string | null
          packed_date?: string | null
          quantity_on_hand?: number | null
          stockpile_id?: number
          uid?: string
          unit_of_measure?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          expiration_date?: string | null
          is_archived?: boolean
          item_name?: string | null
          packed_date?: string | null
          quantity_on_hand?: number | null
          stockpile_id?: number
          uid?: string
          unit_of_measure?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          archived_at: string | null
          contact_info: string | null
          created_at: string | null
          department_id: number | null
          email: string
          emergency_contact: string | null
          full_name: string
          id: string
          is_archived: boolean
          is_locked: boolean | null
          is_online: boolean | null
          password_hash: string | null
          position: string | null
          qr_code: string | null
          recovery_email: string | null
          role: string | null
          staff_id: string
          uid: string
        }
        Insert: {
          archived_at?: string | null
          contact_info?: string | null
          created_at?: string | null
          department_id?: number | null
          email: string
          emergency_contact?: string | null
          full_name: string
          id?: string
          is_archived?: boolean
          is_locked?: boolean | null
          is_online?: boolean | null
          password_hash?: string | null
          position?: string | null
          qr_code?: string | null
          recovery_email?: string | null
          role?: string | null
          staff_id: string
          uid?: string
        }
        Update: {
          archived_at?: string | null
          contact_info?: string | null
          created_at?: string | null
          department_id?: number | null
          email?: string
          emergency_contact?: string | null
          full_name?: string
          id?: string
          is_archived?: boolean
          is_locked?: boolean | null
          is_online?: boolean | null
          password_hash?: string | null
          position?: string | null
          qr_code?: string | null
          recovery_email?: string | null
          role?: string | null
          staff_id?: string
          uid?: string
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
          uid: string
          vehicle_id: number | null
        }
        Insert: {
          admin_id?: string | null
          amount?: number | null
          date_repaired?: string | null
          job_order_number?: string | null
          repair_id?: number
          service_center?: string | null
          uid?: string
          vehicle_id?: number | null
        }
        Update: {
          admin_id?: string | null
          amount?: number | null
          date_repaired?: string | null
          job_order_number?: string | null
          repair_id?: number
          service_center?: string | null
          uid?: string
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
          archived_at: string | null
          cr_number: string | null
          engine_number: string | null
          id: number
          is_archived: boolean
          is_serviceable: boolean | null
          make_model: string | null
          repair_history_log: string | null
          uid: string
          year_model: number | null
        }
        Insert: {
          archived_at?: string | null
          cr_number?: string | null
          engine_number?: string | null
          id?: number
          is_archived?: boolean
          is_serviceable?: boolean | null
          make_model?: string | null
          repair_history_log?: string | null
          uid?: string
          year_model?: number | null
        }
        Update: {
          archived_at?: string | null
          cr_number?: string | null
          engine_number?: string | null
          id?: number
          is_archived?: boolean
          is_serviceable?: boolean | null
          make_model?: string | null
          repair_history_log?: string | null
          uid?: string
          year_model?: number | null
        }
        Relationships: []
      }
      wmr_reports: {
        Row: {
          admin_remarks: string | null
          archived_at: string | null
          date_reported: string | null
          is_archived: boolean
          item_id: number | null
          last_user_id: string | null
          location: string | null
          quantity_reported: number
          reason_damage: string | null
          report_id: number
          status: string | null
          uid: string
        }
        Insert: {
          admin_remarks?: string | null
          archived_at?: string | null
          date_reported?: string | null
          is_archived?: boolean
          item_id?: number | null
          last_user_id?: string | null
          location?: string | null
          quantity_reported?: number
          reason_damage?: string | null
          report_id?: number
          status?: string | null
          uid?: string
        }
        Update: {
          admin_remarks?: string | null
          archived_at?: string | null
          date_reported?: string | null
          is_archived?: boolean
          item_id?: number | null
          last_user_id?: string | null
          location?: string | null
          quantity_reported?: number
          reason_damage?: string | null
          report_id?: number
          status?: string | null
          uid?: string
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
