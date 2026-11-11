"use client";

import { type ColumnDef, useTable } from "@tanstack/react-table";
import { type ReactNode, useMemo } from "react";
import { DataGrid, type DataGridFeatures, dataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { FramePanel } from "@/components/reui/frame";

const I18N = {
  labels: {
    loading: "Cargando…",
    empty: "No hay datos para mostrar",
    rowsPerPage: "Filas por página",
    paginationInfo: ({ from, to, count }: { from: number; to: number; count: number }) => `${from} - ${to} de ${count}`,
    previousPage: "Página anterior",
    nextPage: "Página siguiente",
    goToPage: (page: number) => `Ir a la página ${page}`,
    sortAscending: "Ascendente",
    sortDescending: "Descendente",
  },
};

/** Tabla de solo lectura sobre `data-grid`, dentro de un Frame (el llamador pone el Frame). */
export function DataTable<T extends object>({
  data,
  columns,
  isLoading,
  emptyMessage,
  onRowClick,
  paginate = true,
}: {
  readonly data: readonly T[];
  readonly columns: ColumnDef<DataGridFeatures, T>[];
  readonly isLoading?: boolean;
  readonly emptyMessage?: ReactNode;
  readonly onRowClick?: (row: T) => void;
  readonly paginate?: boolean;
}) {
  const rows = useMemo(() => [...data], [data]);
  const table = useTable({ features: dataGridFeatures, data: rows, columns });
  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      onRowClick={onRowClick}
      i18n={I18N}
      tableLayout={{ headerSticky: true }}
      tableClassNames={{ base: "min-w-[860px]" }}
    >
      <FramePanel className="p-0">
        <DataGridScrollArea>
          <DataGridTable />
        </DataGridScrollArea>
      </FramePanel>
      {paginate && rows.length > 10 ? <DataGridPagination /> : null}
    </DataGrid>
  );
}
