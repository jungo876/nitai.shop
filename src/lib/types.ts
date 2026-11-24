export interface Company {
  id: string;
  name: string;
  logo_url: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  home_category?: string | null;
  description: string;
  image_url: string;
  company_id: string | null;
  is_top_selling?: boolean;
  status?: 'active' | 'out_of_stock' | 'coming_soon' | 'hidden';
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  unit_price: number;
  units_per_box: number;
  created_at: string;
}

export interface BulkPrice {
  id: string;
  variant_id: string;
  box_count: number;
  price_per_unit: number;
  tag: string | null;
  created_at: string;
}

export interface VariantWithBulkPrices extends ProductVariant {
  bulk_prices: BulkPrice[];
}

export interface ProductWithVariants extends Product {
  product_variants: VariantWithBulkPrices[];
  companies?: Company | null;
}

export const CATEGORIES = [
  "Insecticide",
  "Fungicide",
  "Herbicide",
  "Fertilizer",
  "Plant Growth Regulator",
  "Bio Pesticide",
  "Rodenticide",
  "Seed Treatment",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const HOME_CATEGORIES = [
  "Crop Protection",
  "Crop Nutrition",
  "Seeds",
  "Agro Tools",
] as const;

export type HomeCategory = (typeof HOME_CATEGORIES)[number];

/* ─── Auth / User Types ─── */

export interface AppUser {
  id: string;
  phone_number: string;
  whatsapp_number: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_profile_complete: boolean;
  is_admin?: boolean;
  created_at?: string;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  shop_name: string | null;
  gst_number: string | null;
  pan_number: string | null;
  is_gst_verified: boolean;
  is_pan_verified: boolean;
  business_type: string | null;
  license_number: string | null;
  created_at?: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  address_line: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone_number: string | null;
  is_default: boolean;
  created_at?: string;
}

/* ─── Order Types ─── */

export type PaymentStatus = "pending" | "advance_paid" | "partially_paid" | "fully_paid" | "failed";
export type OrderStatus = "placed" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
export type RemainingPaymentMethod = "cash_on_delivery" | "upi" | "bank_transfer" | "cash";

export interface Order {
  id: string;
  user_id: string;
  
  total_amount: number;
  advance_amount: number;
  remaining_amount: number;
  
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  
  payment_method: string | null;
  remaining_payment_method: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  
  product_id: string;
  variant_id: string;
  bulk_price_id: string | null;
  
  product_name: string;
  variant_label: string;
  
  box_count: number;
  units_per_box: number;
  
  price_per_unit: number;
  total_units: number;
  total_price: number;
  
  created_at: string;
}

/* ─── Cart Types ─── */

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string;
  bulk_price_id: string | null;
  box_count: number;
  quantity: number;
  created_at: string;
}

/** CartItem enriched with product data for display */
export interface CartItemWithProduct extends CartItem {
  product_name: string;
  product_image: string;
  variant_label: string;
  units_per_box: number;
  price_per_unit: number;
  total_units: number;
  total_price: number;
}
