/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock Supabase client for demo mode.
 * Simulates the Supabase query builder API with in-memory demo data.
 * Data is persisted to .demo-db.json so it survives server restarts.
 */
import {
  DEMO_CUSTOMERS,
  DEMO_SUPPLIERS,
  DEMO_PRODUCTS,
  DEMO_INVOICES,
  DEMO_INVOICE_ITEMS,
  DEMO_PAYMENTS,
  DEMO_PAYMENT_PLANS,
  DEMO_CONTACT_LOGS,
  DEMO_REMINDERS,
  DEMO_PRODUCTION_ORDERS,
  DEMO_PRODUCTION_DELIVERIES,
  DEMO_STOCK_MOVEMENTS,
  DEMO_LEADS,
  DEMO_CUSTOMER_BALANCE,
  DEMO_LOW_STOCK,
  DEMO_MESSAGE_TEMPLATES,
  DEMO_SOCIAL_POSTS,
  DEMO_CONTACT_SEQUENCES,
  DEMO_CUSTOMER_SEQUENCES,
  DEMO_QUOTES,
  DEMO_QUOTE_ITEMS,
  DEMO_INFLUENCER_CONTACTS,
} from "@/lib/demo-data";

// fs and path are injected by server.ts into globalThis to avoid bundler issues.
// Client bundle never calls these functions (all mutations go via server actions).
function getServerFs() { return (globalThis as any).__serverFs as typeof import("fs") | undefined; }
function getServerPath() { return (globalThis as any).__serverPath as typeof import("path") | undefined; }

function getDbFile(): string | null {
  const p = getServerPath();
  if (!p) return null;
  try { return p.join(process.cwd(), ".demo-db.json"); } catch { return null; }
}

export function hydrateFromDisk() {
  if ((globalThis as any).__diskHydrated) return;
  const fs = getServerFs();
  const dbFile = getDbFile();
  // Only mark as hydrated after we successfully get fs + path.
  // If fs is not yet injected, leave __diskHydrated unset so the next
  // request retries (server.ts injects fs before calling this, but guard anyway).
  if (!fs || !dbFile) return;
  (globalThis as any).__diskHydrated = true;
  try {
    if (fs.existsSync(dbFile)) {
      const saved = JSON.parse(fs.readFileSync(dbFile, "utf-8")) as Record<string, any[]>;
      if (global.__DEMO_TABLE_DATA && saved) {
        for (const key of Object.keys(saved)) {
          global.__DEMO_TABLE_DATA[key] = saved[key];
        }
      }
    }
  } catch {
    // If read fails, reset flag so we retry next request
    (globalThis as any).__diskHydrated = false;
  }
}

function saveToDisk() {
  const fs = getServerFs();
  const dbFile = getDbFile();
  if (!fs || !dbFile) return;
  try {
    fs.writeFileSync(dbFile, JSON.stringify(global.__DEMO_TABLE_DATA, null, 2), "utf-8");
  } catch {}
}

// Use a global to persist in-memory data across Next.js hot-reloads and
// server-component re-evaluations in dev mode (module cache can be cleared
// by Turbopack between requests, resetting module-level variables).
declare global {
  // eslint-disable-next-line no-var
  var __DEMO_TABLE_DATA: Record<string, any[]> | undefined;
}

if (!global.__DEMO_TABLE_DATA) {
  global.__DEMO_TABLE_DATA = {
    customers: [...DEMO_CUSTOMERS],
    suppliers: [...DEMO_SUPPLIERS],
    products: [...DEMO_PRODUCTS],
    invoices: [...DEMO_INVOICES],
    invoice_items: [...DEMO_INVOICE_ITEMS],
    payments: [...DEMO_PAYMENTS],
    payment_plans: [...DEMO_PAYMENT_PLANS],
    contact_logs: [...DEMO_CONTACT_LOGS],
    reminders: [...DEMO_REMINDERS],
    production_orders: [...DEMO_PRODUCTION_ORDERS],
    production_deliveries: [...DEMO_PRODUCTION_DELIVERIES],
    stock_movements: [...DEMO_STOCK_MOVEMENTS],
    leads: [...DEMO_LEADS],
    customer_balance: [...DEMO_CUSTOMER_BALANCE],
    low_stock_products: [...DEMO_LOW_STOCK],
    message_templates: [...DEMO_MESSAGE_TEMPLATES],
    social_posts: [...DEMO_SOCIAL_POSTS],
    contact_sequences: [...DEMO_CONTACT_SEQUENCES],
    customer_sequences: [...DEMO_CUSTOMER_SEQUENCES],
    quotes: [...DEMO_QUOTES],
    quote_items: [...DEMO_QUOTE_ITEMS],
    influencer_contacts: [...DEMO_INFLUENCER_CONTACTS],
  };
}

