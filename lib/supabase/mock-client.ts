/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock Supabase client for demo mode.
 * Simulates the Supabase query builder API with in-memory demo data.
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
} from "@/lib/demo-data";

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
  };
}

const TABLE_DATA: Record<string, any[]> = global.__DEMO_TABLE_DATA;

class MockQueryBuilder {
  private _data: any[];
  private _countOnly = false;
  private _singleResult = false;
  private _headOnly = false;

  constructor(tableName: string) {
    this._data = [...(TABLE_DATA[tableName] || [])];
  }

  select(_columns?: string, opts?: { count?: string; head?: boolean }) {
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

  private _resolve() {
    if (this._headOnly || this._countOnly) {
      return { data: null, error: null, count: this._data.length };
    }
    if (this._singleResult) {
      return { data: this._data[0] || null, error: this._data[0] ? null : { message: "Not found" } };
    }
    return { data: this._data, error: null, count: this._data.length };
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
    }
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
    }
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
    return this;
  }

  select(_columns?: string) { return this; }
  single() {
    // Find the first matching updated record
    const table = TABLE_DATA[this._tableName];
    const match = table?.find((row) => this._filters.every((f) => row[f.column] === f.value));
    return Promise.resolve({ data: match || null, error: null });
  }
  then(resolve: (value: any) => void) { resolve({ data: null, error: null }); }
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
    return this;
  }

  then(resolve: (value: any) => void) { resolve({ data: null, error: null }); }
}

class MockTableBuilder {
  private _tableName: string;

  constructor(tableName: string) {
    this._tableName = tableName;
  }

  select(columns?: string, opts?: { count?: string; head?: boolean }) {
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
