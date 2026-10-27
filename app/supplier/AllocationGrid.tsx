"use client";

import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import { CellStyleModule, ClientSideRowModelModule, CsvExportModule, ModuleRegistry, PinnedRowModule, ValidationModule, themeQuartz, type ColDef } from "ag-grid-community";
import { useMemo, type Ref } from "react";
import StatusChip, { type ChipStatus } from "@/components/StatusChip";
import { formatUSD, toMoney } from "@/lib/money";
import { capitalise, savingsCents, type Round } from "@/lib/round";
import type { Commitment, RoundState } from "@/lib/store";
import { GHOST_SM } from "./ui";

ModuleRegistry.registerModules([ClientSideRowModelModule, PinnedRowModule, CellStyleModule, CsvExportModule, ...(process.env.NODE_ENV === "production" ? [] : [ValidationModule])]);

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
  simulated?: boolean;
  address?: string;
  unit?: number;
  goods?: number;
  captureId?: string;
  invoiceNumber?: string;
  invoice?: "paid" | "refunded" | "error" | "pending";
  invoiceError?: string;
  tracking?: string;
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

export type GridHandle = AgGridReact<Row>;
type Props = { state: RoundState; busyId: string | null; disabled: boolean; onDeliver: (c: { id: string; shop: string }) => void; ref?: Ref<GridHandle> };

// Purchase-order CSV: one row per shop, money as plain dollars; hidden columns carry what the grid doesn't show.
const PO: [keyof Row, string][] = [
  ["shop", "Shop"],
  ["address", "Delivery address"],
  ["qty", ""], // the round's unit, e.g. "Rolls"
  ["unit", "Unit price"],
  ["goods", "Goods"],
  ["delivery", "Delivery"],
  ["captured", "Total captured"],
  ["captureId", "PayPal capture id"],
  ["invoiceNumber", "Invoice number"],
  ["tracking", "Tracking"],
];
const PO_MONEY = new Set(["unit", "goods", "delivery", "captured"]);

// A leading apostrophe stops spreadsheets from running a cell as a formula (OWASP CSV injection set).
const safe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

/** Addresses never reach the browser's round state, so they come from the supplier-only purchase-order route. */
export function exportPurchaseOrder(grid: GridHandle | null, round: Round, addresses: Record<string, string | undefined>) {
  grid?.api.exportDataAsCsv({
    fileName: `shoal-${round.id}-purchase-order.csv`,
    columnKeys: PO.map(([k]) => k),
    skipPinnedBottom: true,
    shouldRowBeSkipped: ({ node }) => node.data?.captured === undefined,
    processHeaderCallback: ({ column }) => (column.getColId() === "qty" ? capitalise(round.unit.many) : (PO.find(([k]) => k === column.getColId())?.[1] ?? column.getColId())),
    processCellCallback: ({ column, value, node }) => {
      const key = column.getColId();
      const v = key === "address" ? addresses[node?.data?.id ?? ""] : value;
      return v === undefined || v === null ? "" : PO_MONEY.has(key) ? toMoney(v) : safe(String(v));
    },
  });
}

function invoiceState(c: Commitment): Row["invoice"] {
  if (c.simulated || c.captured === undefined) return undefined;
  return c.invoiceError ? "error" : (c.invoiceStatus ?? "pending");
}

/** Who committed what, what was reserved and captured, and where each delivery stands. */
export default function AllocationGrid({ state, busyId, disabled, onDeliver, ref }: Props) {
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
        simulated: c.simulated,
        unit: c.captured === undefined ? undefined : round.finalPrice,
        goods: c.captured === undefined ? undefined : c.captured - c.delivery,
        captureId: c.captureId,
        invoiceNumber: c.invoiceNumber,
        invoice: invoiceState(c),
        invoiceError: c.invoiceError,
        tracking: c.tracking,
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
      { field: "shop", headerName: "Shop", flex: 2, minWidth: 186, cellRenderer: Shop },
      { field: "qty", headerName: capitalise(round.unit.many), type: "rightAligned", minWidth: 92, flex: 0.5, valueFormatter: ({ value }) => value.toLocaleString("en-US") },
      { field: "reserved", headerName: "Reserved", type: "rightAligned", minWidth: 92, flex: 0.6, valueFormatter: money },
      { field: "delivery", headerName: "Delivery cost", type: "rightAligned", minWidth: 118, flex: 0.5, valueFormatter: money },
      { field: "captured", headerName: "Captured", type: "rightAligned", minWidth: 92, flex: 0.6, valueFormatter: money },
      { field: "saved", headerName: "Saved", type: "rightAligned", minWidth: 80, flex: 0.5, valueFormatter: money, cellClass: `${RIGHT} font-semibold text-leaf-ink` },
      { field: "status", headerName: "Delivery", minWidth: 176, flex: 0.8, cellRenderer: Delivery }, // fits the widest chip, "Out for delivery"
      { field: "refunded", headerName: "Refunded", type: "rightAligned", minWidth: 100, flex: 0.5, valueFormatter: ({ value }) => (value ? formatUSD(value) : "—") },
      { field: "invoice", headerName: "Invoice", minWidth: 110, flex: 0.8, cellRenderer: Invoice },
      ...(["address", "unit", "goods", "captureId", "invoiceNumber", "tracking"] as const).map((field) => ({ field, hide: true })),
      {
        colId: "action",
        headerName: "Action",
        minWidth: 228,
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
    [busyId, disabled, onDeliver, round.unit.many],
  );

  return (
    <div className="shoal-grid overflow-hidden rounded-lg bg-white px-2 py-1.5 shadow-base">
      <AgGridReact<Row>
        ref={ref}
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
  if (!data?.status) return null;
  // Once shipped, the tracking number sits under the chip (same two-line pattern as the Invoice cell).
  return (
    <span className="flex h-full flex-col items-start justify-center gap-0.5 leading-tight">
      <StatusChip status={data.status} />
      {data.tracking && <span className="text-xs text-muted tabular-nums">{data.tracking}</span>}
    </span>
  );
}

function Invoice({ data }: CustomCellRendererProps<Row>) {
  if (!data || data.total) return null;
  if (data.simulated) return <span className="text-[13px] text-muted">Demo shop</span>;
  if (!data.invoice) return <span className="text-muted">—</span>;
  const word = { paid: "Paid", refunded: "Refunded", error: "Error", pending: "Pending" }[data.invoice];
  return (
    <span className="flex h-full flex-col justify-center leading-tight" title={[data.invoiceNumber, data.invoiceError].filter(Boolean).join(" · ") || undefined}>
      {data.invoiceNumber && <span className="truncate text-[13px] tabular-nums">{data.invoiceNumber}</span>}
      <span className={`text-[13px] font-semibold ${data.invoice === "error" ? "text-jam" : data.invoice === "pending" ? "text-muted" : ""}`}>{word}</span>
    </span>
  );
}
