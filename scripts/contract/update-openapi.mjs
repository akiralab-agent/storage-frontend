import fs from "node:fs/promises";
import { getContractPath, loadSourceSpec, stableStringify } from "./openapi-utils.mjs";

try {
  const spec = await loadSourceSpec();
  const contractPath = getContractPath();
  const formatted = JSON.stringify(JSON.parse(stableStringify(spec)), null, 2);
  await fs.writeFile(contractPath, `${formatted}\n`, "utf-8");
  console.log(`Updated contract snapshot at ${contractPath}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
