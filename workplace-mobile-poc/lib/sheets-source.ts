/*
 * Google Sheets ingestion layer.
 *
 * Direction is deliberately one-way: sheets are read, never written. The
 * spreadsheets stay the operational source of truth while screens are being
 * built, so a portal bug can never corrupt the team's live data. Writing back
 * only becomes safe once a real database owns the records (handoff P-003).
 *
 * Everything here is pure and runtime-agnostic so it can be unit-tested
 * without credentials or network access. The credential handling and fetch
 * live in the route handler that calls this.
 */

export type SheetColumn = {
  /** header text as it appears in the sheet, trimmed */
  header: string;
  /** field name the app uses */
  field: string;
  /** parsed shape; "raw" keeps the string as-is */
  type?: "raw" | "number" | "won" | "percent" | "date" | "boolean";
  /** drop the row when this column is empty (used for the key column) */
  required?: boolean;
};

export type SheetBinding = {
  /** stable id used by the API route and the screens */
  id: string;
  /** demo label; the internal sheet title stays out of the repo */
  label: string;
  /** A1 notation range, e.g. "출입카드!A1:H500" */
  range: string;
  columns: SheetColumn[];
};

export type SheetRow = Record<string, string | number | boolean | null>;

export type SheetLoadResult = {
  id: string;
  rows: SheetRow[];
  /** rows dropped because a required column was empty */
  skipped: number;
  /** headers present in the sheet but not mapped, so drift is visible */
  unmappedHeaders: string[];
  /** mapped headers the sheet did not actually contain */
  missingHeaders: string[];
};

const WON = /[₩,\s원]/g;

export function parseCell(value: string, type: SheetColumn["type"]): string | number | boolean | null {
  const raw = (value ?? "").trim();
  if (raw === "") return null;

  switch (type) {
    case "number": {
      const n = Number(raw.replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "won": {
      const n = Number(raw.replace(WON, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "percent": {
      const n = Number(raw.replace(/[%\s]/g, ""));
      if (!Number.isFinite(n)) return null;
      // sheets often store 0.82 for 82%
      return n <= 1 && raw.includes(".") ? Math.round(n * 1000) / 10 : n;
    }
    case "date": {
      // accept 2026-08-18, 2026.08.18 and 2026/8/18
      const m = raw.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
      if (!m) return null;
      const [, y, mo, d] = m;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    case "boolean": {
      return ["y", "yes", "true", "o", "완료", "사용", "예"].includes(raw.toLowerCase());
    }
    default:
      return raw;
  }
}

/**
 * Turn a Sheets `values` matrix (first row = headers) into typed rows using a
 * binding. Columns are matched by header text, not position, so inserting a
 * column in the sheet does not silently shift every field.
 */
export function normalizeSheet(binding: SheetBinding, values: string[][]): SheetLoadResult {
  const [headerRow = [], ...dataRows] = values;
  const headers = headerRow.map((h) => (h ?? "").trim());

  const indexByField = new Map<string, number>();
  const missingHeaders: string[] = [];
  for (const column of binding.columns) {
    const index = headers.indexOf(column.header);
    if (index === -1) missingHeaders.push(column.header);
    else indexByField.set(column.field, index);
  }

  const mapped = new Set(binding.columns.map((column) => column.header));
  const unmappedHeaders = headers.filter((header) => header !== "" && !mapped.has(header));

  const rows: SheetRow[] = [];
  let skipped = 0;

  for (const dataRow of dataRows) {
    const row: SheetRow = {};
    let drop = false;

    for (const column of binding.columns) {
      const index = indexByField.get(column.field);
      const parsed = index === undefined ? null : parseCell(dataRow[index] ?? "", column.type);
      if (column.required && parsed === null) drop = true;
      row[column.field] = parsed;
    }

    if (drop) skipped += 1;
    else rows.push(row);
  }

  return { id: binding.id, rows, skipped, unmappedHeaders, missingHeaders };
}

/**
 * Bindings for the domains that are ready to read. Ranges and headers are
 * placeholders until the real sheets are shared with the service account —
 * update `range` and each `header` to the exact sheet text, and the screens
 * pick it up without further changes.
 */
export const sheetBindings: SheetBinding[] = [
  {
    id: "access-cards",
    label: "외부 인원 출입카드 대장",
    range: "출입카드!A1:H1000",
    columns: [
      { header: "카드번호", field: "cardNo", required: true },
      { header: "구분", field: "cardType" },
      { header: "성명", field: "holder" },
      { header: "업체", field: "company" },
      { header: "발급일", field: "issuedAt", type: "date" },
      { header: "만료일", field: "expiresAt", type: "date" },
      { header: "회수여부", field: "returned", type: "boolean" },
      { header: "비고", field: "note" },
    ],
  },
  {
    id: "parking-occupancy",
    label: "정기주차권 입차율 리포트",
    range: "입차율!A1:E200",
    columns: [
      { header: "월", field: "month", required: true },
      { header: "정기권 수", field: "permits", type: "number" },
      { header: "주차면", field: "capacity", type: "number" },
      { header: "입차율", field: "occupancy", type: "percent" },
      { header: "비고", field: "note" },
    ],
  },
  {
    id: "rental-devices",
    label: "렌탈 기기 현황",
    range: "렌탈기기!A1:G500",
    columns: [
      { header: "기기명", field: "device", required: true },
      { header: "업체", field: "vendor" },
      { header: "건물", field: "building" },
      { header: "층", field: "floor" },
      { header: "위치", field: "zone" },
      { header: "계약종료일", field: "contractEndsAt", type: "date" },
      { header: "월 렌탈료", field: "monthlyFee", type: "won" },
    ],
  },
  {
    id: "license-seats",
    label: "AI 도구 좌석 수·CAP 설정",
    range: "라이선스!A1:F200",
    columns: [
      { header: "제품", field: "product", required: true },
      { header: "보유 좌석", field: "seats", type: "number" },
      { header: "사용 좌석", field: "usedSeats", type: "number" },
      { header: "CAP", field: "cap", type: "number" },
      { header: "갱신일", field: "renewsAt", type: "date" },
      { header: "월 비용", field: "monthlyCost", type: "won" },
    ],
  },
];

export function findBinding(id: string): SheetBinding | undefined {
  return sheetBindings.find((binding) => binding.id === id);
}
