---
title: Overview
toc: false
---

# UK Senior Researcher Gender Analysis

Where is the UK research workforce most concentrated in senior researchers, and how is gender distributed within that cohort? Move the controls to re-cut the data live.

```js
import {DuckDBClient} from "npm:@observablehq/duckdb";

const db = await DuckDBClient.of({
  agg: FileAttachment("data/uk_senior_gender_agg.parquet")
});
```

```js
const cutoff = view(Inputs.range([5, 40], {
  value: 20, step: 1,
  label: "Senior cutoff (years of publication history)"
}));
```

```js
const minSize = view(Inputs.select(
  [50, 100, 200, 500, 1000, 2000, 5000],
  {value: 500, label: "Minimum institution size (total UK researchers)"}
));
```

```js
const topN = view(Inputs.range([10, 50], {
  value: 25, step: 5,
  label: "Top N institutions to show"
}));
```

```js
const institutions = await db.query(`
  WITH base AS (
    SELECT
      institution_name,
      SUM(n_researchers) AS n_total,
      SUM(CASE WHEN publication_age >= ${cutoff} THEN n_researchers ELSE 0 END) AS n_senior,
      SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'female' THEN n_researchers ELSE 0 END) AS n_senior_F,
      SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'male'   THEN n_researchers ELSE 0 END) AS n_senior_M,
      SUM(CASE WHEN gender = 'female' THEN n_researchers ELSE 0 END) AS n_F,
      SUM(CASE WHEN gender = 'male'   THEN n_researchers ELSE 0 END) AS n_M
    FROM agg
    WHERE institution_name IS NOT NULL
    GROUP BY institution_name
  )
  SELECT *,
    n_senior * 1.0 / NULLIF(n_total, 0)                      AS pct_senior,
    n_senior_F * 1.0 / NULLIF(n_senior_F + n_senior_M, 0)    AS pct_women_among_seniors,
    n_F        * 1.0 / NULLIF(n_F        + n_M,        0)    AS pct_women_overall
  FROM base
  WHERE n_total >= ${minSize}
  ORDER BY pct_senior DESC
`);
```

```js
const ukAll = await db.query(`
  SELECT
    SUM(n_researchers) AS n_total,
    SUM(CASE WHEN publication_age >= ${cutoff} THEN n_researchers ELSE 0 END) AS n_senior,
    SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'female' THEN n_researchers ELSE 0 END) AS n_senior_F,
    SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'male'   THEN n_researchers ELSE 0 END) AS n_senior_M,
    SUM(CASE WHEN gender = 'female' THEN n_researchers ELSE 0 END) AS n_F,
    SUM(CASE WHEN gender = 'male'   THEN n_researchers ELSE 0 END) AS n_M
  FROM agg
`);
const uk = ukAll[0];
const pctSeniorUK = uk.n_senior / uk.n_total;
const pctWomenSeniorUK = uk.n_senior_F / (uk.n_senior_F + uk.n_senior_M);
const pctWomenOverallUK = uk.n_F / (uk.n_F + uk.n_M);
```

## UK headline numbers

<div class="grid grid-cols-4">
  <div class="card">
    <h2>UK researchers</h2>
    <span class="big">${uk.n_total.toLocaleString()}</span>
  </div>
  <div class="card">
    <h2>Senior researchers (≥${cutoff}y)</h2>
    <span class="big">${uk.n_senior.toLocaleString()}</span>
    <span>${(pctSeniorUK * 100).toFixed(1)}% of UK total</span>
  </div>
  <div class="card">
    <h2>% women — all researchers</h2>
    <span class="big">${(pctWomenOverallUK * 100).toFixed(1)}%</span>
    <span>of gender-resolved UK total</span>
  </div>
  <div class="card">
    <h2>% women — seniors only</h2>
    <span class="big">${(pctWomenSeniorUK * 100).toFixed(1)}%</span>
    <span>${(pctWomenOverallUK - pctWomenSeniorUK > 0 ? "−" : "+")}${(Math.abs(pctWomenOverallUK - pctWomenSeniorUK) * 100).toFixed(1)} pp gap vs all</span>
  </div>
</div>

## Institutions over-indexed on senior researchers

The chart below ranks UK institutions by the share of their researchers who are senior (publication history ≥ ${cutoff} years). The orange line is the UK-wide average — bars to the right of it are over-indexed on seniors, bars to the left under-indexed. Only institutions with at least **${minSize.toLocaleString()}** total UK researchers are shown. Bar colour shows whether the senior cohort at that institution skews more or less female than the UK senior baseline of ${(pctWomenSeniorUK * 100).toFixed(0)}%.

