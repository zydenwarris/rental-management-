/**
 * Every query key in one file. Inline keys drift — two spellings of the same
 * key means an invalidation that silently misses.
 */
export const queryKeys = {
  dashboard: ["dashboard"] as const,

  properties: {
    all: ["properties"] as const,
    detail: (id: string) => ["properties", id] as const,
    units: (id: string) => ["properties", id, "units"] as const,
    expenses: (id: string) => ["properties", id, "expenses"] as const,
    maintenance: (id: string) => ["properties", id, "maintenance"] as const,
  },

  units: {
    all: ["units"] as const,
    detail: (id: string) => ["units", id] as const,
    leases: (id: string) => ["units", id, "leases"] as const,
  },

  tenants: {
    all: ["tenants"] as const,
    detail: (id: string) => ["tenants", id] as const,
    leases: (id: string) => ["tenants", id, "leases"] as const,
    payments: (id: string) => ["tenants", id, "payments"] as const,
  },

  leases: {
    all: ["leases"] as const,
    detail: (id: string) => ["leases", id] as const,
    payments: (id: string) => ["leases", id, "payments"] as const,
  },

  payments: {
    all: ["payments"] as const,
    detail: (id: string) => ["payments", id] as const,
  },

  expenses: {
    all: ["expenses"] as const,
    detail: (id: string) => ["expenses", id] as const,
  },

  maintenance: {
    all: ["maintenance"] as const,
    detail: (id: string) => ["maintenance", id] as const,
  },
} as const;
