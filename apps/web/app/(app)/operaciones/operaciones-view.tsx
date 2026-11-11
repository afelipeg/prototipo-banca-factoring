"use client";

import { ReceiptTextIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DataTable } from "@/components/app/data-table";
import { Badge } from "@/components/reui/badge";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatCop, formatDate } from "@/lib/format";
import type { ColumnDef } from "@tanstack/react-table";

export type OperacionRow = {
  readonly id: string;
  readonly numeroFactura: string;
  readonly pagador: string;
  readonly valorFactura: number;
  readonly anticipo: number;
  readonly estado: "pagada" | "activa";
  readonly fechaDesembolso: string;
  readonly fechaVencimiento: string;
  readonly fechaPago?: string;
};

function diasHasta(iso: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00`);
  return Math.round((d.getTime() - hoy.getTime()) / 86_400_000);
}

function vencimiento(row: OperacionRow): string {
  if (row.estado === "pagada") return row.fechaPago ? `Pagada el ${formatDate(row.fechaPago)}` : "Pagada";
  const dias = diasHasta(row.fechaVencimiento);
  if (dias === 0) return "Vence hoy";
  if (dias > 0) return `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
  return `Vencida hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`;
}

const NUM = { headerClassName: "text-end [&>div]:justify-end", cellClassName: "text-end tabular-nums" };

export function OperacionesView({ empresa, rows }: { readonly empresa: string; readonly rows: readonly OperacionRow[] }) {
  const columns = useMemo<ColumnDef<DataGridFeatures, OperacionRow>[]>(
    () => [
      { accessorKey: "numeroFactura", header: ({ column }) => <DataGridColumnHeader title="Factura" column={column} />, cell: ({ row }) => <span className="font-medium">{row.original.numeroFactura}</span>, meta: { skeleton: null } },
      { accessorKey: "pagador", header: ({ column }) => <DataGridColumnHeader title="Pagador" column={column} /> },
      { accessorKey: "valorFactura", header: ({ column }) => <DataGridColumnHeader title="Valor factura" column={column} />, cell: ({ row }) => formatCop(row.original.valorFactura), meta: NUM },
      { accessorKey: "anticipo", header: ({ column }) => <DataGridColumnHeader title="Anticipo desembolsado" column={column} />, cell: ({ row }) => formatCop(row.original.anticipo), meta: NUM },
      { accessorKey: "fechaDesembolso", header: ({ column }) => <DataGridColumnHeader title="Desembolso" column={column} />, cell: ({ row }) => formatDate(row.original.fechaDesembolso) },
      { id: "vence", header: "Vencimiento", cell: ({ row }) => vencimiento(row.original) },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) =>
          row.original.estado === "pagada" ? <Badge variant="success-light">Pagada</Badge> : <Badge variant="info-light">Activa</Badge>,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight">Mis operaciones</h1>
        <p className="text-sm text-muted-foreground">Descuentos de facturas de {empresa}. Datos sintéticos.</p>
      </div>
      <Frame>
        <FrameHeader>
          <FrameTitle>Cartera de factoring</FrameTitle>
          <FrameDescription>Operaciones desembolsadas y su estado</FrameDescription>
        </FrameHeader>
        {rows.length === 0 ? (
          <FramePanel>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptTextIcon />
              </EmptyMedia>
              <EmptyTitle>Aún no tiene operaciones</EmptyTitle>
              <EmptyDescription>Cuando descuente su primera factura, la verá aquí.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/asesor">Hablar con el asesor</Link>
              </Button>
            </EmptyContent>
          </Empty>
          </FramePanel>
        ) : (
          <DataTable data={rows} columns={columns} />
        )}
      </Frame>
    </div>
  );
}
