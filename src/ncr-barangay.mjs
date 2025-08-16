import fs from "node:fs/promises";

// PSA PSGC API base URL
const BASE = "https://psgc.gitlab.io/api";
const NCR_CODE = "130000000"; // National Capital Region

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return res.json();
}

async function main() {
  console.log("Fetching NCR cities/municipality...");
  const cities = await fetchJSON(`${BASE}/regions/${NCR_CODE}/cities-municipalities.json`);

  const ncr = {};

  for (const city of cities) {
    console.log(`→ ${city.name}`);
    const barangays = await fetchJSON(`${BASE}/cities-municipalities/${city.code}/barangays.json`);
    ncr[city.name] = barangays.map(b => b.name);
  }

  const out = `/* Auto-generated from PSGC API */
export const NCR_BARANGAYS = ${JSON.stringify(ncr, null, 2)};
export default NCR_BARANGAYS;
`;

  await fs.writeFile("NCR_BARANGAYS.js", out, "utf8");
  console.log("✅ Done! Wrote NCR_BARANGAYS.js with", Object.keys(ncr).length, "cities/municipality.");
}

main().catch(console.error);