// Backfill tables added after initial hydration (hot-reload safe)
if (!global.__DEMO_TABLE_DATA!.influencer_contacts) {
  global.__DEMO_TABLE_DATA!.influencer_contacts = [...DEMO_INFLUENCER_CONTACTS];
}

const TABLE_DATA: Record<string, any[]> = global.__DEMO_TABLE_DATA;

// FK relationships: table name → FK column name
const FK_MAP: Record<string, string> = {
  suppliers: "supplier_id",
  products: "product_id",
  customers: "customer_id",
  production_orders: "production_order_id",
  invoices: "invoice_id",
  contact_sequences: "sequence_id",
  message_templates: "template_id",
  quote_items: "quote_id",
  products: "product_id",
};

class MockQueryBuilder {
  private _data: any[];
  private _countOnly = false;
  private _singleResult = false;
  private _headOnly = false;
  private _selectString = "";

  constructor(tableName: string) {
    this._data = [...(TABLE_DATA[tableName] || [])];
  }

  select(_columns?: string, opts?: { count?: string; head?: boolean }) {
    if (_columns) this._selectString = _columns;
    if (opts?.head) this._headOnly = true;
    if (opts?.count) this._countOnly = true;
    return this;
  }

  eq(column: string, value: any) {
    this._data = this._data.filter((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this._data = this._data.filter((row) => row[column] !== value);
    return this;
  }

  in(column: string, values: any[]) {
    this._data = this._data.filter((row) => values.includes(row[column]));
    return this;
  }

  lt(column: string, value: any) {
    this._data = this._data.filter((row) => row[column] < value);
    return this;
  }

  lte(column: string, value: any) {
    this._data = this._data.filter((row) => row[column] <= value);
    return this;
  }

  gt(column: string, value: any) {
    this._data = this._data.filter((row) => row[column] > value);
    return this;
  }

  gte(column: string, value: any) {
    this._data = this._data.filter((row) => row[column] >= value);
    return this;
  }

  or(filterString: string) {
    // Basic parsing of supabase .or() filter strings like:
    // "company_name.ilike.%text%,contact_name.ilike.%text%"
    const parts = filterString.split(",");
    const matchers = parts.map((part) => {
      const [col, op, ...rest] = part.split(".");
      const val = rest.join(".").replace(/%/g, "");
      return { col, op, val };
    });

    this._data = this._data.filter((row) =>
      matchers.some(({ col, op, val }) => {
        const rowVal = String(row[col] || "").toLowerCase();
        if (op === "ilike") return rowVal.includes(val.toLowerCase());
        return rowVal === val.toLowerCase();
      })
    );
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    const asc = opts?.ascending !== false;
    this._data.sort((a, b) => {
      const av = a[column] ?? "";
      const bv = b[column] ?? "";
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return this;
  }

  limit(n: number) {
    this._data = this._data.slice(0, n);
    return this;
  }

  single() {
    this._singleResult = true;
    return this._resolve();
  }

  // Terminal: return results
  then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    try {
      resolve(this._resolve());
    } catch (e) {
      reject?.(e);
    }
  }

  private _resolveRow(row: any): any {
    if (!this._selectString.includes("(")) return row;
    const joinPattern = /(\w+)\(([^)]+)\)/g;
    let match;
    const result = { ...row };
    while ((match = joinPattern.exec(this._selectString)) !== null) {
      const relatedTable = match[1];
      const requestedFields = match[2].split(",").map((f: string) => f.trim());
      const fkField = FK_MAP[relatedTable];
      if (!fkField) continue;
      const fkValue = row[fkField];
      if (fkValue == null) { result[relatedTable] = null; continue; }
      const relatedData = TABLE_DATA[relatedTable];
      if (!relatedData) { result[relatedTable] = null; continue; }
      const relatedRow = relatedData.find((r: any) => r.id === fkValue);
      if (!relatedRow) { result[relatedTable] = null; continue; }
      const picked: any = {};
      for (const field of requestedFields) picked[field] = relatedRow[field];
      result[relatedTable] = picked;
    }
    return result;
  }

  private _resolve() {
    if (this._headOnly || this._countOnly) {
      return { data: null, error: null, count: this._data.length };
    }
    const data = this._selectString.includes("(")
      ? this._data.map((row) => this._resolveRow(row))
      : this._data;
    if (this._singleResult) {
      return { data: data[0] || null, error: data[0] ? null : { message: "Not found" } };
    }
    return { data, error: null, count: data.length };
  }
}

// Simulates the Postgres trigger that updates products.current_stock on stock_movements insert
function applyStockTrigger(tableName: string, row: any) {
  if (tableName !== "stock_movements") return;
  const products = TABLE_DATA["products"];
  if (!products || !row.product_id) return;
  const product = products.find((p: any) => p.id === row.product_id);
  if (!product) return;
  const qty = Number(row.quantity) || 0;
  if (row.movement_type === "in") {
    product.current_stock = (Number(product.current_stock) || 0) + qty;
  } else if (row.movement_type === "out" || row.movement_type === "adjustment") {
    product.current_stock = (Number(product.current_stock) || 0) - qty;
  }
}

class MockInsertBuilder {
  private _tableName: string;
  private _data: any;

  constructor(tableName: string, data: any) {
    this._tableName = tableName;
    this._data = data;
  }

  select(_columns?: string) {
    return this;
  }

  single() {
    // Return inserted data with a generated id
    const items = Array.isArray(this._data) ? this._data : [this._data];
    const table = TABLE_DATA[this._tableName];
    const results: any[] = [];
    for (const item of items) {
      const newId = `demo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const result = { ...item, id: newId };
      if (table) table.push(result);
      results.push(result);
      applyStockTrigger(this._tableName, result);
    }
    saveToDisk();
    // single() returns the first item
    return Promise.resolve({ data: results[0], error: null });
  }

  then(resolve: (value: any) => void) {
    const items = Array.isArray(this._data) ? this._data : [this._data];
    const table = TABLE_DATA[this._tableName];
    const results: any[] = [];
    for (const item of items) {
      const newId = `demo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const result = { ...item, id: newId };
      if (table) table.push(result);
      results.push(result);
      applyStockTrigger(this._tableName, result);
    }
    saveToDisk();
    resolve({ data: results.length === 1 ? results[0] : results, error: null });
  }
}

class MockUpdateBuilder {
  private _tableName: string;
  private _updates: any;
  private _filters: Array<{ column: string; value: any }> = [];

  constructor(tableName: string, updates: any) {
    this._tableName = tableName;
    this._updates = updates;
  }

  eq(column: string, value: any) {
    this._filters.push({ column, value });
    // Apply updates to matching items in-memory
    const table = TABLE_DATA[this._tableName];
    if (table) {
      for (const row of table) {
        if (this._filters.every((f) => row[f.column] === f.value)) {
          Object.assign(row, this._updates);
        }
      }
    }
    saveToDisk();
    return this;
  }

  in(column: string, values: any[]) {
    const table = TABLE_DATA[this._tableName];
    if (table) {
      for (const row of table) {
        if (values.includes(row[column])) {
          Object.assign(row, this._updates);
        }
      }
    }
    saveToDisk();
    return this;
  }

  select(_columns?: string) { return this; }
  single() {
    saveToDisk();
    const table = TABLE_DATA[this._tableName];
    const match = table?.find((row) => this._filters.every((f) => row[f.column] === f.value));
    return Promise.resolve({ data: match || null, error: null });
  }
  then(resolve: (value: any) => void) { saveToDisk(); resolve({ data: null, error: null }); }
}

class MockDeleteBuilder {
  private _tableName: string;

  constructor(tableName: string) {
    this._tableName = tableName;
  }

  eq(column: string, value: any) {
    const table = TABLE_DATA[this._tableName];
    if (table) {
      const idx = table.findIndex((row) => row[column] === value);
      if (idx !== -1) table.splice(idx, 1);
    }
    saveToDisk();
    return this;
  }

  then(resolve: (value: any) => void) { resolve({ data: null, error: null }); }
}

// Compute customer_balance view dynamically from invoices + payments
function computeCustomerBalance(): any[] {
  const customers = TABLE_DATA["customers"] || [];
  const invoices = TABLE_DATA["invoices"] || [];
  const payments = TABLE_DATA["payments"] || [];
  return customers.map((c: any) => {
    const saleInvoices = invoices.filter((i: any) => i.customer_id === c.id && i.invoice_type === "sale");
    const invoiceIds = saleInvoices.map((i: any) => i.id);
    const totalInvoiced = saleInvoices.reduce((sum: number, i: any) => sum + (Number(i.total_amount) || 0), 0);
    const totalPaid = payments
      .filter((p: any) => invoiceIds.includes(p.invoice_id))
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    return {
      id: c.id,
      company_name: c.company_name,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      balance_due: totalInvoiced - totalPaid,
    };
  });
}

// Compute supplier_balance view: purchase invoices minus payments per supplier
function computeSupplierBalance(): any[] {
  const suppliers = TABLE_DATA["suppliers"] || [];
  const invoices = TABLE_DATA["invoices"] || [];
  const payments = TABLE_DATA["payments"] || [];
  return suppliers.map((s: any) => {
    const purchaseInvoices = invoices.filter((i: any) => i.supplier_id === s.id && i.invoice_type === "purchase");
    const invoiceIds = purchaseInvoices.map((i: any) => i.id);
    const totalInvoiced = purchaseInvoices.reduce((sum: number, i: any) => sum + (Number(i.total_amount) || 0), 0);
    const totalPaid = payments
      .filter((p: any) => invoiceIds.includes(p.invoice_id))
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    return {
      id: s.id,
      company_name: s.company_name,
      city: s.city,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      balance_due: totalInvoiced - totalPaid,
    };
  });
}

// Compute low_stock_products view dynamically from products
function computeLowStock(): any[] {
  const products = TABLE_DATA["products"] || [];
  return products
    .filter((p: any) => p.is_active !== false && Number(p.current_stock) <= Number(p.min_stock_level))
    .map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      current_stock: Number(p.current_stock) || 0,
      min_stock_level: Number(p.min_stock_level) || 0,
      shortage: (Number(p.min_stock_level) || 0) - (Number(p.current_stock) || 0),
    }));
}

