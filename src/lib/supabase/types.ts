// Types générés pour Supabase
// À régénérer avec: npx supabase gen types typescript --project-id votre-projet > src/lib/supabase/types.ts

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'employer' | 'employee' | 'caregiver'
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          avatar_url: string | null
          accessibility_settings: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'employer' | 'employee' | 'caregiver'
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          accessibility_settings?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'employer' | 'employee' | 'caregiver'
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          accessibility_settings?: Record<string, unknown>
          updated_at?: string
        }
      }
      employers: {
        Row: {
          profile_id: string
          address: Record<string, unknown>
          handicap_type: string | null
          handicap_name: string | null
          specific_needs: string | null
          cesu_number: string | null
          pch_beneficiary: boolean
          pch_monthly_amount: number | null
          emergency_contacts: Record<string, unknown>[]
        }
        Insert: {
          profile_id: string
          address: Record<string, unknown>
          handicap_type?: string | null
          handicap_name?: string | null
          specific_needs?: string | null
          cesu_number?: string | null
          pch_beneficiary?: boolean
          pch_monthly_amount?: number | null
          emergency_contacts?: Record<string, unknown>[]
        }
        Update: {
          address?: Record<string, unknown>
          handicap_type?: string | null
          handicap_name?: string | null
          specific_needs?: string | null
          cesu_number?: string | null
          pch_beneficiary?: boolean
          pch_monthly_amount?: number | null
          emergency_contacts?: Record<string, unknown>[]
        }
      }
      employees: {
        Row: {
          profile_id: string
          qualifications: string[]
          languages: string[]
          max_distance_km: number | null
          availability_template: Record<string, unknown>
        }
        Insert: {
          profile_id: string
          qualifications?: string[]
          languages?: string[]
          max_distance_km?: number | null
          availability_template?: Record<string, unknown>
        }
        Update: {
          qualifications?: string[]
          languages?: string[]
          max_distance_km?: number | null
          availability_template?: Record<string, unknown>
        }
      }
      caregivers: {
        Row: {
          profile_id: string
          employer_id: string
          permissions: Record<string, unknown>
          relationship: string | null
          created_at: string
        }
        Insert: {
          profile_id: string
          employer_id: string
          permissions?: Record<string, unknown>
          relationship?: string | null
          created_at?: string
        }
        Update: {
          employer_id?: string
          permissions?: Record<string, unknown>
          relationship?: string | null
        }
      }
      contracts: {
        Row: {
          id: string
          employer_id: string
          employee_id: string
          contract_type: 'CDI' | 'CDD'
          start_date: string
          end_date: string | null
          weekly_hours: number
          hourly_rate: number
          status: 'active' | 'terminated' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          employee_id: string
          contract_type: 'CDI' | 'CDD'
          start_date: string
          end_date?: string | null
          weekly_hours: number
          hourly_rate: number
          status?: 'active' | 'terminated' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          contract_type?: 'CDI' | 'CDD'
          start_date?: string
          end_date?: string | null
          weekly_hours?: number
          hourly_rate?: number
          status?: 'active' | 'terminated' | 'suspended'
          updated_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          contract_id: string
          date: string
          start_time: string
          end_time: string
          break_duration: number
          tasks: string[]
          notes: string | null
          status: 'planned' | 'completed' | 'cancelled' | 'absent'
          computed_pay: Record<string, unknown>
          validated_by_employer: boolean
          validated_by_employee: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          date: string
          start_time: string
          end_time: string
          break_duration?: number
          tasks?: string[]
          notes?: string | null
          status?: 'planned' | 'completed' | 'cancelled' | 'absent'
          computed_pay?: Record<string, unknown>
          validated_by_employer?: boolean
          validated_by_employee?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          date?: string
          start_time?: string
          end_time?: string
          break_duration?: number
          tasks?: string[]
          notes?: string | null
          status?: 'planned' | 'completed' | 'cancelled' | 'absent'
          computed_pay?: Record<string, unknown>
          validated_by_employer?: boolean
          validated_by_employee?: boolean
          updated_at?: string
        }
      }
      log_entries: {
        Row: {
          id: string
          employer_id: string
          author_id: string
          author_role: string
          type: 'info' | 'alert' | 'incident' | 'instruction'
          importance: 'normal' | 'urgent'
          content: string
          audio_url: string | null
          attachments: Record<string, unknown>[]
          recipient_id: string | null
          read_by: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          author_id: string
          author_role: string
          type: 'info' | 'alert' | 'incident' | 'instruction'
          importance?: 'normal' | 'urgent'
          content: string
          audio_url?: string | null
          attachments?: Record<string, unknown>[]
          recipient_id?: string | null
          read_by?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?: 'info' | 'alert' | 'incident' | 'instruction'
          importance?: 'normal' | 'urgent'
          content?: string
          audio_url?: string | null
          attachments?: Record<string, unknown>[]
          recipient_id?: string | null
          read_by?: string[]
          updated_at?: string
        }
      }
      absences: {
        Row: {
          id: string
          employee_id: string
          absence_type: 'sick' | 'vacation' | 'training' | 'unavailable' | 'emergency'
          start_date: string
          end_date: string
          reason: string | null
          justification_url: string | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          absence_type: 'sick' | 'vacation' | 'training' | 'unavailable' | 'emergency'
          start_date: string
          end_date: string
          reason?: string | null
          justification_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          absence_type?: 'sick' | 'vacation' | 'training' | 'unavailable' | 'emergency'
          start_date?: string
          end_date?: string
          reason?: string | null
          justification_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          priority: 'low' | 'normal' | 'high' | 'urgent'
          title: string
          message: string
          data: Record<string, unknown>
          action_url: string | null
          is_read: boolean
          is_dismissed: boolean
          created_at: string
          read_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          title: string
          message: string
          data?: Record<string, unknown>
          action_url?: string | null
          is_read?: boolean
          is_dismissed?: boolean
          created_at?: string
          read_at?: string | null
          expires_at?: string | null
        }
        Update: {
          type?: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          title?: string
          message?: string
          data?: Record<string, unknown>
          action_url?: string | null
          is_read?: boolean
          is_dismissed?: boolean
          read_at?: string | null
          expires_at?: string | null
        }
      }
      liaison_messages: {
        Row: {
          id: string
          employer_id: string
          sender_id: string
          sender_role: 'employer' | 'employee' | 'caregiver'
          content: string
          audio_url: string | null
          attachments: Record<string, unknown>[]
          is_edited: boolean
          read_by: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          sender_id: string
          sender_role: 'employer' | 'employee' | 'caregiver'
          content: string
          audio_url?: string | null
          attachments?: Record<string, unknown>[]
          is_edited?: boolean
          read_by?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          audio_url?: string | null
          attachments?: Record<string, unknown>[]
          is_edited?: boolean
          read_by?: string[]
          updated_at?: string
        }
      }
      notification_preferences: {
        Row: {
          user_id: string
          email_enabled: boolean
          push_enabled: boolean
          compliance_alerts: boolean
          shift_reminders: boolean
          message_notifications: boolean
          reminder_hours_before: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          email_enabled?: boolean
          push_enabled?: boolean
          compliance_alerts?: boolean
          shift_reminders?: boolean
          message_notifications?: boolean
          reminder_hours_before?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          email_enabled?: boolean
          push_enabled?: boolean
          compliance_alerts?: boolean
          shift_reminders?: boolean
          message_notifications?: boolean
          reminder_hours_before?: number
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'employer' | 'employee' | 'caregiver'
      contract_type: 'CDI' | 'CDD'
      contract_status: 'active' | 'terminated' | 'suspended'
      shift_status: 'planned' | 'completed' | 'cancelled' | 'absent'
      log_type: 'info' | 'alert' | 'incident' | 'instruction'
      log_importance: 'normal' | 'urgent'
      absence_type: 'sick' | 'vacation' | 'training' | 'unavailable' | 'emergency'
      absence_status: 'pending' | 'approved' | 'rejected'
    }
  }
}
