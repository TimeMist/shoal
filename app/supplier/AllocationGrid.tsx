"use client";

import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import { CellStyleModule, ClientSideRowModelModule, ModuleRegistry, PinnedRowModule, ValidationModule, themeQuartz, type ColDef } from "ag-grid-community";
import { useMemo } from "react";
import StatusChip, { type ChipStatus } from "@/components/StatusChip";
import { formatUSD } from "@/lib/money";
import { savingsCents } from "@/lib/round";
import type { Commitment, RoundState } from "@/lib/store";
import { GHOST_SM } from "./ui";

ModuleRegistry.registerModules([ClientSideRowModelModule, PinnedRowModule, CellStyleModule, ...(process.env.NODE_ENV === "production" ? [] : [ValidationModule])]);

// Shoal tokens (DESIGN.md: Data views): Funnel Sans, Jam 11px headers on #FFFBFB, Rule lines, Pool Well hover.
const shoalTheme = themeQuartz.withParams({
  fontFamily: "var(--font-funnel-sans), system-ui, sans-serif",
  fontSize: 14,
  foregroundColor: "#1F0A24",
  backgroundColor: "#FFFFFF",
  borderColor: "#F1DFE3",
  accentColor: "#E0146F",
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  columnBorder: false,
  headerBackgroundColor: "#FFFBFB",
  headerTextColor: "#7A0E3A",
  headerFontSize: 11,
  headerFontWeight: 600,
  headerHeight: 40,
  rowHeight: 50,
  rowHoverColor: "#FFF1F4",
  cellHorizontalPadding: 14,
  pinnedRowBackgroundColor: "#FFFBFB",
  pinnedRowFontWeight: 700,
});

type Row = {
  id: string;
  shop: string;
  qty: number;
  reserved: number;
  delivery: number;
  captured?: number;
  saved?: number;
  refunded: number;
  status?: ChipStatus;
  /** Why "Mark delivered" is unavailable; undefined when it can run. Empty when there's nothing to say. */
  blocked?: string;
  total?: true;
};

export const deliveryStatus = (c: Commitment): ChipStatus => (c.status === "captured" && c.tracking ? "shipped" : c.status);

function blockedReason(c: Commitment): string | undefined {
  if (c.status === "captured") return c.tracking ? undefined : "Ship first";
  if (c.status === "reserved") return "";
  return "";
}

const money = ({ value }: { value: number | undefined }) => (value === undefined ? "—" : formatUSD(value));
const RIGHT = "ag-right-aligned-cell";

type Props = { state: RoundState; busyId: string | null; disabled: boolean; onDeliver: (c: { id: string; shop: string }) => void };

/** Who committed what, what was reserved and captured, and where each delivery stands. */
export default function AllocationGrid({ state, busyId, disabled, onDeliver }: Props) {
  const { round, commitments } = state;
  const rows = useMemo<Row[]>(
    () =>
      commitments.map((c) => ({
        id: c.id,
        shop: c.shop,
        qty: c.qty,
        reserved: c.reserved,
        delivery: c.delivery,
        captured: c.captured,
        saved: c.captured === undefined ? undefined : savingsCents(round, c.qty, c.captured),
        refunded: c.refunded,
        status: deliveryStatus(c),
        blocked: blockedReason(c),
      })),
    [commitments, round],
  );
  const total = useMemo<Row[]>(() => {
    const sum = (k: "qty" | "reserved" | "delivery" | "captured" | "saved" | "refunded") => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
    const any = rows.some((r) => r.captured !== undefined);
    return [{
      id: "total",
      shop: `${rows.length} ${rows.length === 1 ? "shop" : "shops"}`,
      qty: sum("qty"),
      reserved: sum("reserved"),
      delivery: sum("delivery"),
      captured: any ? sum("captured") : undefined,
      saved: any ? sum("saved") : undefined,
      refunded: sum("refunded"),
      total: true,
    }];
  }, [rows]);

  const columns = useMemo<ColDef<Row>[]>(
    () => [
      { field: "shop", headerName: "Shop", flex: 1.2, minWidth: 180, cellRenderer: Shop },
      { field: "qty", headerName: "Cartons", type: "rightAligned", minWidth: 100, flex: 0.7, valueFormatter: ({ value }) => value.toLocaleString("en-US") },
      { field: "reserved", headerName: "Reserved", type: "rightAligned", minWidth: 120, flex: 0.9, valueFormatter: money },
      { field: "delivery", headerName: "Delivery cost", type: "rightAligned", minWidth: 110, flex: 0.8, valueFormatter: money },
      { field: "captured", headerName: "Captured", type: "rightAligned", minWidth: 120, flex: 0.9, valueFormatter: money },
      { field: "saved", headerName: "Saved", type: "rightAligned", minWidth: 110, flex: 0.8, valueFormatter: money, cellClass: `${RIGHT} font-semibold text-leaf-ink` },
      { field: "status", headerName: "Delivery", minWidth: 170, flex: 1, cellRenderer: Delivery },
      { field: "refunded", headerName: "Refunded", type: "rightAligned", minWidth: 110, flex: 0.8, valueFormatter: ({ value }) => (value ? formatUSD(value) : "—") },
      {
        colId: "action",
        headerName: "Action",
        minWidth: 170,
        flex: 1,
        cellRenderer: (p: CustomCellRendererProps<Row>) => {
          const r = p.data;
          if (!r || r.total || r.blocked === "") return null;
          const busy = busyId === r.id;
          return (
            <span className="flex h-full items-center gap-2 leading-normal">
              <button
                type="button"
                className={GHOST_SM}
                disabled={r.blocked !== undefined || disabled}
                aria-busy={busy || undefined}
                aria-label={`Mark ${r.shop} delivered`}
                onClick={() => onDeliver({ id: r.id, shop: r.shop })}
              >
                {busy ? "Marking" : "Mark delivered"}
              </button>
              {r.blocked && <span className="text-[13px] text-muted">{r.blocked}</span>}
            </span>
          );
        },
      },
    ],
    [busyId, disabled, onDeliver],
  );

  return (
    <div className="shoal-grid overflow-hidden rounded-lg bg-white px-2 py-1.5 shadow-base">
      <AgGridReact<Row>
        theme={shoalTheme}
        rowData={rows}
        pinnedBottomRowData={total}
        columnDefs={columns}
        defaultColDef={{ sortable: false, resizable: false, suppressMovable: true }}
        getRowId={(p) => p.data.id}
        domLayout="autoHeight"
        suppressCellFocus
        suppressColumnVirtualisation // keep every Action button in the DOM so it stays tabbable on narrow screens
        overlayNoRowsTemplate="No shops have joined yet."
      />
    </div>
  );
}

function Shop({ data }: CustomCellRendererProps<Row>) {
  if (!data) return null;
  if (data.total) return <span>{data.shop}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <i aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-coral" />
      {data.shop}
    </span>
  );
}

function Delivery({ data }: CustomCellRendererProps<Row>) {
  return data?.status ? <span className="flex h-full items-center leading-normal"><StatusChip status={data.status} /></span> : null;
}
