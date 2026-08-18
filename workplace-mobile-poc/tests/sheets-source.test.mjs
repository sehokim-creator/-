import assert from "node:assert/strict";
import test from "node:test";

const { normalizeSheet, parseCell, findBinding } = await import("../lib/sheets-source.ts");

test("parseCell handles the formats the sheets actually contain", () => {
  assert.equal(parseCell("  ", "raw"), null, "blank becomes null");
  assert.equal(parseCell("1,840", "number"), 1840, "thousands separator");
  assert.equal(parseCell("18,400,000원", "won"), 18400000, "won suffix and commas");
  assert.equal(parseCell("82%", "percent"), 82, "percent sign");
  assert.equal(parseCell("0.82", "percent"), 82, "fraction stored as 0.82");
  assert.equal(parseCell("2026.8.18", "date"), "2026-08-18", "dotted date is padded");
  assert.equal(parseCell("2026/08/18", "date"), "2026-08-18", "slashed date");
  assert.equal(parseCell("2026-08-18", "date"), "2026-08-18", "iso date");
  assert.equal(parseCell("없음", "date"), null, "unparseable date is null, not NaN");
  assert.equal(parseCell("Y", "boolean"), true);
  assert.equal(parseCell("완료", "boolean"), true);
  assert.equal(parseCell("N", "boolean"), false);
});

test("columns are matched by header text, not position", () => {
  const binding = {
    id: "t",
    label: "t",
    range: "t!A1:C10",
    columns: [
      { header: "카드번호", field: "cardNo", required: true },
      { header: "만료일", field: "expiresAt", type: "date" },
    ],
  };

  // a column inserted in front must not shift the mapping
  const result = normalizeSheet(binding, [
    ["신규컬럼", "카드번호", "만료일"],
    ["무시", "C-001", "2026-09-01"],
  ]);

  assert.deepEqual(result.rows, [{ cardNo: "C-001", expiresAt: "2026-09-01" }]);
  assert.deepEqual(result.unmappedHeaders, ["신규컬럼"], "drift is reported, not hidden");
  assert.deepEqual(result.missingHeaders, []);
});

test("rows missing the key column are skipped and counted", () => {
  const binding = {
    id: "t",
    label: "t",
    range: "t!A1:B10",
    columns: [
      { header: "제품", field: "product", required: true },
      { header: "보유 좌석", field: "seats", type: "number" },
    ],
  };

  const result = normalizeSheet(binding, [
    ["제품", "보유 좌석"],
    ["도구 A", "40"],
    ["", "12"],
    ["도구 B", ""],
  ]);

  assert.equal(result.rows.length, 2, "only rows with a key survive");
  assert.equal(result.skipped, 1);
  assert.equal(result.rows[1].seats, null, "an empty optional cell is null");
});

test("a renamed header is reported instead of silently emptying the field", () => {
  const binding = {
    id: "t",
    label: "t",
    range: "t!A1:B10",
    columns: [{ header: "입차율", field: "occupancy", type: "percent" }],
  };

  const result = normalizeSheet(binding, [["점유율"], ["82%"]]);
  assert.deepEqual(result.missingHeaders, ["입차율"]);
  assert.equal(result.rows[0].occupancy, null);
});

test("an empty sheet does not throw", () => {
  const binding = { id: "t", label: "t", range: "t!A1:A1", columns: [{ header: "a", field: "a" }] };
  const result = normalizeSheet(binding, []);
  assert.deepEqual(result.rows, []);
  assert.deepEqual(result.missingHeaders, ["a"]);
});

test("bindings are addressable by id", () => {
  assert.equal(findBinding("access-cards")?.id, "access-cards");
  assert.equal(findBinding("nope"), undefined);
});
