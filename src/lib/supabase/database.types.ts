// Generated-style database contract for the Stage 5 OW Motors schema.
// Regenerate this file from the linked project after applying migrations and
// review the diff before connecting application code.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = "developer" | "admin" | "manager" | "apprentice" | "editor";
export type PublicationStatus = "draft" | "published" | "archived";
export type StockStatus =
  | "in_stock"
  | "out_of_stock"
  | "coming_soon"
  | "discontinued";
export type MotorcycleImageType =
  | "gallery"
  | "hero"
  | "thumbnail"
  | "color"
  | "overview"
  | "open_graph";
export type ContactInquiryStatus =
  | "new"
  | "in_progress"
  | "resolved"
  | "closed"
  | "spam";
export type ContentPageKey = "home" | "brands" | "motorcycles" | "about" | "contact" | "global";
export type HomepageBrandSectionType = "brand_banner" | "motorcycle_row";
export type HomepageDisplayStatus = "visible" | "hidden" | "removed";
export type BlogPublicationStatus = "draft" | "published" | "archived";

// ============ ERP NEW ENUMS (MATCH actual PostgreSQL enums in migration 20260809...) ============
export type StockMovementType = "motorcycle_add" | "motorcycle_subtract" | "part_add" | "part_subtract" | "sale_deduction" | "adjustment";
export type StockApprovalStatus = "pending_approval" | "approved" | "rejected";
export type SaleStatus = "pending_approval" | "approved" | "rejected" | "completed";
export type PaymentMethod = "cash" | "bank_transfer" | "cheque" | "demand_draft" | "pay_order" | "easypaisa" | "jazzcash" | "sadapay" | "card" | "other";
export type ActivityAction =
  | "user_created" | "user_revoked" | "user_role_changed"
  | "sale_requested" | "sale_approved" | "sale_rejected" | "sale_completed"
  | "payment_recorded"
  | "receipt_generated" | "receipt_printed"
  | "stock_requested" | "stock_approved" | "stock_rejected" | "stock_applied"
  | "part_created" | "part_updated"
  | "customer_created" | "customer_updated"
  | "seo_content_updated"
  | "login_success" | "login_failure" | "password_set_by_admin";


