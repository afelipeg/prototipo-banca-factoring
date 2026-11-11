const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", currencyDisplay: "code", maximumFractionDigits: 0 });
export const formatCop = (n: number) => cop.format(Math.round(n)).replace(/ /g, " ");

export function formatPct(fraction: number, digits = 2): string {
  return `${(fraction * 100).toLocaleString("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatUsd(n: number): string {
  return n.toLocaleString("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
