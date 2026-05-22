---
title: By field of research
toc: false
---

# Senior gender balance across institutions, within a single field

Pick a field of research; the views below rank UK institutions by the share of women among their senior researchers in that field, and show the distribution and absolute scale across the sector.

```js
import {DuckDBClient} from "npm:@observablehq/duckdb";
import {rows, GENDER_LABEL, GENDER_ORDER, GENDER_COLORS} from "./components/duck.js";

const db = await DuckDBClient.of({
  agg: FileAttachment("data/uk_senior_gender_agg.parquet")
});
```

```js
const allFors = rows(await db.query(`
  SELECT DISTINCT field_of_research
  FROM agg
  WHERE field_of_research IS NOT NULL
  ORDER BY field_of_research
`));
```

```js
const cutoff = view(Inputs.range([5, 40], {
  value: 20, step: 1,
  label: "Senior cutoff (years)"
}));
```

```js
const fieldOfResearch = view(Inputs.select(
  allFors.map(d => d.field_of_research),
  {value: "Education", label: "Field of research", sort: true, unique: true}
));
```

```js
const minSenior = view(Inputs.range([1, 30], {
  value: 5, step: 1,
  label: "Min senior researchers per institution to include"
}));
```

```js
const raw = rows(await db.query(`
  SELECT
    institution_name,
    CAST(SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'female'  THEN n_researchers ELSE 0 END) AS DOUBLE) AS n_senior_F,
    CAST(SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'male'    THEN n_researchers ELSE 0 END) AS DOUBLE) AS n_senior_M,
    CAST(SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'unknown' THEN n_researchers ELSE 0 END) AS DOUBLE) AS n_senior_U,
    CAST(SUM(n_researchers) AS DOUBLE) AS n_inst_total
  FROM agg
  WHERE field_of_research = '${fieldOfResearch.replace(/'/g, "''")}'
    AND institution_name IS NOT NULL
  GROUP BY institution_name
`));

const enriched = raw
  .map(r => {
    const total = r.n_senior_F + r.n_senior_M + r.n_senior_U;
    return {
      ...r,
      total,
      pct_F: total ? r.n_senior_F / total : 0,
      pct_U: total ? r.n_senior_U / total : 0,
      pct_M: total ? r.n_senior_M / total : 0,
      pct_women_resolved: (r.n_senior_F + r.n_senior_M)
        ? r.n_senior_F / (r.n_senior_F + r.n_senior_M)
        : null
    };
  })
  .filter(r => r.total >= minSenior);

const ukFieldAvg = (() => {
  const f = enriched.reduce((a, r) => a + r.n_senior_F, 0);
  const m = enriched.reduce((a, r) => a + r.n_senior_M, 0);
  return (f + m) ? f / (f + m) : null;
})();
```

The UK average % women among seniors in **${fieldOfResearch}** (institutions shown) is **${ukFieldAvg == null ? "—" : `${(ukFieldAvg * 100).toFixed(1)}%`}**, across **${enriched.length}** institutions with at least ${minSenior} seniors.

## Ranked: institutions by % women among seniors

```js
const topN = view(Inputs.range([10, 60], {value: 30, step: 5, label: "Top N to display"}));
```

```js
const top = enriched
  .filter(r => r.pct_women_resolved != null)
  .sort((a, b) => b.pct_women_resolved - a.pct_women_resolved)
  .slice(0, topN);

const long = top.flatMap(r => [
  {institution_name: r.institution_name, gender: GENDER_LABEL.female,  share: r.pct_F, n: r.n_senior_F, total: r.total},
  {institution_name: r.institution_name, gender: GENDER_LABEL.unknown, share: r.pct_U, n: r.n_senior_U, total: r.total},
  {institution_name: r.institution_name, gender: GENDER_LABEL.male,    share: r.pct_M, n: r.n_senior_M, total: r.total}
]);

display(Plot.plot({
  width,
  height: Math.max(360, 22 * top.length),
  marginLeft: 240,
  x: {label: "Share of senior researchers", percent: true},
  y: {label: null, domain: top.map(r => r.institution_name)},
  color: {
    domain: GENDER_ORDER,
    range: GENDER_ORDER.map(g => GENDER_COLORS[g]),
    legend: true
  },
  marks: [
    Plot.barX(long, {
      x: "share",
      y: "institution_name",
      fill: "gender",
      tip: true,
      channels: {
        Count: d => d.n.toLocaleString(),
        Total: d => d.total.toLocaleString()
      }
    }),
    Plot.text(top, {
      x: 0.005, y: "institution_name",
      text: r => `${(r.pct_women_resolved * 100).toFixed(0)}% women (n=${r.total})`,
      fill: "white", textAnchor: "start", fontSize: 11
    })
  ]
}));
```

