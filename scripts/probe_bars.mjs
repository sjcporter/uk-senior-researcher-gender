// Probe SVG dimensions + rect attrs of the main bar chart.

import {chromium} from "playwright";

const URL = process.env.URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({width: 1280, height: 900});
await page.goto(`${URL}/institution`, {waitUntil: "networkidle", timeout: 60000});
await page.waitForTimeout(2500);

const probe = await page.evaluate(() => {
  const svgs = [...document.querySelectorAll("svg")]
    .filter((s) => s.querySelectorAll("rect").length > 20);
  return svgs.map((svg) => {
    const rects = [...svg.querySelectorAll("rect")].slice(0, 9).map((r) => ({
      x: r.getAttribute("x"), y: r.getAttribute("y"),
      w: r.getAttribute("width"), h: r.getAttribute("height"),
      fill: r.getAttribute("fill")
    }));
    return {
      viewBox: svg.getAttribute("viewBox"),
      svgWidth: svg.getAttribute("width"),
      svgHeight: svg.getAttribute("height"),
      style: svg.getAttribute("style"),
      clientWidth: svg.clientWidth, clientHeight: svg.clientHeight,
      rectCount: svg.querySelectorAll("rect").length,
      rects
    };
  });
});
console.log(JSON.stringify(probe, null, 2));
await browser.close();