class MockTableBuilder {
  private _tableName: string;

  constructor(tableName: string) {
    this._tableName = tableName;
  }

  select(columns?: string, opts?: { count?: string; head?: boolean }) {
    // Compute views dynamically
    if (this._tableName === "customer_balance") {
      TABLE_DATA["customer_balance"] = computeCustomerBalance();
    } else if (this._tableName === "supplier_balance") {
      TABLE_DATA["supplier_balance"] = computeSupplierBalance();
    } else if (this._tableName === "low_stock_products") {
      TABLE_DATA["low_stock_products"] = computeLowStock();
    }
    const builder = new MockQueryBuilder(this._tableName);
    builder.select(columns, opts);
    return builder;
  }

  insert(data: any) {
    return new MockInsertBuilder(this._tableName, data);
  }

  update(data: any) {
    return new MockUpdateBuilder(this._tableName, data);
  }

  delete() {
    return new MockDeleteBuilder(this._tableName);
  }
}

const DEMO_USER = {
  id: "demo-user-001",
  email: "demo@biyoverim.com",
  user_metadata: { full_name: "Demo Kullanıcı" },
};

export function createMockClient() {
  return {
    from: (tableName: string) => new MockTableBuilder(tableName),
    auth: {
      getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
      signInWithPassword: async () => ({ data: { user: DEMO_USER, session: {} }, error: null }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: { user: DEMO_USER } }, error: null }),
    },
  } as any;
}
