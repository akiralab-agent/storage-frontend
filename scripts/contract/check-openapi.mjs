import fs from "node:fs/promises";
import {
  getContractPath,
  hashString,
  loadContract,
  loadSourceSpec,
  stableStringify
} from "./openapi-utils.mjs";

const contractPath = getContractPath();

try {
  await fs.access(contractPath);
} catch (error) {
  console.error(`Missing contract snapshot at ${contractPath}.`);
  console.error("Run npm run contract:update after setting OPENAPI_SPEC_URL or OPENAPI_SPEC_PATH.");
  process.exit(1);
}

try {
  const [contract, source] = await Promise.all([loadContract(), loadSourceSpec()]);
  const contractString = stableStringify(contract);
  const sourceString = stableStringify(source);

  if (contractString !== sourceString) {
    console.error("OpenAPI contract drift detected.");
    console.error(`Contract hash: ${hashString(contractString)}`);
    console.error(`Source hash:   ${hashString(sourceString)}`);
    console.error("Run npm run contract:update to sync the snapshot.");
    process.exit(1);
  }

  console.log("OpenAPI contract is in sync.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
