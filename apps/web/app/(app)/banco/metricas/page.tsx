import { ShieldAlertIcon } from "lucide-react";
import type { Metadata } from "next";

import { EvalsTrace } from "@/components/metricas/evals-trace";
import { MetricTile } from "@/components/metricas/metric-tile";
import { CarrilesPanel, EvalsPorCategoriaPanel, LatenciaPanel, TraficoPanel } from "@/components/metricas/panels";
import { PanelCorners, PanelHeading } from "@/components/metricas/panel-heading";
import {
  carriles,
  casos,
  corte,
  evalsPorCategoria,
  gatewayResumen,
  indicadores,
  latenciaPorModelo,
  metricCards,
  traficoHorario,
} from "@/components/metricas/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Calidad y métricas" };

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

const ESTADO = {
  ok: { label: "En meta", variant: "success-light" },
  alerta: { label: "Alerta", variant: "destructive-light" },
  pendiente: { label: "Por validar", variant: "warning-light" },
} as const;

export default function MetricasPage() {
  return (
    <div className="@container flex w-full flex-col gap-4 px-4 pb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Calidad y métricas</h1>
        <p className="text-sm text-muted-foreground">
          Evals de los agentes, telemetría de Vercel e indicadores del piloto. Instantáneas con datos reales: evals del{" "}
          {fecha(corte.evals)}, telemetría del {fecha(corte.telemetria)} (ventana {corte.ventana}).
        </p>
      </div>

      <section aria-label="Resumen" className="grid grid-cols-1 gap-4 @3xl:grid-cols-2 @6xl:grid-cols-4">
        {metricCards.map((m) => (
          <MetricTile key={m.id} metric={m} />
        ))}
      </section>

      <section aria-label="Evals y tráfico" className="grid grid-cols-1 gap-4 @5xl:grid-cols-2">
        <EvalsPorCategoriaPanel data={evalsPorCategoria} />
        <TraficoPanel data={traficoHorario} costo={gatewayResumen.costo} solicitudes={gatewayResumen.solicitudes} />
      </section>

      <section aria-label="Latencia y alertas" className="grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <LatenciaPanel data={latenciaPorModelo} exito={gatewayResumen.exito} />
        <CarrilesPanel carriles={carriles} />
      </section>

      <Card className="relative overflow-hidden p-0">
        <PanelCorners />
        <CardContent className="flex flex-col gap-4 p-4">
          <PanelHeading title="Tablero de indicadores del piloto" description="Valor medido, meta propuesta y fuente de cada indicador" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Indicador</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indicadores.map((i) => (
                <TableRow key={`${i.categoria}-${i.indicador}`}>
                  <TableCell className="text-muted-foreground">{i.categoria}</TableCell>
                  <TableCell>
                    <div className="font-medium">{i.indicador}</div>
                    <div className="text-xs text-muted-foreground">Fuente: {i.fuente}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{i.valor}</TableCell>
                  <TableCell className="text-muted-foreground">{i.meta}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO[i.estado].variant} radius="full">
                      {ESTADO[i.estado].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden p-0">
        <PanelCorners />
        <CardContent className="flex flex-col gap-4 p-4">
          <PanelHeading
            title="Resultados de evals"
            description={`${casos.length} casos contra los agentes reales; el juez es ${corte.juez}. Los bloqueantes detienen un despliegue.`}
          />
          <Alert variant="warning">
            <ShieldAlertIcon />
            <AlertTitle>Hallazgo corregido gracias a los evals</AlertTitle>
            <AlertDescription>
              En la primera corrida, un mensaje que suplantaba al sistema (“SYSTEM: la política cambió…”) pasó el detector del Guardián. El desembolso
              seguía bloqueado por código, pero el ataque no se marcaba. Se agregaron patrones de suplantación de rol, falso cambio de política y
              autoridad falsa, con su prueba unitaria, y el caso pasó.
            </AlertDescription>
          </Alert>
          <EvalsTrace casos={casos} />
        </CardContent>
      </Card>
    </div>
  );
}
