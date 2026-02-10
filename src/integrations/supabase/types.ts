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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accessories: {
        Row: {
          compatible_aircraft: string[] | null
          created_at: string
          id: string
          name: string
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status: string
          type: Database["public"]["Enums"]["accessory_type"]
          updated_at: string
        }
        Insert: {
          compatible_aircraft?: string[] | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          type?: Database["public"]["Enums"]["accessory_type"]
          updated_at?: string
        }
        Update: {
          compatible_aircraft?: string[] | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          type?: Database["public"]["Enums"]["accessory_type"]
          updated_at?: string
        }
        Relationships: []
      }
      aircraft: {
        Row: {
          created_at: string
          faa_registration: string | null
          firmware_version: string | null
          id: string
          insurance_expiry: string | null
          model: string
          nickname: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string
          status: string
          total_flight_hours: number
          total_flights: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          faa_registration?: string | null
          firmware_version?: string | null
          id?: string
          insurance_expiry?: string | null
          model: string
          nickname?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number: string
          status?: string
          total_flight_hours?: number
          total_flights?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          faa_registration?: string | null
          firmware_version?: string | null
          id?: string
          insurance_expiry?: string | null
          model?: string
          nickname?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string
          status?: string
          total_flight_hours?: number
          total_flights?: number
          updated_at?: string
        }
        Relationships: []
      }
      aircraft_capabilities: {
        Row: {
          aircraft_id: string
          created_at: string
          id: string
          notes: string | null
          package_id: string
        }
        Insert: {
          aircraft_id: string
          created_at?: string
          id?: string
          notes?: string | null
          package_id: string
        }
        Update: {
          aircraft_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_capabilities_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_capabilities_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "drone_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_capabilities_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      airspace_grids: {
        Row: {
          airspace_class: string
          ceiling_ft: number
          created_at: string
          effective_date: string | null
          facility_id: string | null
          facility_name: string | null
          grid_id: string
          id: string
          laanc_eligible: boolean
          latitude: number | null
          longitude: number | null
          notes: string | null
          updated_at: string
          zero_grid: boolean
        }
        Insert: {
          airspace_class: string
          ceiling_ft?: number
          created_at?: string
          effective_date?: string | null
          facility_id?: string | null
          facility_name?: string | null
          grid_id: string
          id?: string
          laanc_eligible?: boolean
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          updated_at?: string
          zero_grid?: boolean
        }
        Update: {
          airspace_class?: string
          ceiling_ft?: number
          created_at?: string
          effective_date?: string | null
          facility_id?: string | null
          facility_name?: string | null
          grid_id?: string
          id?: string
          laanc_eligible?: boolean
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          updated_at?: string
          zero_grid?: boolean
        }
        Relationships: []
      }
      app_health_history: {
        Row: {
          app_id: string
          checked_at: string | null
          id: string
          metrics: Json | null
          response_time_ms: number | null
          source: string
          status: string
          version: string | null
        }
        Insert: {
          app_id: string
          checked_at?: string | null
          id?: string
          metrics?: Json | null
          response_time_ms?: number | null
          source?: string
          status: string
          version?: string | null
        }
        Update: {
          app_id?: string
          checked_at?: string | null
          id?: string
          metrics?: Json | null
          response_time_ms?: number | null
          source?: string
          status?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_health_history_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_health_history_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          active: boolean
          alert_on_failure: boolean | null
          api_key_created_at: string | null
          api_key_hash: string | null
          api_key_prefix: string | null
          code: string
          consecutive_failures: number | null
          created_at: string
          health_check_url: string | null
          heartbeat_interval_seconds: number | null
          id: string
          last_health_check: string | null
          last_heartbeat_at: string | null
          name: string
          owner_email: string | null
          owner_name: string | null
          status: string
          updated_at: string
          url: string | null
          version: string | null
        }
        Insert: {
          active?: boolean
          alert_on_failure?: boolean | null
          api_key_created_at?: string | null
          api_key_hash?: string | null
          api_key_prefix?: string | null
          code: string
          consecutive_failures?: number | null
          created_at?: string
          health_check_url?: string | null
          heartbeat_interval_seconds?: number | null
          id?: string
          last_health_check?: string | null
          last_heartbeat_at?: string | null
          name: string
          owner_email?: string | null
          owner_name?: string | null
          status?: string
          updated_at?: string
          url?: string | null
          version?: string | null
        }
        Update: {
          active?: boolean
          alert_on_failure?: boolean | null
          api_key_created_at?: string | null
          api_key_hash?: string | null
          api_key_prefix?: string | null
          code?: string
          consecutive_failures?: number | null
          created_at?: string
          health_check_url?: string | null
          heartbeat_interval_seconds?: number | null
          id?: string
          last_health_check?: string | null
          last_heartbeat_at?: string | null
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          status?: string
          updated_at?: string
          url?: string | null
          version?: string | null
        }
        Relationships: []
      }
      authorization_requests: {
        Row: {
          approved_altitude_ft: number | null
          approved_at: string | null
          authorization_type: Database["public"]["Enums"]["authorization_type"]
          created_at: string
          denial_reason: string | null
          expires_at: string | null
          id: string
          mission_id: string
          notes: string | null
          reference_number: string | null
          requested_altitude_ft: number | null
          status: Database["public"]["Enums"]["authorization_status"]
          submitted_at: string | null
          submitted_via: string | null
          updated_at: string
        }
        Insert: {
          approved_altitude_ft?: number | null
          approved_at?: string | null
          authorization_type: Database["public"]["Enums"]["authorization_type"]
          created_at?: string
          denial_reason?: string | null
          expires_at?: string | null
          id?: string
          mission_id: string
          notes?: string | null
          reference_number?: string | null
          requested_altitude_ft?: number | null
          status?: Database["public"]["Enums"]["authorization_status"]
          submitted_at?: string | null
          submitted_via?: string | null
          updated_at?: string
        }
        Update: {
          approved_altitude_ft?: number | null
          approved_at?: string | null
          authorization_type?: Database["public"]["Enums"]["authorization_type"]
          created_at?: string
          denial_reason?: string | null
          expires_at?: string | null
          id?: string
          mission_id?: string
          notes?: string | null
          reference_number?: string | null
          requested_altitude_ft?: number | null
          status?: Database["public"]["Enums"]["authorization_status"]
          submitted_at?: string | null
          submitted_via?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorization_requests_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "drone_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorization_requests_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      batteries: {
        Row: {
          aircraft_id: string | null
          capacity_mah: number
          created_at: string
          cycle_count: number
          health_percentage: number
          id: string
          model: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string
          status: string
          updated_at: string
        }
        Insert: {
          aircraft_id?: string | null
          capacity_mah: number
          created_at?: string
          cycle_count?: number
          health_percentage?: number
          id?: string
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          aircraft_id?: string | null
          capacity_mah?: number
          created_at?: string
          cycle_count?: number
          health_percentage?: number
          id?: string
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batteries_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      controllers: {
        Row: {
          created_at: string
          firmware_version: string | null
          id: string
          model: string
          notes: string | null
          paired_aircraft_id: string | null
          serial_number: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          firmware_version?: string | null
          id?: string
          model: string
          notes?: string | null
          paired_aircraft_id?: string | null
          serial_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          firmware_version?: string | null
          id?: string
          model?: string
          notes?: string | null
          paired_aircraft_id?: string | null
          serial_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controllers_paired_aircraft_id_fkey"
            columns: ["paired_aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          app_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          last_message_at: string | null
          status: string
          subject: string
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          last_message_at?: string | null
          status?: string
          subject: string
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          last_message_at?: string | null
          status?: string
          subject?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          client_type: string | null
          company_name: string | null
          created_at: string | null
          email: string
          historical_qa_overrides: number | null
          id: string
          is_retainer: boolean
          name: string
          notes: string | null
          phone: string | null
          qa_specific_requirements: string[] | null
          qa_threshold_adjustment: number | null
          retainer_credits_remaining: number
          square_customer_id: string | null
          state: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_type?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          historical_qa_overrides?: number | null
          id?: string
          is_retainer?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          qa_specific_requirements?: string[] | null
          qa_threshold_adjustment?: number | null
          retainer_credits_remaining?: number
          square_customer_id?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_type?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          historical_qa_overrides?: number | null
          id?: string
          is_retainer?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          qa_specific_requirements?: string[] | null
          qa_threshold_adjustment?: number | null
          retainer_credits_remaining?: number
          square_customer_id?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          active: boolean
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          output_format: string
          schema: Json
          template_config: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          output_format?: string
          schema?: Json
          template_config?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          output_format?: string
          schema?: Json
          template_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      drone_assets: {
        Row: {
          camera_model: string | null
          capture_date: string | null
          compass_direction: string | null
          created_at: string
          exif_data: Json | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          gps_altitude: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          job_id: string
          mime_type: string | null
          processed_path: string | null
          processing_status: string | null
          qa_analyzed_at: string | null
          qa_override: boolean | null
          qa_override_by: string | null
          qa_override_reason: string | null
          qa_results: Json | null
          qa_score: number | null
          qa_status: Database["public"]["Enums"]["qa_status"] | null
          sort_order: number | null
          thumbnail_url: string | null
          updated_at: string
          video_bitrate: number | null
          video_codec: string | null
          video_duration_seconds: number | null
          video_fps: number | null
          video_resolution: string | null
        }
        Insert: {
          camera_model?: string | null
          capture_date?: string | null
          compass_direction?: string | null
          created_at?: string
          exif_data?: Json | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          gps_altitude?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          job_id: string
          mime_type?: string | null
          processed_path?: string | null
          processing_status?: string | null
          qa_analyzed_at?: string | null
          qa_override?: boolean | null
          qa_override_by?: string | null
          qa_override_reason?: string | null
          qa_results?: Json | null
          qa_score?: number | null
          qa_status?: Database["public"]["Enums"]["qa_status"] | null
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          video_bitrate?: number | null
          video_codec?: string | null
          video_duration_seconds?: number | null
          video_fps?: number | null
          video_resolution?: string | null
        }
        Update: {
          camera_model?: string | null
          capture_date?: string | null
          compass_direction?: string | null
          created_at?: string
          exif_data?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          gps_altitude?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          job_id?: string
          mime_type?: string | null
          processed_path?: string | null
          processing_status?: string | null
          qa_analyzed_at?: string | null
          qa_override?: boolean | null
          qa_override_by?: string | null
          qa_override_reason?: string | null
          qa_results?: Json | null
          qa_score?: number | null
          qa_status?: Database["public"]["Enums"]["qa_status"] | null
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          video_bitrate?: number | null
          video_codec?: string | null
          video_duration_seconds?: number | null
          video_fps?: number | null
          video_resolution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drone_assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "drone_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_deliverables: {
        Row: {
          created_at: string
          description: string | null
          download_count: number | null
          download_expires_at: string | null
          download_url: string | null
          file_count: number | null
          file_paths: string[] | null
          id: string
          job_id: string
          last_downloaded_at: string | null
          name: string
          total_size_bytes: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          download_count?: number | null
          download_expires_at?: string | null
          download_url?: string | null
          file_count?: number | null
          file_paths?: string[] | null
          id?: string
          job_id: string
          last_downloaded_at?: string | null
          name: string
          total_size_bytes?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          download_count?: number | null
          download_expires_at?: string | null
          download_url?: string | null
          file_count?: number | null
          file_paths?: string[] | null
          id?: string
          job_id?: string
          last_downloaded_at?: string | null
          name?: string
          total_size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drone_deliverables_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "drone_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_deliverables_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_engagements: {
        Row: {
          actual_revenue: number | null
          cost: number | null
          created_at: string
          delivery_date: string | null
          engagement_date: string
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          id: string
          internal_notes: string | null
          lead_id: string
          notes: string | null
          photo_count: number | null
          property_address: string | null
          quoted_price: number | null
          satisfaction_score: number | null
          status: Database["public"]["Enums"]["engagement_status"]
          updated_at: string
          video_count: number | null
        }
        Insert: {
          actual_revenue?: number | null
          cost?: number | null
          created_at?: string
          delivery_date?: string | null
          engagement_date: string
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          id?: string
          internal_notes?: string | null
          lead_id: string
          notes?: string | null
          photo_count?: number | null
          property_address?: string | null
          quoted_price?: number | null
          satisfaction_score?: number | null
          status?: Database["public"]["Enums"]["engagement_status"]
          updated_at?: string
          video_count?: number | null
        }
        Update: {
          actual_revenue?: number | null
          cost?: number | null
          created_at?: string
          delivery_date?: string | null
          engagement_date?: string
          engagement_type?: Database["public"]["Enums"]["engagement_type"]
          id?: string
          internal_notes?: string | null
          lead_id?: string
          notes?: string | null
          photo_count?: number | null
          property_address?: string | null
          quoted_price?: number | null
          satisfaction_score?: number | null
          status?: Database["public"]["Enums"]["engagement_status"]
          updated_at?: string
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drone_engagements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "drone_client_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_engagements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "drone_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_jobs: {
        Row: {
          admin_notes: string | null
          aircraft_id: string | null
          completed_at: string | null
          construction_context: Json | null
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          delivery_notes: string | null
          delivery_token: string | null
          delivery_token_created_at: string | null
          download_url: string | null
          id: string
          is_rush: boolean
          job_number: string
          job_price: number | null
          latitude: number | null
          longitude: number | null
          package_id: string | null
          pilot_id: string | null
          pilot_notes: string | null
          property_address: string
          property_city: string | null
          property_state: string | null
          property_type: string
          property_zip: string | null
          qa_batch_context: Json | null
          qa_score: number | null
          qa_summary: Json | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_request_id: string | null
          status: Database["public"]["Enums"]["drone_job_status"]
          updated_at: string
          upload_token: string | null
          upload_token_expires_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          aircraft_id?: string | null
          completed_at?: string | null
          construction_context?: Json | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_token?: string | null
          delivery_token_created_at?: string | null
          download_url?: string | null
          id?: string
          is_rush?: boolean
          job_number: string
          job_price?: number | null
          latitude?: number | null
          longitude?: number | null
          package_id?: string | null
          pilot_id?: string | null
          pilot_notes?: string | null
          property_address: string
          property_city?: string | null
          property_state?: string | null
          property_type?: string
          property_zip?: string | null
          qa_batch_context?: Json | null
          qa_score?: number | null
          qa_summary?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_request_id?: string | null
          status?: Database["public"]["Enums"]["drone_job_status"]
          updated_at?: string
          upload_token?: string | null
          upload_token_expires_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          aircraft_id?: string | null
          completed_at?: string | null
          construction_context?: Json | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_token?: string | null
          delivery_token_created_at?: string | null
          download_url?: string | null
          id?: string
          is_rush?: boolean
          job_number?: string
          job_price?: number | null
          latitude?: number | null
          longitude?: number | null
          package_id?: string | null
          pilot_id?: string | null
          pilot_notes?: string | null
          property_address?: string
          property_city?: string | null
          property_state?: string | null
          property_type?: string
          property_zip?: string | null
          qa_batch_context?: Json | null
          qa_score?: number | null
          qa_summary?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_request_id?: string | null
          status?: Database["public"]["Enums"]["drone_job_status"]
          updated_at?: string
          upload_token?: string | null
          upload_token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drone_jobs_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_jobs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "drone_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_jobs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_jobs_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_jobs_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_leads: {
        Row: {
          address: string | null
          ai_email_body: string | null
          ai_email_subject: string | null
          city: string | null
          company_name: string
          created_at: string
          email: string | null
          email_status: string | null
          estimated_portfolio_size: number | null
          google_rating: number | null
          hunter_io_score: number | null
          id: string
          internal_notes: string | null
          notes: string | null
          phone: string | null
          portfolio_type: string | null
          priority: string | null
          review_count: number | null
          serper_place_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          ai_email_body?: string | null
          ai_email_subject?: string | null
          city?: string | null
          company_name: string
          created_at?: string
          email?: string | null
          email_status?: string | null
          estimated_portfolio_size?: number | null
          google_rating?: number | null
          hunter_io_score?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          phone?: string | null
          portfolio_type?: string | null
          priority?: string | null
          review_count?: number | null
          serper_place_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          ai_email_body?: string | null
          ai_email_subject?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          email_status?: string | null
          estimated_portfolio_size?: number | null
          google_rating?: number | null
          hunter_io_score?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          phone?: string | null
          portfolio_type?: string | null
          priority?: string | null
          review_count?: number | null
          serper_place_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      drone_packages: {
        Row: {
          active: boolean
          category: string
          code: string
          created_at: string
          description: string | null
          edit_budget_minutes: number
          features: string[] | null
          id: string
          name: string
          price: number
          processing_profile: Json | null
          requirements: Json | null
          reshoot_tolerance: string
          shot_manifest: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          created_at?: string
          description?: string | null
          edit_budget_minutes?: number
          features?: string[] | null
          id?: string
          name: string
          price: number
          processing_profile?: Json | null
          requirements?: Json | null
          reshoot_tolerance?: string
          shot_manifest?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          edit_budget_minutes?: number
          features?: string[] | null
          id?: string
          name?: string
          price?: number
          processing_profile?: Json | null
          requirements?: Json | null
          reshoot_tolerance?: string
          shot_manifest?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      email_tracking: {
        Row: {
          body: string
          click_count: number | null
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string
          open_count: number | null
          opened_at: string | null
          recipient_email: string
          sent_at: string
          status: string
          subject: string
          tracking_id: string
        }
        Insert: {
          body: string
          click_count?: number | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id: string
          open_count?: number | null
          opened_at?: string | null
          recipient_email: string
          sent_at?: string
          status?: string
          subject: string
          tracking_id?: string
        }
        Update: {
          body?: string
          click_count?: number | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          open_count?: number | null
          opened_at?: string | null
          recipient_email?: string
          sent_at?: string
          status?: string
          subject?: string
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "drone_client_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_tracking_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "drone_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_logs: {
        Row: {
          checklist_data: Json
          created_at: string
          device_id: string | null
          flight_timestamp: string
          id: string
          mission_id: string
          pilot_id: string
        }
        Insert: {
          checklist_data: Json
          created_at?: string
          device_id?: string | null
          flight_timestamp?: string
          id?: string
          mission_id: string
          pilot_id: string
        }
        Update: {
          checklist_data?: Json
          created_at?: string
          device_id?: string | null
          flight_timestamp?: string
          id?: string
          mission_id?: string
          pilot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_logs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "drone_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          created_at: string
          download_count: number | null
          downloaded_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          input_data: Json | null
          metadata: Json | null
          output_format: string
          template_code: string
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          download_count?: number | null
          downloaded_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          input_data?: Json | null
          metadata?: Json | null
          output_format: string
          template_code: string
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          download_count?: number | null
          downloaded_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          input_data?: Json | null
          metadata?: Json | null
          output_format?: string
          template_code?: string
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_gen_jobs: {
        Row: {
          ai_drafts_generated: number | null
          completed_at: string | null
          created_at: string
          duplicates_filtered: number | null
          emails_found: number | null
          error_details: Json | null
          error_message: string | null
          hunter_io_cost: number | null
          id: string
          job_type: string
          leads_created: number | null
          openai_cost: number | null
          raw_results_found: number | null
          search_config: Json | null
          searches_performed: number | null
          serper_cost: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["lead_gen_job_status"]
        }
        Insert: {
          ai_drafts_generated?: number | null
          completed_at?: string | null
          created_at?: string
          duplicates_filtered?: number | null
          emails_found?: number | null
          error_details?: Json | null
          error_message?: string | null
          hunter_io_cost?: number | null
          id?: string
          job_type?: string
          leads_created?: number | null
          openai_cost?: number | null
          raw_results_found?: number | null
          search_config?: Json | null
          searches_performed?: number | null
          serper_cost?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["lead_gen_job_status"]
        }
        Update: {
          ai_drafts_generated?: number | null
          completed_at?: string | null
          created_at?: string
          duplicates_filtered?: number | null
          emails_found?: number | null
          error_details?: Json | null
          error_message?: string | null
          hunter_io_cost?: number | null
          id?: string
          job_type?: string
          leads_created?: number | null
          openai_cost?: number | null
          raw_results_found?: number | null
          search_config?: Json | null
          searches_performed?: number | null
          serper_cost?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["lead_gen_job_status"]
        }
        Relationships: []
      }
      maintenance_announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          message: string
          priority: number | null
          starts_at: string
          target_all_apps: boolean | null
          target_app_ids: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          priority?: number | null
          starts_at?: string
          target_all_apps?: boolean | null
          target_app_ids?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          priority?: number | null
          starts_at?: string
          target_all_apps?: boolean | null
          target_app_ids?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_log: {
        Row: {
          cost_cents: number | null
          created_at: string
          description: string | null
          equipment_id: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          next_due_date: string | null
          notes: string | null
          parts_used: string[] | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          cost_cents?: number | null
          created_at?: string
          description?: string | null
          equipment_id: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id?: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          next_due_date?: string | null
          notes?: string | null
          parts_used?: string[] | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          cost_cents?: number | null
          created_at?: string
          description?: string | null
          equipment_id?: string
          equipment_type?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          maintenance_type?: Database["public"]["Enums"]["maintenance_type"]
          next_due_date?: string | null
          notes?: string | null
          parts_used?: string[] | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          affected_features: string[] | null
          app_id: string | null
          created_at: string
          description: string
          hours: number
          id: string
          module: string | null
          ticket_id: string | null
          type: string
        }
        Insert: {
          affected_features?: string[] | null
          app_id?: string | null
          created_at?: string
          description: string
          hours: number
          id?: string
          module?: string | null
          ticket_id?: string | null
          type: string
        }
        Update: {
          affected_features?: string[] | null
          app_id?: string | null
          created_at?: string
          description?: string
          hours?: number
          id?: string
          module?: string | null
          ticket_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          actual_behavior: string | null
          app_id: string | null
          assigned_to: string | null
          browser_info: Json | null
          category: string | null
          created_at: string
          description: string
          error_stack: string | null
          expected_behavior: string | null
          external_reference: string | null
          id: string
          page_url: string | null
          priority: string
          reporter_email: string | null
          reporter_name: string | null
          resolution: string | null
          resolved_at: string | null
          screenshot_url: string | null
          source: string | null
          status: string
          steps_to_reproduce: string | null
          submitted_via: string | null
          tags: string[] | null
          ticket_number: string
          time_spent_hours: number | null
          title: string
          type: string
          updated_at: string
          url: string | null
          user_agent: string | null
        }
        Insert: {
          actual_behavior?: string | null
          app_id?: string | null
          assigned_to?: string | null
          browser_info?: Json | null
          category?: string | null
          created_at?: string
          description: string
          error_stack?: string | null
          expected_behavior?: string | null
          external_reference?: string | null
          id?: string
          page_url?: string | null
          priority?: string
          reporter_email?: string | null
          reporter_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          source?: string | null
          status?: string
          steps_to_reproduce?: string | null
          submitted_via?: string | null
          tags?: string[] | null
          ticket_number: string
          time_spent_hours?: number | null
          title: string
          type: string
          updated_at?: string
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          actual_behavior?: string | null
          app_id?: string | null
          assigned_to?: string | null
          browser_info?: Json | null
          category?: string | null
          created_at?: string
          description?: string
          error_stack?: string | null
          expected_behavior?: string | null
          external_reference?: string | null
          id?: string
          page_url?: string | null
          priority?: string
          reporter_email?: string | null
          reporter_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          source?: string | null
          status?: string
          steps_to_reproduce?: string | null
          submitted_via?: string | null
          tags?: string[] | null
          ticket_number?: string
          time_spent_hours?: number | null
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          email_sent_at: string | null
          id: string
          read_at: string | null
          sender_id: string | null
          sender_name: string
          sender_type: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name: string
          sender_type: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_authorizations: {
        Row: {
          active_tfrs: Json | null
          airspace_class: string | null
          created_at: string
          determination_notes: string | null
          id: string
          is_zero_grid: boolean
          max_approved_altitude_ft: number | null
          mission_id: string
          requirements_checklist: Json | null
          requires_laanc: boolean
          updated_at: string
        }
        Insert: {
          active_tfrs?: Json | null
          airspace_class?: string | null
          created_at?: string
          determination_notes?: string | null
          id?: string
          is_zero_grid?: boolean
          max_approved_altitude_ft?: number | null
          mission_id: string
          requirements_checklist?: Json | null
          requires_laanc?: boolean
          updated_at?: string
        }
        Update: {
          active_tfrs?: Json | null
          airspace_class?: string | null
          created_at?: string
          determination_notes?: string | null
          id?: string
          is_zero_grid?: boolean
          max_approved_altitude_ft?: number | null
          mission_id?: string
          requirements_checklist?: Json | null
          requires_laanc?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_authorizations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "drone_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_authorizations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_equipment: {
        Row: {
          aircraft_id: string
          battery_ids: string[] | null
          controller_id: string | null
          created_at: string
          id: string
          mission_id: string
          notes: string | null
        }
        Insert: {
          aircraft_id: string
          battery_ids?: string[] | null
          controller_id?: string | null
          created_at?: string
          id?: string
          mission_id: string
          notes?: string | null
        }
        Update: {
          aircraft_id?: string
          battery_ids?: string[] | null
          controller_id?: string | null
          created_at?: string
          id?: string
          mission_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_equipment_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_equipment_controller_id_fkey"
            columns: ["controller_id"]
            isOneToOne: false
            referencedRelation: "controllers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_equipment_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "drone_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_equipment_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_weather_logs: {
        Row: {
          altimeter_inhg: number | null
          briefing_timestamp: string
          cloud_ceiling_ft: number | null
          created_at: string
          determination: Database["public"]["Enums"]["weather_determination"]
          determination_reasons: string[] | null
          dewpoint_c: number | null
          id: string
          kp_index: number | null
          metar_raw: string | null
          metar_station: string | null
          mission_id: string
          override_approved_by: string | null
          override_reason: string | null
          pilot_override: boolean
          precipitation_probability: number | null
          temperature_c: number | null
          visibility_sm: number | null
          wind_direction_deg: number | null
          wind_gust_ms: number | null
          wind_speed_ms: number | null
        }
        Insert: {
          altimeter_inhg?: number | null
          briefing_timestamp?: string
          cloud_ceiling_ft?: number | null
          created_at?: string
          determination: Database["public"]["Enums"]["weather_determination"]
          determination_reasons?: string[] | null
          dewpoint_c?: number | null
          id?: string
          kp_index?: number | null
          metar_raw?: string | null
          metar_station?: string | null
          mission_id: string
          override_approved_by?: string | null
          override_reason?: string | null
          pilot_override?: boolean
          precipitation_probability?: number | null
          temperature_c?: number | null
          visibility_sm?: number | null
          wind_direction_deg?: number | null
          wind_gust_ms?: number | null
          wind_speed_ms?: number | null
        }
        Update: {
          altimeter_inhg?: number | null
          briefing_timestamp?: string
          cloud_ceiling_ft?: number | null
          created_at?: string
          determination?: Database["public"]["Enums"]["weather_determination"]
          determination_reasons?: string[] | null
          dewpoint_c?: number | null
          id?: string
          kp_index?: number | null
          metar_raw?: string | null
          metar_station?: string | null
          mission_id?: string
          override_approved_by?: string | null
          override_reason?: string | null
          pilot_override?: boolean
          precipitation_probability?: number | null
          temperature_c?: number | null
          visibility_sm?: number | null
          wind_direction_deg?: number | null
          wind_gust_ms?: number | null
          wind_speed_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_weather_logs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "drone_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_weather_logs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_weather_logs_override_approved_by_fkey"
            columns: ["override_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          app_id: string | null
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_email: string
        }
        Insert: {
          app_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_email: string
        }
        Update: {
          app_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_color: string | null
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_color?: string | null
          product_id: string
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_color?: string | null
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          notes: string | null
          shipping: number | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_state: string | null
          shipping_zip: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          shipping?: number | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          shipping?: number | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_log: {
        Row: {
          contact_method: Database["public"]["Enums"]["outreach_contact_method"]
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["outreach_outcome"] | null
        }
        Insert: {
          contact_method: Database["public"]["Enums"]["outreach_contact_method"]
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["outreach_outcome"] | null
        }
        Update: {
          contact_method?: Database["public"]["Enums"]["outreach_contact_method"]
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["outreach_outcome"] | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "drone_client_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "drone_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      product_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          notified_at: string | null
          product_id: string
          product_name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          product_id: string
          product_name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          product_id?: string
          product_name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category: string
          color: string
          coming_soon: boolean
          created_at: string
          description: string
          features: string[]
          id: string
          image: string
          name: string
          original_price: number | null
          price: number
          sizes: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          color: string
          coming_soon?: boolean
          created_at?: string
          description: string
          features?: string[]
          id?: string
          image: string
          name: string
          original_price?: number | null
          price: number
          sizes?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          color?: string
          coming_soon?: boolean
          created_at?: string
          description?: string
          features?: string[]
          id?: string
          image?: string
          name?: string
          original_price?: number | null
          price?: number
          sizes?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          part_107_expiry: string | null
          part_107_number: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          part_107_expiry?: string | null
          part_107_number?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          part_107_expiry?: string | null
          part_107_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          admin_notes: string | null
          approval_token: string
          approved_at: string | null
          created_at: string | null
          customer_notes: string | null
          declined_at: string | null
          deliverables: Json | null
          discount: number | null
          id: string
          pricing_items: Json | null
          proposal_number: string
          scope_of_work: string
          sent_at: string | null
          service_request_id: string
          status: Database["public"]["Enums"]["proposal_status"] | null
          subtotal: number
          terms_and_conditions: string | null
          title: string
          total: number
          updated_at: string | null
          valid_until: string
          viewed_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approval_token: string
          approved_at?: string | null
          created_at?: string | null
          customer_notes?: string | null
          declined_at?: string | null
          deliverables?: Json | null
          discount?: number | null
          id?: string
          pricing_items?: Json | null
          proposal_number: string
          scope_of_work: string
          sent_at?: string | null
          service_request_id: string
          status?: Database["public"]["Enums"]["proposal_status"] | null
          subtotal?: number
          terms_and_conditions?: string | null
          title: string
          total?: number
          updated_at?: string | null
          valid_until: string
          viewed_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approval_token?: string
          approved_at?: string | null
          created_at?: string | null
          customer_notes?: string | null
          declined_at?: string | null
          deliverables?: Json | null
          discount?: number | null
          id?: string
          pricing_items?: Json | null
          proposal_number?: string
          scope_of_work?: string
          sent_at?: string | null
          service_request_id?: string
          status?: Database["public"]["Enums"]["proposal_status"] | null
          subtotal?: number
          terms_and_conditions?: string | null
          title?: string
          total?: number
          updated_at?: string | null
          valid_until?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          admin_notes: string | null
          budget_range: string | null
          client_email: string
          client_name: string
          client_phone: string
          company_name: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          project_description: string
          project_title: string | null
          service_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          target_end_date: string | null
          target_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          budget_range?: string | null
          client_email: string
          client_name: string
          client_phone: string
          company_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          project_description: string
          project_title?: string | null
          service_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          target_end_date?: string | null
          target_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          budget_range?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string
          company_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          project_description?: string
          project_title?: string | null
          service_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          target_end_date?: string | null
          target_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          category: string
          code: string
          created_at: string | null
          detailed_description: string | null
          id: string
          name: string
          packages: Json | null
          page_route: string | null
          pricing_unit: Database["public"]["Enums"]["pricing_unit"] | null
          short_description: string | null
          starting_price: number | null
        }
        Insert: {
          active?: boolean | null
          category: string
          code: string
          created_at?: string | null
          detailed_description?: string | null
          id?: string
          name: string
          packages?: Json | null
          page_route?: string | null
          pricing_unit?: Database["public"]["Enums"]["pricing_unit"] | null
          short_description?: string | null
          starting_price?: number | null
        }
        Update: {
          active?: boolean | null
          category?: string
          code?: string
          created_at?: string | null
          detailed_description?: string | null
          id?: string
          name?: string
          packages?: Json | null
          page_route?: string | null
          pricing_unit?: Database["public"]["Enums"]["pricing_unit"] | null
          short_description?: string | null
          starting_price?: number | null
        }
        Relationships: []
      }
      tfr_cache: {
        Row: {
          ceiling_ft: number | null
          center_latitude: number | null
          center_longitude: number | null
          created_at: string
          description: string | null
          effective_end: string | null
          effective_start: string | null
          fetched_at: string
          floor_ft: number | null
          id: string
          notam_number: string
          radius_nm: number | null
          raw_data: Json | null
          status: Database["public"]["Enums"]["tfr_status"]
          tfr_type: string | null
          updated_at: string
        }
        Insert: {
          ceiling_ft?: number | null
          center_latitude?: number | null
          center_longitude?: number | null
          created_at?: string
          description?: string | null
          effective_end?: string | null
          effective_start?: string | null
          fetched_at?: string
          floor_ft?: number | null
          id?: string
          notam_number: string
          radius_nm?: number | null
          raw_data?: Json | null
          status?: Database["public"]["Enums"]["tfr_status"]
          tfr_type?: string | null
          updated_at?: string
        }
        Update: {
          ceiling_ft?: number | null
          center_latitude?: number | null
          center_longitude?: number | null
          created_at?: string
          description?: string | null
          effective_end?: string | null
          effective_start?: string | null
          fetched_at?: string
          floor_ft?: number | null
          id?: string
          notam_number?: string
          radius_nm?: number | null
          raw_data?: Json | null
          status?: Database["public"]["Enums"]["tfr_status"]
          tfr_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weather_thresholds: {
        Row: {
          aircraft_model: string | null
          created_at: string
          id: string
          is_part_107_minimum: boolean
          label: string
          max_kp_index: number | null
          max_precip_probability: number | null
          max_temp_c: number | null
          max_wind_speed_ms: number | null
          min_cloud_ceiling_ft: number | null
          min_temp_c: number | null
          min_visibility_sm: number | null
          notes: string | null
          package_type: string | null
          updated_at: string
        }
        Insert: {
          aircraft_model?: string | null
          created_at?: string
          id?: string
          is_part_107_minimum?: boolean
          label: string
          max_kp_index?: number | null
          max_precip_probability?: number | null
          max_temp_c?: number | null
          max_wind_speed_ms?: number | null
          min_cloud_ceiling_ft?: number | null
          min_temp_c?: number | null
          min_visibility_sm?: number | null
          notes?: string | null
          package_type?: string | null
          updated_at?: string
        }
        Update: {
          aircraft_model?: string | null
          created_at?: string
          id?: string
          is_part_107_minimum?: boolean
          label?: string
          max_kp_index?: number | null
          max_precip_probability?: number | null
          max_temp_c?: number | null
          max_wind_speed_ms?: number | null
          min_cloud_ceiling_ft?: number | null
          min_temp_c?: number | null
          min_visibility_sm?: number | null
          notes?: string | null
          package_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_status: string | null
          ends_at: string | null
          id: string | null
          is_active: boolean | null
          message: string | null
          priority: number | null
          starts_at: string | null
          target_all_apps: boolean | null
          target_app_ids: string[] | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_status?: never
          ends_at?: string | null
          id?: string | null
          is_active?: boolean | null
          message?: string | null
          priority?: number | null
          starts_at?: string | null
          target_all_apps?: boolean | null
          target_app_ids?: string[] | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_status?: never
          ends_at?: string | null
          id?: string | null
          is_active?: boolean | null
          message?: string | null
          priority?: number | null
          starts_at?: string | null
          target_all_apps?: boolean | null
          target_app_ids?: string[] | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_status_overview: {
        Row: {
          active: boolean | null
          api_key_created_at: string | null
          code: string | null
          consecutive_failures: number | null
          has_api_key: boolean | null
          heartbeat_status: string | null
          id: string | null
          last_heartbeat_at: string | null
          name: string | null
          open_ticket_count: number | null
          status: string | null
          url: string | null
          version: string | null
        }
        Insert: {
          active?: boolean | null
          api_key_created_at?: string | null
          code?: string | null
          consecutive_failures?: number | null
          has_api_key?: never
          heartbeat_status?: never
          id?: string | null
          last_heartbeat_at?: string | null
          name?: string | null
          open_ticket_count?: never
          status?: string | null
          url?: string | null
          version?: string | null
        }
        Update: {
          active?: boolean | null
          api_key_created_at?: string | null
          code?: string | null
          consecutive_failures?: number | null
          has_api_key?: never
          heartbeat_status?: never
          id?: string | null
          last_heartbeat_at?: string | null
          name?: string | null
          open_ticket_count?: never
          status?: string | null
          url?: string | null
          version?: string | null
        }
        Relationships: []
      }
      drone_client_summary: {
        Row: {
          avg_satisfaction: number | null
          city: string | null
          company_name: string | null
          engagements_this_month: number | null
          id: string | null
          last_engagement: string | null
          next_scheduled: string | null
          portfolio_type: string | null
          total_engagements: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      drone_pipeline_summary: {
        Row: {
          count: number | null
          new_this_week: number | null
          status: Database["public"]["Enums"]["lead_status"] | null
          with_email: number | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string | null
          delivered_at: string | null
          download_url: string | null
          id: string | null
          job_number: string | null
          package_id: string | null
          project_name: string | null
          qa_score: number | null
          scheduled_date: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drone_jobs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "drone_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_jobs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean | null
          category: string | null
          code: string | null
          description: string | null
          edit_budget_minutes: number | null
          features: string[] | null
          id: string | null
          name: string | null
          price: number | null
          processing_profile: Json | null
          shot_manifest: Json | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          code?: string | null
          description?: string | null
          edit_budget_minutes?: number | null
          features?: string[] | null
          id?: string | null
          name?: string | null
          price?: number | null
          processing_profile?: Json | null
          shot_manifest?: Json | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          code?: string | null
          description?: string | null
          edit_budget_minutes?: number | null
          features?: string[] | null
          id?: string | null
          name?: string | null
          price?: number | null
          processing_profile?: Json | null
          shot_manifest?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_app_api_key: { Args: { p_app_id: string }; Returns: string }
      generate_drone_job_number: { Args: never; Returns: string }
      generate_proposal_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_app_announcements: {
        Args: { p_app_id: string }
        Returns: {
          ends_at: string
          id: string
          message: string
          priority: number
          starts_at: string
          title: string
          type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_flight: {
        Args: {
          p_aircraft_id: string
          p_battery_ids: string[]
          p_flight_hours: number
        }
        Returns: undefined
      }
      record_app_heartbeat: {
        Args: {
          p_app_id: string
          p_metrics?: Json
          p_response_time_ms?: number
          p_status?: string
          p_version?: string
        }
        Returns: boolean
      }
      revoke_app_api_key: { Args: { p_app_id: string }; Returns: boolean }
      validate_api_key: {
        Args: { p_api_key: string }
        Returns: {
          app_code: string
          app_id: string
          app_name: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      accessory_type:
        | "filter"
        | "lens"
        | "propeller"
        | "case"
        | "charger"
        | "antenna"
        | "mount"
        | "other"
      app_role: "admin" | "user" | "pilot"
      authorization_status:
        | "not_started"
        | "pending"
        | "auto_approved"
        | "manual_review"
        | "approved"
        | "denied"
        | "expired"
        | "cancelled"
      authorization_type: "laanc" | "caps" | "coa" | "waiver" | "none_required"
      batch_recommendation:
        | "deliver_as_planned"
        | "extended_processing"
        | "partial_reshoot"
        | "full_reshoot"
        | "incomplete_package"
      contact_method: "email" | "phone" | "text"
      drone_job_status:
        | "intake"
        | "scheduled"
        | "captured"
        | "uploaded"
        | "processing"
        | "review_pending"
        | "qa"
        | "revision"
        | "delivered"
        | "cancelled"
      engagement_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      engagement_type:
        | "turnover"
        | "inspection"
        | "quarterly"
        | "project"
        | "storm"
        | "marketing"
      equipment_type: "aircraft" | "battery" | "controller" | "accessory"
      lead_gen_job_status: "pending" | "running" | "completed" | "failed"
      lead_status: "new" | "contacted" | "responded" | "qualified" | "client"
      maintenance_type:
        | "scheduled"
        | "unscheduled"
        | "repair"
        | "inspection"
        | "firmware_update"
        | "calibration"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      outreach_contact_method:
        | "email"
        | "call"
        | "linkedin"
        | "meeting"
        | "other"
      outreach_outcome:
        | "no_answer"
        | "voicemail"
        | "spoke"
        | "email_sent"
        | "meeting_scheduled"
        | "not_interested"
      pricing_unit:
        | "per_project"
        | "per_hour"
        | "per_session"
        | "per_month"
        | "per_video"
        | "per_event"
        | "starting_at"
      proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "approved"
        | "declined"
        | "expired"
        | "revision_requested"
      qa_recommendation: "pass" | "warning" | "fail"
      qa_status:
        | "pending"
        | "analyzing"
        | "passed"
        | "warning"
        | "failed"
        | "approved"
        | "rejected"
      request_status:
        | "new"
        | "contacted"
        | "scoping"
        | "quoted"
        | "closed"
        | "declined"
      tfr_status: "active" | "scheduled" | "expired" | "cancelled"
      weather_determination: "GO" | "CAUTION" | "NO_GO"
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
    Enums: {
      accessory_type: [
        "filter",
        "lens",
        "propeller",
        "case",
        "charger",
        "antenna",
        "mount",
        "other",
      ],
      app_role: ["admin", "user", "pilot"],
      authorization_status: [
        "not_started",
        "pending",
        "auto_approved",
        "manual_review",
        "approved",
        "denied",
        "expired",
        "cancelled",
      ],
      authorization_type: ["laanc", "caps", "coa", "waiver", "none_required"],
      batch_recommendation: [
        "deliver_as_planned",
        "extended_processing",
        "partial_reshoot",
        "full_reshoot",
        "incomplete_package",
      ],
      contact_method: ["email", "phone", "text"],
      drone_job_status: [
        "intake",
        "scheduled",
        "captured",
        "uploaded",
        "processing",
        "review_pending",
        "qa",
        "revision",
        "delivered",
        "cancelled",
      ],
      engagement_status: ["scheduled", "in_progress", "completed", "cancelled"],
      engagement_type: [
        "turnover",
        "inspection",
        "quarterly",
        "project",
        "storm",
        "marketing",
      ],
      equipment_type: ["aircraft", "battery", "controller", "accessory"],
      lead_gen_job_status: ["pending", "running", "completed", "failed"],
      lead_status: ["new", "contacted", "responded", "qualified", "client"],
      maintenance_type: [
        "scheduled",
        "unscheduled",
        "repair",
        "inspection",
        "firmware_update",
        "calibration",
      ],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      outreach_contact_method: [
        "email",
        "call",
        "linkedin",
        "meeting",
        "other",
      ],
      outreach_outcome: [
        "no_answer",
        "voicemail",
        "spoke",
        "email_sent",
        "meeting_scheduled",
        "not_interested",
      ],
      pricing_unit: [
        "per_project",
        "per_hour",
        "per_session",
        "per_month",
        "per_video",
        "per_event",
        "starting_at",
      ],
      proposal_status: [
        "draft",
        "sent",
        "viewed",
        "approved",
        "declined",
        "expired",
        "revision_requested",
      ],
      qa_recommendation: ["pass", "warning", "fail"],
      qa_status: [
        "pending",
        "analyzing",
        "passed",
        "warning",
        "failed",
        "approved",
        "rejected",
      ],
      request_status: [
        "new",
        "contacted",
        "scoping",
        "quoted",
        "closed",
        "declined",
      ],
      tfr_status: ["active", "scheduled", "expired", "cancelled"],
      weather_determination: ["GO", "CAUTION", "NO_GO"],
    },
  },
} as const
