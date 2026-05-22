// Convert a DuckDB-WASM / Apache Arrow Table to a plain array of JS objects.
//
// Why this exists: `table.toArray()` in some Arrow JS / DuckDB-WASM combinations
// returns row proxies that don't behave like plain objects — accessing a field
// by name can give back the underlying TypedArray rather than the scalar value,
// which then breaks `.toLocaleString()`, arithmetic, etc.
//
// Using `table.getChild(field).get(rowIndex)` is the official, stable way to
// read a single scalar value out of an Arrow column.

export function rows(table) {
  const fields = table.schema.fields.map(f => f.name);
  const cols = Object.fromEntries(fields.map(f => [f, table.getChild(f)]));
  const out = new Array(table.numRows);
  for (let i = 0; i < table.numRows; i++) {
    const row = {};
    for (const f of fields) row[f] = cols[f].get(i);
    out[i] = row;
  }
  return out;
}

// Human-facing labels for the gender categories. Internal storage stays
// 'female'/'male'/'unknown' (that's what the lookup returned); these are the
// strings to display in legends, tables, and tooltips.
export const GENDER_LABEL = {
  female: "Women",
  male: "Men",
  unknown: "Unknown"
};

export const GENDER_ORDER = ["Women", "Unknown", "Men"];

export const GENDER_COLORS = {
  Women: "#F58220",
  Unknown: "#7FB539",
  Men: "#1F77B4"
};