export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          created_by: string | null;
          created_password: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          revoked_at: string | null;
          revoked_by: string | null;
          role: ProfileRole;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          created_password?: string | null;
          full_name: string;
          id: string;
          is_active?: boolean;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role: ProfileRole;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          created_password?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: ProfileRole;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "profiles_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_revoked_by_fkey"; columns: ["revoked_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      brands: {
        Row: {
          created_at: string;
          display_order: number;
          full_description: string;
          hero_image_path: string | null;
          id: string;
          is_active: boolean;
          logo_path: string | null;
          mega_menu_logo_path: string | null;
          name: string;
          seo_description: string | null;
          seo_title: string | null;
          short_description: string;
          show_mega_menu_logo: boolean;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          full_description: string;
          hero_image_path?: string | null;
          id?: string;
          is_active?: boolean;
          logo_path?: string | null;
          mega_menu_logo_path?: string | null;
          name: string;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description: string;
          show_mega_menu_logo?: boolean;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          full_description?: string;
          hero_image_path?: string | null;
          id?: string;
          is_active?: boolean;
          logo_path?: string | null;
          mega_menu_logo_path?: string | null;
          name?: string;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string;
          show_mega_menu_logo?: boolean;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brand_campaign_images: {
        Row: {
          alt_text: string;
          brand_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          sort_order: number;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          alt_text: string;
          brand_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          sort_order?: number;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          alt_text?: string;
          brand_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          sort_order?: number;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brand_campaign_images_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      homepage_brand_sections: {
        Row: {
          brand_id: string;
          created_at: string;
          display_order: number;
          display_status: HomepageDisplayStatus;
          id: string;
          overlay_logo_path: string | null;
          section_type: HomepageBrandSectionType;
          show_overlay_logo: boolean;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          display_order?: number;
          display_status?: HomepageDisplayStatus;
          id?: string;
          overlay_logo_path?: string | null;
          section_type: HomepageBrandSectionType;
          show_overlay_logo?: boolean;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          display_order?: number;
          display_status?: HomepageDisplayStatus;
          id?: string;
          overlay_logo_path?: string | null;
          section_type?: HomepageBrandSectionType;
          show_overlay_logo?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "homepage_brand_sections_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string;
          display_order: number;
          id: string;
          is_active: boolean;
          name: string;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      motorcycle_categories: {
        Row: {
          category_id: string;
          created_at: string;
          motorcycle_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          motorcycle_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          motorcycle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "motorcycle_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "motorcycle_categories_motorcycle_id_fkey";
            columns: ["motorcycle_id"];
            isOneToOne: false;
            referencedRelation: "motorcycles";
            referencedColumns: ["id"];
          },
        ];
      };
      motorcycles: {
        Row: {
          base_price: number;
          brand_id: string;
          created_at: string;
          full_description: string;
          id: string;
          is_featured: boolean;
          name: string;
          publication_status: PublicationStatus;
          seo_description: string | null;
          seo_title: string | null;
          short_description: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          base_price: number;
          brand_id: string;
          created_at?: string;
          full_description: string;
          id?: string;
          is_featured?: boolean;
          name: string;
          publication_status?: PublicationStatus;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          base_price?: number;
          brand_id?: string;
          created_at?: string;
          full_description?: string;
          id?: string;
          is_featured?: boolean;
          name?: string;
          publication_status?: PublicationStatus;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "motorcycles_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      motorcycle_variants: {
        Row: {
          cc: number;
          color_hex: string;
          color_name: string;
          created_at: string;
          id: string;
          is_active: boolean;
          is_default: boolean;
          motorcycle_id: string;
          price: number;
          quantity: number;
          stock_status: StockStatus;
          updated_at: string;
        };
        Insert: {
          cc: number;
          color_hex: string;
          color_name: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          motorcycle_id: string;
          price: number;
          quantity?: number;
          stock_status?: StockStatus;
          updated_at?: string;
        };
        Update: {
          cc?: number;
          color_hex?: string;
          color_name?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          motorcycle_id?: string;
          price?: number;
          quantity?: number;
          stock_status?: StockStatus;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "motorcycle_variants_motorcycle_id_fkey";
            columns: ["motorcycle_id"];
            isOneToOne: false;
            referencedRelation: "motorcycles";
            referencedColumns: ["id"];
          },
        ];
      };
      motorcycle_images: {
        Row: {
          alt_text: string;
          created_at: string;
          id: string;
          image_type: MotorcycleImageType;
          is_primary: boolean;
          motorcycle_id: string;
          sort_order: number;
          storage_path: string;
          updated_at: string;
          variant_id: string | null;
        };
        Insert: {
          alt_text: string;
          created_at?: string;
          id?: string;
          image_type?: MotorcycleImageType;
          is_primary?: boolean;
          motorcycle_id: string;
          sort_order?: number;
          storage_path: string;
          updated_at?: string;
          variant_id?: string | null;
        };
        Update: {
          alt_text?: string;
          created_at?: string;
          id?: string;
          image_type?: MotorcycleImageType;
          is_primary?: boolean;
          motorcycle_id?: string;
          sort_order?: number;
          storage_path?: string;
          updated_at?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "motorcycle_images_motorcycle_id_fkey";
            columns: ["motorcycle_id"];
            isOneToOne: false;
            referencedRelation: "motorcycles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "motorcycle_images_variant_motorcycle_fkey";
            columns: ["variant_id", "motorcycle_id"];
            isOneToOne: false;
            referencedRelation: "motorcycle_variants";
            referencedColumns: ["id", "motorcycle_id"];
          },
        ];
      };
      motorcycle_specifications: {
        Row: {
          created_at: string;
          group_name: string;
          id: string;
          label: string;
          motorcycle_id: string;
          sort_order: number;
          unit: string | null;
          updated_at: string;
          value: string;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string;
          group_name: string;
          id?: string;
          label: string;
          motorcycle_id: string;
          sort_order?: number;
          unit?: string | null;
          updated_at?: string;
          value: string;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string;
          group_name?: string;
          id?: string;
          label?: string;
          motorcycle_id?: string;
          sort_order?: number;
          unit?: string | null;
          updated_at?: string;
          value?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "motorcycle_specifications_motorcycle_id_fkey";
            columns: ["motorcycle_id"];
            isOneToOne: false;
            referencedRelation: "motorcycles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "motorcycle_specifications_variant_motorcycle_fkey";
            columns: ["variant_id", "motorcycle_id"];
            isOneToOne: false;
            referencedRelation: "motorcycle_variants";
            referencedColumns: ["id", "motorcycle_id"];
          },
        ];
      };
      motorcycle_features: {
        Row: {
          created_at: string;
          description: string;
          group_name: string;
          icon_identifier: string | null;
          id: string;
          motorcycle_id: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          group_name: string;
          icon_identifier?: string | null;
          id?: string;
          motorcycle_id: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          group_name?: string;
          icon_identifier?: string | null;
          id?: string;
          motorcycle_id?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "motorcycle_features_motorcycle_id_fkey";
            columns: ["motorcycle_id"];
            isOneToOne: false;
            referencedRelation: "motorcycles";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_inquiries: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          message: string;
          phone: string | null;
          status: ContactInquiryStatus;
          subject: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          message: string;
          phone?: string | null;
          status?: ContactInquiryStatus;
          subject: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          message?: string;
          phone?: string | null;
          status?: ContactInquiryStatus;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_pages: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          page_key: ContentPageKey;
          public_path: string;
          published_at: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          page_key: ContentPageKey;
          public_path: string;
          published_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          page_key?: ContentPageKey;
          public_path?: string;
          published_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_pages_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_sections: {
        Row: {
          archived_at: string | null;
          archived_by: string | null;
          created_at: string;
          created_by: string | null;
          draft_archived: boolean;
          draft_content: Json;
          draft_heading: string;
          draft_order: number;
          draft_version: number;
          draft_visible: boolean;
          id: string;
          internal_name: string;
          page_id: string;
          published_archived: boolean;
          published_at: string | null;
          published_content: Json | null;
          published_heading: string | null;
          published_order: number | null;
          published_visible: boolean;
          section_type: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          archived_at?: string | null;
          archived_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          draft_archived?: boolean;
          draft_content?: Json;
          draft_heading?: string;
          draft_order?: number;
          draft_version?: number;
          draft_visible?: boolean;
          id?: string;
          internal_name: string;
          page_id: string;
          published_archived?: boolean;
          published_at?: string | null;
          published_content?: Json | null;
          published_heading?: string | null;
          published_order?: number | null;
          published_visible?: boolean;
          section_type: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          archived_at?: string | null;
          archived_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          draft_archived?: boolean;
          draft_content?: Json;
          draft_heading?: string;
          draft_order?: number;
          draft_version?: number;
          draft_visible?: boolean;
          id?: string;
          internal_name?: string;
          page_id?: string;
          published_archived?: boolean;
          published_at?: string | null;
          published_content?: Json | null;
          published_heading?: string | null;
          published_order?: number | null;
          published_visible?: boolean;
          section_type?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_sections_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "content_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_sections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_sections_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_audit_events: {
        Row: { action: string; actor_id: string | null; created_at: string; id: string; page_id: string; section_id: string | null; summary: string };
        Insert: { action: string; actor_id?: string | null; created_at?: string; id?: string; page_id: string; section_id?: string | null; summary: string };
        Update: { action?: string; actor_id?: string | null; created_at?: string; id?: string; page_id?: string; section_id?: string | null; summary?: string };
        Relationships: [
          { foreignKeyName: "content_audit_events_page_id_fkey"; columns: ["page_id"]; isOneToOne: false; referencedRelation: "content_pages"; referencedColumns: ["id"] },
          { foreignKeyName: "content_audit_events_section_id_fkey"; columns: ["section_id"]; isOneToOne: false; referencedRelation: "content_sections"; referencedColumns: ["id"] },
          { foreignKeyName: "content_audit_events_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      blog_categories: {
        Row: { id: string; name: string; slug: string; accent_color: string; display_order: number; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; accent_color?: string; display_order?: number; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; slug?: string; accent_color?: string; display_order?: number; is_active?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string; category_id: string; title: string; slug: string; excerpt: string; brand_label: string | null;
          hero_image_path: string; hero_image_alt: string; lead: string; content_sections: Json; tags: string[];
          author_name: string; author_initials: string; author_bio: string; reading_time_minutes: number;
          publication_status: BlogPublicationStatus; is_featured: boolean; seo_title: string | null; seo_description: string | null;
          published_at: string | null; created_by: string | null; updated_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; category_id: string; title: string; slug: string; excerpt: string; brand_label?: string | null;
          hero_image_path: string; hero_image_alt: string; lead: string; content_sections?: Json; tags?: string[];
          author_name?: string; author_initials?: string; author_bio?: string; reading_time_minutes?: number;
          publication_status?: BlogPublicationStatus; is_featured?: boolean; seo_title?: string | null; seo_description?: string | null;
          published_at?: string | null; created_by?: string | null; updated_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; category_id?: string; title?: string; slug?: string; excerpt?: string; brand_label?: string | null;
          hero_image_path?: string; hero_image_alt?: string; lead?: string; content_sections?: Json; tags?: string[];
          author_name?: string; author_initials?: string; author_bio?: string; reading_time_minutes?: number;
          publication_status?: BlogPublicationStatus; is_featured?: boolean; seo_title?: string | null; seo_description?: string | null;
          published_at?: string | null; created_by?: string | null; updated_by?: string | null; created_at?: string; updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "blog_posts_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "blog_categories"; referencedColumns: ["id"] },
          { foreignKeyName: "blog_posts_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "blog_posts_updated_by_fkey"; columns: ["updated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      newsletter_subscriptions: {
        Row: { id: string; email: string; status: "subscribed" | "unsubscribed"; source: string; created_at: string; updated_at: string };
        Insert: { id?: string; email: string; status?: "subscribed" | "unsubscribed"; source?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; email?: string; status?: "subscribed" | "unsubscribed"; source?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };

      // ============ ERP NEW TABLES ============
      parts: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          category: string;
          unit: string;
          current_stock: number;
          reorder_level: number;
          unit_cost: number;
          location: string | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          description?: string | null;
          category: string;
          unit: string;
          current_stock?: number;
          reorder_level?: number;
          unit_cost: number;
          location?: string | null;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          name?: string;
          description?: string | null;
          category?: string;
          unit?: string;
          current_stock?: number;
          reorder_level?: number;
          unit_cost?: number;
          location?: string | null;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "parts_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          movement_type: StockMovementType;
          reference: string | null;
          motorcycle_variant_id: string | null;
          part_id: string | null;
          quantity: number;
          unit_cost_at_time: number | null;
          reason: string;
          notes: string | null;
          approval_status: StockApprovalStatus;
          requested_by: string;
          approved_by: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          requested_at: string;
          approved_at: string | null;
          rejected_at: string | null;
          applied: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          movement_type: StockMovementType;
          reference?: string | null;
          motorcycle_variant_id?: string | null;
          part_id?: string | null;
          quantity: number;
          unit_cost_at_time?: number | null;
          reason: string;
          notes?: string | null;
          approval_status?: StockApprovalStatus;
          requested_by: string;
          approved_by?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          requested_at?: string;
          approved_at?: string | null;
          rejected_at?: string | null;
          applied?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          movement_type?: StockMovementType;
          reference?: string | null;
          motorcycle_variant_id?: string | null;
          part_id?: string | null;
          quantity?: number;
          unit_cost_at_time?: number | null;
          reason?: string;
          notes?: string | null;
          approval_status?: StockApprovalStatus;
          requested_by?: string;
          approved_by?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          requested_at?: string;
          approved_at?: string | null;
          rejected_at?: string | null;
          applied?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "stock_movements_motorcycle_variant_id_fkey"; columns: ["motorcycle_variant_id"]; isOneToOne: false; referencedRelation: "motorcycle_variants"; referencedColumns: ["id"] },
          { foreignKeyName: "stock_movements_part_id_fkey"; columns: ["part_id"]; isOneToOne: false; referencedRelation: "parts"; referencedColumns: ["id"] },
          { foreignKeyName: "stock_movements_requested_by_fkey"; columns: ["requested_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "stock_movements_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "stock_movements_rejected_by_fkey"; columns: ["rejected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      customers: {
        Row: {
          id: string;
          cnic: string;
          full_name: string;
          phone_primary: string;
          phone_secondary: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          chasis_numbers: string[];
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cnic: string;
          full_name: string;
          phone_primary: string;
          phone_secondary?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          chasis_numbers?: string[];
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cnic?: string;
          full_name?: string;
          phone_primary?: string;
          phone_secondary?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          chasis_numbers?: string[];
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "customers_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      banks: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          short_name: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          short_name?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          short_name?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          receipt_number: string;
          customer_id: string;
          motorcycle_variant_id: string;
          motorcycle_name_snapshot: string;
          brand_name_snapshot: string;
          color_name_snapshot: string | null;
          color_hex_snapshot: string | null;
          cc_snapshot: number;
          chasis_number: string;
          engine_number: string | null;
          quantity_sold: number;
          unit_price: number;
          discount_amount: number;
          total_amount: number;
          sale_status: SaleStatus;
          requested_by: string;
          approved_by: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          requested_at: string;
          approved_at: string | null;
          rejected_at: string | null;
          completed_at: string | null;
          stock_deducted: boolean;
          receipt_generated: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          receipt_number: string;
          customer_id: string;
          motorcycle_variant_id: string;
          motorcycle_name_snapshot: string;
          brand_name_snapshot: string;
          color_name_snapshot?: string | null;
          color_hex_snapshot?: string | null;
          cc_snapshot: number;
          chasis_number: string;
          engine_number?: string | null;
          quantity_sold?: number;
          unit_price: number;
          discount_amount?: number;
          total_amount: number;
          sale_status?: SaleStatus;
          requested_by: string;
          approved_by?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          requested_at?: string;
          approved_at?: string | null;
          rejected_at?: string | null;
          completed_at?: string | null;
          stock_deducted?: boolean;
          receipt_generated?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          receipt_number?: string;
          customer_id?: string;
          motorcycle_variant_id?: string;
          motorcycle_name_snapshot?: string;
          brand_name_snapshot?: string;
          color_name_snapshot?: string | null;
          color_hex_snapshot?: string | null;
          cc_snapshot?: number;
          chasis_number?: string;
          engine_number?: string | null;
          quantity_sold?: number;
          unit_price?: number;
          discount_amount?: number;
          total_amount?: number;
          sale_status?: SaleStatus;
          requested_by?: string;
          approved_by?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          requested_at?: string;
          approved_at?: string | null;
          rejected_at?: string | null;
          completed_at?: string | null;
          stock_deducted?: boolean;
          receipt_generated?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "sales_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
          { foreignKeyName: "sales_motorcycle_variant_id_fkey"; columns: ["motorcycle_variant_id"]; isOneToOne: false; referencedRelation: "motorcycle_variants"; referencedColumns: ["id"] },
          { foreignKeyName: "sales_requested_by_fkey"; columns: ["requested_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "sales_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "sales_rejected_by_fkey"; columns: ["rejected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      sale_payments: {
        Row: {
          id: string;
          sale_id: string;
          payment_method: PaymentMethod;
          bank_id: string | null;
          bank_name_snapshot: string | null;
          instrument_number: string | null;
          transaction_reference: string | null;
          amount: number;
          payment_date: string;
          depositor_name: string | null;
          account_number_used: string | null;
          notes: string | null;
          attachment_path: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          payment_method: PaymentMethod;
          bank_id?: string | null;
          bank_name_snapshot?: string | null;
          instrument_number?: string | null;
          transaction_reference?: string | null;
          amount: number;
          payment_date?: string;
          depositor_name?: string | null;
          account_number_used?: string | null;
          notes?: string | null;
          attachment_path?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          payment_method?: PaymentMethod;
          bank_id?: string | null;
          bank_name_snapshot?: string | null;
          instrument_number?: string | null;
          transaction_reference?: string | null;
          amount?: number;
          payment_date?: string;
          depositor_name?: string | null;
          account_number_used?: string | null;
          notes?: string | null;
          attachment_path?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "sale_payments_sale_id_fkey"; columns: ["sale_id"]; isOneToOne: false; referencedRelation: "sales"; referencedColumns: ["id"] },
          { foreignKeyName: "sale_payments_bank_id_fkey"; columns: ["bank_id"]; isOneToOne: false; referencedRelation: "banks"; referencedColumns: ["id"] },
          { foreignKeyName: "sale_payments_recorded_by_fkey"; columns: ["recorded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      receipts: {
        Row: {
          id: string;
          sale_id: string;
          receipt_number: string;
          format_version: string;
          generated_by: string;
          generated_at: string;
          qr_code_payload: string;
          printed_count: number;
          last_printed_at: string | null;
          pdf_storage_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          receipt_number: string;
          format_version?: string;
          generated_by: string;
          generated_at?: string;
          qr_code_payload?: string;
          printed_count?: number;
          last_printed_at?: string | null;
          pdf_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          receipt_number?: string;
          format_version?: string;
          generated_by?: string;
          generated_at?: string;
          qr_code_payload?: string;
          printed_count?: number;
          last_printed_at?: string | null;
          pdf_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "receipts_sale_id_fkey"; columns: ["sale_id"]; isOneToOne: false; referencedRelation: "sales"; referencedColumns: ["id"] },
          { foreignKeyName: "receipts_generated_by_fkey"; columns: ["generated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      activity_logs: {
        Row: {
          id: string;
          action: ActivityAction;
          actor_id: string;
          actor_role: ProfileRole | null;
          target_table: string | null;
          target_id: string | null;
          summary: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: ActivityAction;
          actor_id: string;
          actor_role?: ProfileRole | null;
          target_table?: string | null;
          target_id?: string | null;
          summary: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          action?: ActivityAction;
          actor_id?: string;
          actor_role?: ProfileRole | null;
          target_table?: string | null;
          target_id?: string | null;
          summary?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "activity_logs_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      // ============ END ERP NEW TABLES ============

      site_settings: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          setting_key: string;
          setting_value: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          setting_key: string;
          setting_value: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          setting_key?: string;
          setting_value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      published_page_sections: {
        Row: {
          content: Json | null;
          display_order: number | null;
          heading: string | null;
          id: string | null;
          page_key: ContentPageKey | null;
          public_path: string | null;
          published_at: string | null;
          section_type: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      import_motorcycle_inventory: { Args: { payload: Json }; Returns: Json };
      archive_content_section: { Args: { target_section_id: string }; Returns: undefined };
      duplicate_content_section: { Args: { target_section_id: string }; Returns: string };
      move_brand_campaign_image: {
        Args: { move_direction: string; target_banner_id: string };
        Returns: undefined;
      };
      move_homepage_brand: {
        Args: { move_direction: string; target_brand_id: string };
        Returns: undefined;
      };
      move_homepage_brand_section: {
        Args: { move_direction: string; target_section_id: string };
        Returns: undefined;
      };
      move_content_section: { Args: { move_direction: string; target_section_id: string }; Returns: undefined };
      publish_content_page: { Args: { target_page_id: string }; Returns: undefined };
      publish_content_section: { Args: { target_section_id: string }; Returns: undefined };
      restore_content_section: { Args: { target_section_id: string }; Returns: undefined };
      set_content_section_visibility: { Args: { target_section_id: string; target_visible: boolean }; Returns: undefined };
      // ============ ERP NEW RPCs ============
      log_activity: {
        Args: {
          p_action: string;
          p_target_table?: string | null;
          p_target_id?: string | null;
          p_metadata?: Json | null;
        };
        Returns: string;
      };
      generate_receipt_number: {
        Args: { p_prefix: string };
        Returns: string;
      };
      increment_receipt_print_count: {
        Args: { p_receipt_id: string; p_printed_at?: string | null };
        Returns: number;
      };
    };
    Enums: {
      stock_movement_type: StockMovementType;
      stock_approval_status: StockApprovalStatus;
      sale_status: SaleStatus;
      payment_method: PaymentMethod;
      activity_action: ActivityAction;
      profile_role: ProfileRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type TableName = keyof PublicSchema["Tables"];

export type Tables<TableNameOrOptions extends TableName> =
  PublicSchema["Tables"][TableNameOrOptions]["Row"];

export type TablesInsert<TableNameOrOptions extends TableName> =
  PublicSchema["Tables"][TableNameOrOptions]["Insert"];

export type TablesUpdate<TableNameOrOptions extends TableName> =
  PublicSchema["Tables"][TableNameOrOptions]["Update"];