## Distribution: % women among seniors across UK institutions

```js
display(Plot.plot({
  width,
  height: 320,
  x: {label: "% women among seniors", percent: true},
  y: {label: "Institutions", grid: true},
  marks: [
    Plot.rectY(enriched.filter(r => r.pct_women_resolved != null), Plot.binX({y: "count"}, {x: "pct_women_resolved", fill: "#5b3789", thresholds: 20})),
    ukFieldAvg != null ? Plot.ruleX([ukFieldAvg], {stroke: "orange", strokeWidth: 2, strokeDasharray: "4 4"}) : null,
    Plot.ruleX([0.5], {stroke: "grey", strokeDasharray: "2 4"})
  ]
}));
```

Orange dashed line = UK average for this field (${ukFieldAvg == null ? "—" : `${(ukFieldAvg * 100).toFixed(1)}%`}). Grey dotted line = 50% parity.

## Scatter: count vs share

The original report's "population percentile" view. Each dot is an institution. X = % women among seniors, Y = absolute number of senior women (log scale). Dots in the top-right are large *and* gender-balanced; large dots far to the left are big institutions where seniors are mostly men.

```js
const scatterData = enriched.filter(r => r.pct_women_resolved != null && r.n_senior_F > 0);
display(Plot.plot({
  width,
  height: 480,
  marginLeft: 60,
  x: {label: "% women among seniors →", percent: true, grid: true},
  y: {label: "↑ Number of senior women", type: "log", grid: true},
  r: {range: [3, 20]},
  marks: [
    Plot.ruleX([0.5], {stroke: "grey", strokeDasharray: "2 4"}),
    ...(ukFieldAvg != null ? [Plot.ruleX([ukFieldAvg], {stroke: "orange", strokeDasharray: "4 4"})] : []),
    Plot.dot(scatterData, {
      x: "pct_women_resolved",
      y: "n_senior_F",
      r: "total",
      fill: GENDER_COLORS.Women,
      fillOpacity: 0.5,
      stroke: "black",
      strokeOpacity: 0.4,
      tip: true,
      channels: {
        Institution: "institution_name",
        Seniors: d => d.total.toLocaleString(),
        "Senior women": d => d.n_senior_F.toLocaleString()
      }
    }),
    Plot.text(
      scatterData
        .slice()
        .sort((a, b) => b.n_senior_F - a.n_senior_F)
        .slice(0, 6),
      {
        x: "pct_women_resolved",
        y: "n_senior_F",
        text: d => d.institution_name.slice(0, 30),
        dy: -10, fontSize: 11
      }
    )
  ]
}));
```

## Table

```js
display(Inputs.table(
  enriched.sort((a, b) => (b.pct_women_resolved ?? -1) - (a.pct_women_resolved ?? -1)),
  {
    columns: ["institution_name", "total", "n_senior_F", "n_senior_M", "n_senior_U", "pct_women_resolved"],
    header: {
      institution_name: "Institution",
      total: "Seniors",
      n_senior_F: "Women",
      n_senior_M: "Men",
      n_senior_U: "Unknown",
      pct_women_resolved: "% women (of resolved)"
    },
    format: {
      pct_women_resolved: x => x == null ? "—" : `${(x * 100).toFixed(1)}%`
    },
    rows: 30,
    width: {institution_name: 320}
  }
));
```
