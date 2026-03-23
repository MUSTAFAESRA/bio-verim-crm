import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductionOrder = Database["public"]["Tables"]["production_orders"]["Row"];
export type ProductionDelivery = Database["public"]["Tables"]["production_deliveries"]["Row"];
export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceItem = Database["public"]["Tables"]["invoice_items"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentPlan = Database["public"]["Tables"]["payment_plans"]["Row"];
export type ContactLog = Database["public"]["Tables"]["contact_logs"]["Row"];
export type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type CustomerBalance = Database["public"]["Views"]["customer_balance"]["Row"];
export type LowStockProduct = Database["public"]["Views"]["low_stock_products"]["Row"];
