import fs from "node:fs/promises";


// Example open dataset of PH postal codes (PhilPost CSV scraped to JSON)
const POSTAL_CODE_DATA_URL = "https://raw.githubusercontent.com/juanir/phtools-data/main/philippines_postal_codes.json";

async function main() {
  console.log("Fetching postal codes...");
  const res = await fetch(POSTAL_CODE_DATA_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const postalData = await res.json(); // [{province, city, postal_code}, ...]

  // Group by province, then city
  const grouped = {};
  for (const { province, city, postal_code } of postalData) {
    if (!grouped[province]) grouped[province] = {};
    grouped[province][city] = postal_code;
  }

  // Save as JS file
  const output = `/* Auto-generated Philippine postal codes */
export const PH_POSTAL_CODES = ${JSON.stringify(grouped, null, 2)};
export default PH_POSTAL_CODES;
`;
  await fs.writeFile("PH_POSTAL_CODES.js", output, "utf8");

  console.log("✅ PH_POSTAL_CODES.js created with", Object.keys(grouped).length, "provinces.");
}

main().catch(console.error);