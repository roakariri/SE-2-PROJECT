import fs from "node:fs/promises";

const BASE = "https://psgc.gitlab.io/api";

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

async function main() {
  console.log("Fetching provinces...");
  const provinces = await fetchJSON(`${BASE}/provinces.json`);

  const result = {};

  for (const prov of provinces) {
    console.log(`→ ${prov.name}`);
    result[prov.name] = {};

    const cities = await fetchJSON(
      `${BASE}/provinces/${prov.code}/cities-municipalities.json`
    );

    for (const city of cities) {
      const barangays = await fetchJSON(
        `${BASE}/cities-municipalities/${city.code}/barangays.json`
      );

      result[prov.name][city.name] = barangays.map((b) => b.name);
    }
  }

  const out = `/* Auto-generated from PSGC API */
export const PH_BARANGAYS = ${JSON.stringify(result, null, 2)};
export default PH_BARANGAYS;`;

  await fs.writeFile("PH_BARANGAYS.js", out, "utf8");
  console.log("✅ Done! Wrote PH_BARANGAYS.js");
}

main().catch(console.error);