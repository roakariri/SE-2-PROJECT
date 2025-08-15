// build-ph-cities-by-province.mjs
// Usage: node build-ph-cities-by-province.mjs
import fs from "node:fs/promises";

const BASE = "https://psgc.gitlab.io/api";

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

async function main() {
  // 1) Get all provinces (82 total)
  const provinces = await fetchJSON(`${BASE}/provinces.json`);

  // 2) For each province, fetch its cities+municipalities
  const entries = await Promise.all(
    provinces.map(async (prov) => {
      // prov example has { code, name, ... }
      const list = await fetchJSON(
        `${BASE}/provinces/${prov.code}/cities-municipalities.json`
      );

      // Normalize to names only; keep "City" suffixes and hyphens as-is
      const names = list
        .map((x) => x.name)
        .sort((a, b) => a.localeCompare(b, "en"));

      return [prov.name, names];
    })
  );

  // 3) Build object literal (alphabetized by province)
  const sorted = Object.fromEntries(
    entries.sort((a, b) => a[0].localeCompare(b[0], "en"))
  );

  // 4) Emit as a JS module with your requested constant name
  const out = `/* Auto-generated from PSGC on ${new Date().toISOString()} */
export const PH_CITIES_BY_PROVINCE = ${JSON.stringify(sorted, null, 2)};
export default PH_CITIES_BY_PROVINCE;
`;
  await fs.writeFile("PH_CITIES_BY_PROVINCE.js", out, "utf8");
  console.log("Wrote PH_CITIES_BY_PROVINCE.js with", entries.length, "provinces.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});