import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const contractPath = path.join(repoRoot, "openapi", "contract.json");

export function getContractPath() {
  return contractPath;
}

export async function loadContract() {
  const raw = await fs.readFile(contractPath, "utf-8");
  return parseSpec(raw, contractPath);
}

export async function loadSourceSpec() {
  const specUrl = process.env.OPENAPI_SPEC_URL;
  const specPath = process.env.OPENAPI_SPEC_PATH;

  if (!specUrl && !specPath) {
    throw new Error(
      "Missing OPENAPI_SPEC_URL or OPENAPI_SPEC_PATH. Set one to compare against openapi/contract.json."
    );
  }

  if (specUrl) {
    const response = await fetch(specUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec from ${specUrl} (status ${response.status}).`);
    }
    const text = await response.text();
    return parseSpec(text, specUrl);
  }

  const raw = await fs.readFile(specPath, "utf-8");
  return parseSpec(raw, specPath);
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

export function hashString(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function parseSpec(raw, sourceLabel) {
  try {
    return JSON.parse(raw);
  } catch (jsonError) {
    try {
      return parseYaml(raw);
    } catch (yamlError) {
      throw new Error(`OpenAPI spec at ${sourceLabel} is not valid JSON or YAML.`);
    }
  }
}
