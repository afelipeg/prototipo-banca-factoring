import { CARTERA, FACTURAS, PAGADORES, PYMES } from "./data/pymes.ts";
import type { Factura, OperacionCartera, Pagador, Pyme } from "./data/pymes.ts";

const soloDigitos = (s: string) => s.replace(/\D/g, "");

/** Acepta el NIT con o sin puntos/digito de verificacion. */
export function buscarPyme(nit: string): Pyme | undefined {
  const d = soloDigitos(nit);
  if (d.length < 9) return undefined;
  return PYMES.find((p) => {
    const pd = soloDigitos(p.nit);
    return d === pd || d === pd.slice(0, 9);
  });
}

export function buscarFactura(numero: string): Factura | undefined {
  const n = numero.trim().toUpperCase();
  return FACTURAS.find((f) => f.numero === n);
}

export function facturasDe(nit: string): Factura[] {
  const p = buscarPyme(nit);
  return p ? FACTURAS.filter((f) => f.nit === p.nit) : [];
}

export function buscarPagador(nombre: string): Pagador | undefined {
  const n = nombre.trim().toLowerCase();
  return PAGADORES.find((p) => p.nombre.toLowerCase() === n) ?? PAGADORES.find((p) => p.nombre.toLowerCase().includes(n));
}

export function carteraDe(nit: string): OperacionCartera[] {
  const p = buscarPyme(nit);
  return p ? (CARTERA[p.nit] ?? []) : [];
}

export function diasHasta(fechaIso: string): number {
  const hoy = new Date().toISOString().slice(0, 10);
  return Math.round((Date.parse(fechaIso) - Date.parse(hoy)) / 86_400_000);
}

export function kycConsistente(p: Pyme): boolean {
  return p.rut.razonSocial === p.camara.razonSocial && p.rut.representanteLegal === p.camara.representanteLegal;
}
