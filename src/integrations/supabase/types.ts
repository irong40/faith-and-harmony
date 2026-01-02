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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      apps: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          last_health_check: string | null
          name: string
          status: string
          updated_at: string
          url: string | null
          version: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          last_health_check?: string | null
          name: string
          status?: string
          updated_at?: string
          url?: string | null
          version?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          last_health_check?: string | null
          name?: string
          status?: string
          updated_at?: string
          url?: string | null
          version?: string | null
        }
        Relationships: []
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
          company_name: string | null
          created_at: string | null
          email: string
          historical_qa_overrides: number | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          qa_specific_requirements: string[] | null
          qa_threshold_adjustment: number | null
          state: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          historical_qa_overrides?: number | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          qa_specific_requirements?: string[] | null
          qa_threshold_adjustment?: number | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          historical_qa_overrides?: number | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          qa_specific_requirements?: string[] | null
          qa_threshold_adjustment?: number | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
          construction_context: Json | null
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          delivery_notes: string | null
          delivery_token: string | null
          delivery_token_created_at: string | null
          download_url: string | null
          id: string
          job_number: string
          package_id: string | null
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
          construction_context?: Json | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_token?: string | null
          delivery_token_created_at?: string | null
          download_url?: string | null
          id?: string
          job_number: string
          package_id?: string | null
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
          construction_context?: Json | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_token?: string | null
          delivery_token_created_at?: string | null
          download_url?: string | null
          id?: string
          job_number?: string
          package_id?: string | null
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
          category: string | null
          created_at: string
          description: string
          error_stack: string | null
          expected_behavior: string | null
          id: string
          priority: string
          reporter_email: string | null
          reporter_name: string | null
          resolution: string | null
          resolved_at: string | null
          screenshot_url: string | null
          source: string | null
          status: string
          steps_to_reproduce: string | null
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
          category?: string | null
          created_at?: string
          description: string
          error_stack?: string | null
          expected_behavior?: string | null
          id?: string
          priority?: string
          reporter_email?: string | null
          reporter_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          source?: string | null
          status?: string
          steps_to_reproduce?: string | null
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
          category?: string | null
          created_at?: string
          description?: string
          error_stack?: string | null
          expected_behavior?: string | null
          id?: string
          priority?: string
          reporter_email?: string | null
          reporter_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          source?: string | null
          status?: string
          steps_to_reproduce?: string | null
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
    }
    Views: {
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
      generate_drone_job_number: { Args: never; Returns: string }
      generate_proposal_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      lead_gen_job_status: "pending" | "running" | "completed" | "failed"
      lead_status: "new" | "contacted" | "responded" | "qualified" | "client"
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
      app_role: ["admin", "user"],
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
      lead_gen_job_status: ["pending", "running", "completed", "failed"],
      lead_status: ["new", "contacted", "responded", "qualified", "client"],
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
    },
  },
} as const
