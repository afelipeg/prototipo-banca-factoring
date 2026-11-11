import { FACTURAS, PAGADORES, PYMES } from "../../../agent/lib/data/pymes";

export type CasoComite = {
  readonly numeroFactura: string;
  readonly razonSocial: string;
  readonly nit: string;
  readonly monto: number;
  readonly score: number;
  readonly banda: string;
  readonly motivos: readonly string[];
  readonly pagador: { readonly nombre: string; readonly calificacion: string };
  readonly resumen: string;
  readonly factores: readonly { readonly nombre: string; readonly impacto?: number; readonly explicacion: string }[];
  readonly oferta: {
    readonly desembolsoNeto: number;
    readonly tasaMensual: number;
    readonly costoEfectivoAnual: number;
    readonly valorAnticipado?: number;
  } | null;
  readonly fuentes: readonly string[];
  readonly origen: "semilla" | "sesion";
};

const f2002 = FACTURAS.find((f) => f.numero === "FE-2002")!;
const pyme2 = PYMES.find((p) => p.nit === f2002.nit)!;
const pagador2 = PAGADORES.find((p) => p.nombre === f2002.pagador)!;

/** Caso sembrado del flujo 2 (valores tal como los calculan los motores sintéticos del agente). */
export const CASO_SEMILLA: CasoComite = {
  numeroFactura: f2002.numero,
  razonSocial: pyme2.rut.razonSocial,
  nit: pyme2.nit,
  monto: f2002.valor,
  score: 540,
  banda: "C",
  motivos: ["Monto superior a COP 200 millones", "Banda C"],
  pagador: { nombre: pagador2.nombre, calificacion: pagador2.calificacion },
  resumen:
    "Metalmecánica del Valle solicita descontar la factura FE-2002 por COP 385 millones a cargo de Constructora Pacífico Norte (BBB+). Score 540, banda C: buen buró y antigüedad, penalizado por una mora de 30 días y una concentración del 45 % en un solo pagador. El monto supera el umbral de COP 200 millones, por lo que requiere decisión humana.",
  factores: [
    { nombre: "Base", impacto: 520, explicacion: "Puntaje de partida del modelo." },
    { nombre: "Score de buró", impacto: 25, explicacion: "Buró de 641 frente a la referencia de 600." },
    { nombre: "Antigüedad", impacto: 30, explicacion: "9 años de operación (tope 10; neutro a los 3)." },
    { nombre: "Calificación del pagador", impacto: 15, explicacion: "El pagador tiene calificación BBB+." },
    { nombre: "Historial de moras", impacto: -30, explicacion: "1 mora reportada: -30 puntos cada una." },
    { nombre: "Concentración en el pagador", impacto: -20, explicacion: "45 % de las ventas depende de este pagador (se penaliza lo que supera 25 %)." },
  ],
  oferta: { desembolsoNeto: 321_454_518, tasaMensual: 0.021, costoEfectivoAnual: 0.3556, valorAnticipado: 346_500_000 },
  fuentes: [
    "DIAN RADIAN (sintético)",
    "Buró de crédito (sintético)",
    "Calificación de pagadores (sintético)",
    "Motor de score del banco (sintético)",
    "Motor de políticas de crédito (sintético)",
    "Motor de precios del banco (sintético)",
  ],
  origen: "semilla",
};

export type DecisionComite = "aprobar" | "rechazar" | "solicitar_informacion";

export const DECISION_LABEL: Record<DecisionComite, string> = {
  aprobar: "Aprobado",
  rechazar: "Rechazado",
  solicitar_informacion: "Información solicitada",
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Construye un caso a partir de la salida de `evaluar_solicitud` cuando termina en comité humano. */
export function casoDesdeEvaluacion(input: unknown, output: unknown): CasoComite | undefined {
  if (!isObj(output) || output.decision !== "comite_humano" || !isObj(output.riesgo)) return undefined;
  const r = output.riesgo;
  const i = isObj(input) ? input : {};
  const numeroFactura = typeof i.numeroFactura === "string" ? i.numeroFactura : undefined;
  const nit = typeof i.nit === "string" ? i.nit : undefined;
  if (!numeroFactura || !nit) return undefined;
  const pyme = PYMES.find((p) => p.nit === nit);
  const factura = FACTURAS.find((f) => f.numero === numeroFactura);
  const pagador = factura ? PAGADORES.find((p) => p.nombre === factura.pagador) : undefined;
  const oferta = isObj(r.oferta) ? r.oferta : undefined;
  return {
    numeroFactura,
    nit,
    razonSocial: pyme?.rut.razonSocial ?? nit,
    monto: factura?.valor ?? (oferta ? Number(oferta.valorFactura) : 0),
    score: Number(r.score),
    banda: String(r.banda),
    motivos: Array.isArray(r.motivos) ? r.motivos.map(String) : [],
    pagador: { nombre: factura?.pagador ?? "—", calificacion: pagador?.calificacion ?? "—" },
    resumen: typeof r.resumen_para_comite === "string" ? r.resumen_para_comite : "",
    factores: Array.isArray(r.factores)
      ? r.factores.filter(isObj).map((f) => ({
          nombre: String(f.nombre),
          impacto: typeof f.impacto === "number" ? f.impacto : undefined,
          explicacion: String(f.explicacion ?? ""),
        }))
      : [],
    oferta: oferta
      ? {
          desembolsoNeto: Number(oferta.desembolsoNeto),
          tasaMensual: Number(oferta.tasaMensual),
          costoEfectivoAnual: Number(oferta.costoEfectivoAnual),
          valorAnticipado: Number(oferta.valorAnticipado),
        }
      : null,
    fuentes: Array.isArray(r.fuentes) ? r.fuentes.map(String) : [],
    origen: "sesion",
  };
}
