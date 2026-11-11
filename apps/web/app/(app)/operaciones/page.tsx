import { CARTERA, PYMES } from "../../../../../agent/lib/data/pymes";
import { requireSession } from "@/lib/auth";
import { OperacionesView, type OperacionRow } from "./operaciones-view";

export default async function OperacionesPage() {
  const user = await requireSession();
  const pyme = PYMES.find((p) => p.nit === user.nit);
  const rows: OperacionRow[] = (user.nit ? (CARTERA[user.nit] ?? []) : []).map((o) => ({
    id: o.id,
    numeroFactura: o.numeroFactura,
    pagador: o.pagador,
    valorFactura: o.valorFactura,
    anticipo: o.anticipoDesembolsado,
    estado: o.estado,
    fechaDesembolso: o.fechaDesembolso,
    fechaVencimiento: o.fechaVencimiento,
    fechaPago: o.fechaPago,
  }));
  return <OperacionesView empresa={pyme?.rut.razonSocial ?? "su empresa"} rows={rows} />;
}
