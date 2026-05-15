export const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const usd = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const num = (n: number | null | undefined, decimals = 2) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const pct = (n: number | null | undefined) =>
  `${((n ?? 0) * 1).toFixed(1)}%`;

export const monthLabel = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

export const dateBR = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d + (typeof d === "string" && d.length === 10 ? "T00:00:00" : "")) : d;
  return dt.toLocaleDateString("pt-BR");
};

export const monthKey = (d: string) => d.substring(0, 7); // YYYY-MM
