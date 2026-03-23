export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: "admin" | "sales_rep" | "warehouse" | "accountant";
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: "admin" | "sales_rep" | "warehouse" | "accountant";
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          role?: "admin" | "sales_rep" | "warehouse" | "accountant";
          phone?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          city: string | null;
          district: string | null;
          address: string | null;
          tax_number: string | null;
          tax_office: string | null;
          segment: "lead" | "active" | "passive";
          source: "manual" | "google_places" | "linkedin" | "facebook_lead" | "referral" | "other" | null;
          notes: string | null;
          assigned_to: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          district?: string | null;
          address?: string | null;
          tax_number?: string | null;
          tax_office?: string | null;
          segment?: "lead" | "active" | "passive";
          source?: "manual" | "google_places" | "linkedin" | "facebook_lead" | "referral" | "other" | null;
          notes?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
        };
        Update: {
          company_name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          district?: string | null;
          address?: string | null;
          tax_number?: string | null;
          tax_office?: string | null;
          segment?: "lead" | "active" | "passive";
          source?: "manual" | "google_places" | "linkedin" | "facebook_lead" | "referral" | "other" | null;
          notes?: string | null;
          assigned_to?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "customers_assigned_to_fkey"; columns: ["assigned_to"]; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "customers_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"]; }
        ];
      };
      suppliers: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          city: string | null;
          address: string | null;
          capacity_liters: number | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          address?: string | null;
          capacity_liters?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: {
          company_name?: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          address?: string | null;
          capacity_liters?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          unit: string;
          category: string | null;
          min_stock_level: number;
          current_stock: number;
          unit_cost: number | null;
          unit_price: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          description?: string | null;
          unit?: string;
          category?: string | null;
          min_stock_level?: number;
          current_stock?: number;
          unit_cost?: number | null;
          unit_price?: number | null;
          is_active?: boolean;
        };
        Update: {
          sku?: string;
          name?: string;
          description?: string | null;
          unit?: string;
          category?: string | null;
          min_stock_level?: number;
          current_stock?: number;
          unit_cost?: number | null;
          unit_price?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      production_orders: {
        Row: {
          id: string;
          order_number: string;
          supplier_id: string;
          product_id: string;
          ordered_quantity: number;
          received_quantity: number;
          unit_cost: number | null;
          status: "planned" | "in_production" | "partial_delivery" | "completed" | "cancelled";
          order_date: string;
          expected_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          supplier_id: string;
          product_id: string;
          ordered_quantity: number;
          received_quantity?: number;
          unit_cost?: number | null;
          status?: "planned" | "in_production" | "partial_delivery" | "completed" | "cancelled";
          order_date: string;
          expected_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          supplier_id?: string;
          product_id?: string;
          ordered_quantity?: number;
          received_quantity?: number;
          unit_cost?: number | null;
          status?: "planned" | "in_production" | "partial_delivery" | "completed" | "cancelled";
          order_date?: string;
          expected_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "production_orders_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"]; },
          { foreignKeyName: "production_orders_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"]; }
        ];
      };
      production_deliveries: {
        Row: {
          id: string;
          production_order_id: string;
          delivered_quantity: number;
          delivery_date: string;
          vehicle_plate: string | null;
          driver_name: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          production_order_id: string;
          delivered_quantity: number;
          delivery_date: string;
          vehicle_plate?: string | null;
          driver_name?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          delivered_quantity?: number;
          delivery_date?: string;
          vehicle_plate?: string | null;
          driver_name?: string | null;
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "production_deliveries_production_order_id_fkey"; columns: ["production_order_id"]; referencedRelation: "production_orders"; referencedColumns: ["id"]; }
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          movement_type: "in" | "out" | "adjustment";
          source_type: "production_delivery" | "sale" | "return" | "manual" | "adjustment" | null;
          source_id: string | null;
          quantity: number;
          unit_cost: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          movement_type: "in" | "out" | "adjustment";
          source_type?: "production_delivery" | "sale" | "return" | "manual" | "adjustment" | null;
          source_id?: string | null;
          quantity: number;
          unit_cost?: number | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "stock_movements_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"]; }
        ];
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          invoice_type: "purchase" | "sale";
          customer_id: string | null;
          supplier_id: string | null;
          invoice_date: string;
          due_date: string | null;
          subtotal: number;
          tax_rate: number;
          tax_amount: number;
          total_amount: number;
          paid_amount: number;
          status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          invoice_type: "purchase" | "sale";
          customer_id?: string | null;
          supplier_id?: string | null;
          invoice_date: string;
          due_date?: string | null;
          subtotal?: number;
          tax_rate?: number;
          paid_amount?: number;
          status?: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          invoice_date?: string;
          due_date?: string | null;
          subtotal?: number;
          tax_rate?: number;
          paid_amount?: number;
          status?: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "invoices_customer_id_fkey"; columns: ["customer_id"]; referencedRelation: "customers"; referencedColumns: ["id"]; },
          { foreignKeyName: "invoices_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"]; }
        ];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          product_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          product_id?: string | null;
          description: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          description?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          { foreignKeyName: "invoice_items_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"]; }
        ];
      };
      payments: {
        Row: {
          id: string;
          invoice_id: string;
          payment_date: string;
          amount: number;
          payment_method: "bank_transfer" | "cash" | "check" | "credit_card" | null;
          reference_no: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          payment_date: string;
          amount: number;
          payment_method?: "bank_transfer" | "cash" | "check" | "credit_card" | null;
          reference_no?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          payment_date?: string;
          amount?: number;
          payment_method?: "bank_transfer" | "cash" | "check" | "credit_card" | null;
          reference_no?: string | null;
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "payments_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"]; }
        ];
      };
      payment_plans: {
        Row: {
          id: string;
          invoice_id: string;
          installment_no: number;
          due_date: string;
          amount: number;
          is_paid: boolean;
          paid_date: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          installment_no: number;
          due_date: string;
          amount: number;
          is_paid?: boolean;
          paid_date?: string | null;
          notes?: string | null;
        };
        Update: {
          due_date?: string;
          amount?: number;
          is_paid?: boolean;
          paid_date?: string | null;
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "payment_plans_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"]; }
        ];
      };
      contact_logs: {
        Row: {
          id: string;
          customer_id: string;
          contact_type: "call" | "visit" | "email" | "whatsapp" | "meeting" | "other";
          direction: "inbound" | "outbound" | null;
          subject: string | null;
          notes: string | null;
          contacted_at: string;
          duration_mins: number | null;
          outcome: "interested" | "not_interested" | "follow_up" | "sale_made" | "no_answer" | "other" | null;
          next_action: string | null;
          next_action_date: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          contact_type: "call" | "visit" | "email" | "whatsapp" | "meeting" | "other";
          direction?: "inbound" | "outbound" | null;
          subject?: string | null;
          notes?: string | null;
          contacted_at?: string;
          duration_mins?: number | null;
          outcome?: "interested" | "not_interested" | "follow_up" | "sale_made" | "no_answer" | "other" | null;
          next_action?: string | null;
          next_action_date?: string | null;
          created_by?: string | null;
        };
        Update: {
          contact_type?: "call" | "visit" | "email" | "whatsapp" | "meeting" | "other";
          direction?: "inbound" | "outbound" | null;
          subject?: string | null;
          notes?: string | null;
          contacted_at?: string;
          duration_mins?: number | null;
          outcome?: "interested" | "not_interested" | "follow_up" | "sale_made" | "no_answer" | "other" | null;
          next_action?: string | null;
          next_action_date?: string | null;
        };
        Relationships: [
          { foreignKeyName: "contact_logs_customer_id_fkey"; columns: ["customer_id"]; referencedRelation: "customers"; referencedColumns: ["id"]; }
        ];
      };
      reminders: {
        Row: {
          id: string;
          customer_id: string | null;
          contact_log_id: string | null;
          assigned_to: string | null;
          title: string;
          notes: string | null;
          remind_at: string;
          is_completed: boolean;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          contact_log_id?: string | null;
          assigned_to?: string | null;
          title: string;
          notes?: string | null;
          remind_at: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_by?: string | null;
        };
        Update: {
          title?: string;
          notes?: string | null;
          remind_at?: string;
          is_completed?: boolean;
          completed_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "reminders_customer_id_fkey"; columns: ["customer_id"]; referencedRelation: "customers"; referencedColumns: ["id"]; }
        ];
      };
      leads: {
        Row: {
          id: string;
          business_name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          city: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          source: "google_places" | "linkedin" | "facebook_lead" | "manual" | "other" | null;
          source_ref_id: string | null;
          status: "new" | "contacted" | "qualified" | "converted" | "rejected";
          notes: string | null;
          converted_to: string | null;
          assigned_to: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          source?: "google_places" | "linkedin" | "facebook_lead" | "manual" | "other" | null;
          source_ref_id?: string | null;
          status?: "new" | "contacted" | "qualified" | "converted" | "rejected";
          notes?: string | null;
          converted_to?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
        };
        Update: {
          business_name?: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          source?: "google_places" | "linkedin" | "facebook_lead" | "manual" | "other" | null;
          source_ref_id?: string | null;
          status?: "new" | "contacted" | "qualified" | "converted" | "rejected";
          notes?: string | null;
          converted_to?: string | null;
          assigned_to?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "leads_converted_to_fkey"; columns: ["converted_to"]; referencedRelation: "customers"; referencedColumns: ["id"]; }
        ];
      };
      quotes: {
        Row: {
          id: string;
          customer_id: string;
          quote_number: string;
          status: string;
          valid_until: string | null;
          notes: string | null;
          subtotal: number;
          tax_rate: number;
          tax_amount: number;
          total_amount: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          quote_number: string;
          status?: string;
          valid_until?: string | null;
          notes?: string | null;
          subtotal?: number;
          tax_rate?: number;
          tax_amount?: number;
          total_amount?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          valid_until?: string | null;
          notes?: string | null;
          subtotal?: number;
          tax_rate?: number;
          tax_amount?: number;
          total_amount?: number;
        };
        Relationships: [
          { foreignKeyName: "quotes_customer_id_fkey"; columns: ["customer_id"]; referencedRelation: "customers"; referencedColumns: ["id"]; }
        ];
      };
      quote_items: {
        Row: {
          id: string;
          quote_id: string;
          product_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          discount_percent: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          quote_id: string;
          product_id?: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          discount_percent?: number;
          line_total: number;
        };
        Update: {
          description?: string;
          quantity?: number;
          unit_price?: number;
          discount_percent?: number;
          line_total?: number;
        };
        Relationships: [
          { foreignKeyName: "quote_items_quote_id_fkey"; columns: ["quote_id"]; referencedRelation: "quotes"; referencedColumns: ["id"]; }
        ];
      };
      message_templates: {
        Row: {
          id: string;
          title: string;
          channel: string;
          category: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          channel: string;
          category?: string;
          content: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          channel?: string;
          category?: string;
          content?: string;
        };
        Relationships: [];
      };
      social_posts: {
        Row: {
          id: string;
          platform: string;
          post_type: string;
          title: string;
          content: string;
          media_url: string | null;
          scheduled_at: string | null;
          published_at: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          platform: string;
          post_type?: string;
          title: string;
          content: string;
          media_url?: string | null;
          scheduled_at?: string | null;
          published_at?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          platform?: string;
          post_type?: string;
          title?: string;
          content?: string;
          media_url?: string | null;
          scheduled_at?: string | null;
          published_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      contact_sequences: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          total_steps: number;
          steps: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          total_steps: number;
          steps: Json;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          total_steps?: number;
          steps?: Json;
        };
        Relationships: [];
      };
      customer_sequences: {
        Row: {
          id: string;
          customer_id: string;
          sequence_id: string;
          started_at: string;
          current_step: number;
          status: string;
          next_contact_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          sequence_id: string;
          started_at?: string;
          current_step?: number;
          status?: string;
          next_contact_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          current_step?: number;
          status?: string;
          next_contact_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "customer_sequences_customer_id_fkey"; columns: ["customer_id"]; referencedRelation: "customers"; referencedColumns: ["id"]; },
          { foreignKeyName: "customer_sequences_sequence_id_fkey"; columns: ["sequence_id"]; referencedRelation: "contact_sequences"; referencedColumns: ["id"]; }
        ];
      };
    };
    Views: {
      customer_balance: {
        Row: {
          id: string;
          company_name: string;
          total_invoiced: number;
          total_paid: number;
          balance_due: number;
        };
        Relationships: [];
      };
      low_stock_products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          current_stock: number;
          min_stock_level: number;
          shortage: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
