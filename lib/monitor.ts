import { buscarPagador, buscarPyme, diasHasta } from "./consultas.ts";
import { CARTERA, FACTURAS } from "./data/pymes.ts";

export type AlertaCartera = {
  severidad: "alta" | "media" | "baja";
  tipo: "vencimiento_proximo" | "vencida" | "concentracion_pagador" | "pagador_baja_calificacion";
  detalle: string;
  operacion?: string;
};

export type AnalisisCartera = {
  fechaCorte: string;
  kpis: {
    operacionesActivas: number;
    saldoAnticipadoCOP: number;
    operacionesPagadas: number;
    pagadasATiempoPct: number;
    solicitudesEnTramite: number;
    montoEnTramiteCOP: number;
  };
  /** Exposición por pagador (cartera activa + solicitudes en trámite), para la gráfica. */
  exposicionPorPagador: { pagador: string; calificacion: string; montoCOP: number; participacionPct: number }[];
  /** Anticipos de la cartera activa por semana de vencimiento (más el balde "Vencidas"), para la gráfica. */
  vencimientosPorSemana: { semana: string; montoCOP: number }[];
  alertas: AlertaCartera[];
};

const CALIFICACIONES_BAJAS = new Set(["BB", "B"]);

/** Revisión determinista de la cartera (sintética). El agente monitor solo la interpreta. */
export function analizarCartera(hoy = new Date()): AnalisisCartera {
  const operaciones = Object.values(CARTERA).flat();
  const activas = operaciones.filter((o) => o.estado === "activa");
  const pagadas = operaciones.filter((o) => o.estado === "pagada");
  const aTiempo = pagadas.filter((o) => o.fechaPago && o.fechaPago <= o.fechaVencimiento).length;
  const enTramite = FACTURAS.filter((f) => f.estadoRadian === "aceptada" && !operaciones.some((o) => o.numeroFactura === f.numero));

  const exposicion = new Map<string, number>();
  for (const o of activas) exposicion.set(o.pagador, (exposicion.get(o.pagador) ?? 0) + o.anticipoDesembolsado);
  for (const f of enTramite) exposicion.set(f.pagador, (exposicion.get(f.pagador) ?? 0) + Math.round(f.valor * 0.9));
  const totalExpuesto = [...exposicion.values()].reduce((s, v) => s + v, 0);
  const exposicionPorPagador = [...exposicion.entries()]
    .map(([pagador, montoCOP]) => ({
      pagador,
      calificacion: buscarPagador(pagador)?.calificacion ?? "s/d",
      montoCOP,
      participacionPct: totalExpuesto ? Number(((montoCOP / totalExpuesto) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.montoCOP - a.montoCOP);

  const semanas = new Map<string, number>();
  semanas.set("Vencidas", 0);
  for (let i = 0; i < 6; i++) semanas.set(`S${i + 1}`, 0);
  const alertas: AlertaCartera[] = [];
  for (const o of activas) {
    const dias = diasHasta(o.fechaVencimiento);
    const semana = dias < 0 ? "Vencidas" : `S${Math.min(6, Math.max(1, Math.ceil(Math.max(dias, 1) / 7)))}`;
    semanas.set(semana, (semanas.get(semana) ?? 0) + o.anticipoDesembolsado);
    const pyme = Object.entries(CARTERA).find(([, ops]) => ops.includes(o))?.[0];
    const nombre = pyme ? (buscarPyme(pyme)?.rut.razonSocial ?? pyme) : "";
    if (dias < 0) {
      alertas.push({ severidad: "alta", tipo: "vencida", operacion: o.id, detalle: `${o.id} (${nombre}) vencida hace ${-dias} días; pagador: ${o.pagador}` });
    } else if (dias <= 10) {
      alertas.push({ severidad: "media", tipo: "vencimiento_proximo", operacion: o.id, detalle: `${o.id} (${nombre}) vence en ${dias} días; pagador: ${o.pagador}` });
    }
  }
  for (const e of exposicionPorPagador) {
    if (e.participacionPct >= 50) {
      alertas.push({ severidad: "media", tipo: "concentracion_pagador", detalle: `${e.pagador} concentra el ${e.participacionPct.toLocaleString("es-CO")} % de la exposición.` });
    }
    if (CALIFICACIONES_BAJAS.has(e.calificacion)) {
      alertas.push({ severidad: "alta", tipo: "pagador_baja_calificacion", detalle: `${e.pagador} (calificación ${e.calificacion}) tiene exposición por ${e.montoCOP.toLocaleString("es-CO")} COP.` });
    }
  }

  return {
    fechaCorte: hoy.toISOString().slice(0, 10),
    kpis: {
      operacionesActivas: activas.length,
      saldoAnticipadoCOP: activas.reduce((s, o) => s + o.anticipoDesembolsado, 0),
      operacionesPagadas: pagadas.length,
      pagadasATiempoPct: pagadas.length ? Math.round((aTiempo / pagadas.length) * 100) : 0,
      solicitudesEnTramite: enTramite.length,
      montoEnTramiteCOP: enTramite.reduce((s, f) => s + f.valor, 0),
    },
    exposicionPorPagador,
    vencimientosPorSemana: [...semanas.entries()]
      .filter(([semana, montoCOP]) => semana !== "Vencidas" || montoCOP > 0)
      .map(([semana, montoCOP]) => ({ semana, montoCOP })),
    alertas,
  };
}