```js
const top = institutions.slice(0, topN);
display(Plot.plot({
  width,
  height: Math.max(360, 22 * top.length),
  marginLeft: 280,
  marginRight: 80,
  x: {label: "% senior", percent: true, grid: true},
  y: {label: null, domain: top.map(d => d.institution_name).reverse()},
  color: {
    type: "diverging",
    scheme: "PiYG",
    pivot: pctWomenSeniorUK,
    domain: [pctWomenSeniorUK - 0.20, pctWomenSeniorUK + 0.20],
    label: "% women among seniors",
    legend: true
  },
  marks: [
    Plot.barX(top, {
      x: "pct_senior",
      y: "institution_name",
      fill: "pct_women_among_seniors",
      tip: true,
      channels: {
        "Senior / total": d => `${d.n_senior.toLocaleString()} / ${d.n_total.toLocaleString()}`,
        "% women among seniors": d => `${(d.pct_women_among_seniors * 100).toFixed(1)}%`,
        "% women overall": d => `${(d.pct_women_overall * 100).toFixed(1)}%`
      }
    }),
    Plot.ruleX([pctSeniorUK], {stroke: "orange", strokeWidth: 2, strokeDasharray: "4 4"}),
    Plot.text([{x: pctSeniorUK, y: top[0].institution_name}], {
      x: "x", y: "y",
      text: () => `UK avg = ${(pctSeniorUK * 100).toFixed(1)}%`,
      fill: "orange", fontWeight: "bold", dx: 8, frameAnchor: "right"
    })
  ]
}));
```

## Seniority concentration vs senior gender balance

Two axes plotted together: x = how senior-skewed the institution is, y = how gender-balanced its senior cohort is. The **bottom-right** quadrant (over-indexed on seniors *and* under-indexed on women) is where attention is usually warranted — typically older, male-dominated workforces. Dot size = total UK researchers.

```js
display(Plot.plot({
  width,
  height: 520,
  marginLeft: 60,
  marginBottom: 50,
  x: {label: "% senior →", percent: true, grid: true},
  y: {label: "↑ % women among seniors", percent: true, grid: true},
  r: {range: [3, 22]},
  marks: [
    Plot.ruleX([pctSeniorUK], {stroke: "orange", strokeDasharray: "4 4"}),
    Plot.ruleY([pctWomenSeniorUK], {stroke: "grey", strokeDasharray: "4 4"}),
    Plot.dot(institutions, {
      x: "pct_senior",
      y: "pct_women_among_seniors",
      r: "n_total",
      fill: "#5b3789",
      fillOpacity: 0.55,
      stroke: "black",
      strokeOpacity: 0.4,
      tip: true,
      channels: {
        Institution: "institution_name",
        "Total researchers": d => d.n_total.toLocaleString(),
        Seniors: d => d.n_senior.toLocaleString(),
        "% senior": d => `${(d.pct_senior * 100).toFixed(1)}%`,
        "% women among seniors": d => d.pct_women_among_seniors == null ? "—" : `${(d.pct_women_among_seniors * 100).toFixed(1)}%`
      }
    }),
    Plot.text(institutions.slice(0, 8), {
      x: "pct_senior",
      y: "pct_women_among_seniors",
      text: "institution_name",
      dy: -10,
      fontSize: 11,
      fill: "#333"
    })
  ]
}));
```

## All institutions (sortable)

```js
display(Inputs.table(institutions, {
  columns: [
    "institution_name", "n_total", "n_senior",
    "pct_senior", "pct_women_among_seniors", "pct_women_overall"
  ],
  header: {
    institution_name: "Institution",
    n_total: "Total",
    n_senior: "Senior",
    pct_senior: "% senior",
    pct_women_among_seniors: "% F (seniors)",
    pct_women_overall: "% F (all)"
  },
  format: {
    n_total: x => x.toLocaleString(),
    n_senior: x => x.toLocaleString(),
    pct_senior: x => x == null ? "—" : `${(x * 100).toFixed(1)}%`,
    pct_women_among_seniors: x => x == null ? "—" : `${(x * 100).toFixed(1)}%`,
    pct_women_overall: x => x == null ? "—" : `${(x * 100).toFixed(1)}%`
  },
  rows: 30,
  width: {institution_name: 360}
}));
```

<style>
.big { font-size: 2.0rem; font-weight: 600; display: block; margin: 0.2rem 0; }
.card { padding: 1rem; }
.card h2 { font-size: 0.85rem; text-transform: uppercase; color: var(--theme-foreground-muted); margin: 0 0 0.25rem 0; }
</style>
