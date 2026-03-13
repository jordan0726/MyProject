import { build } from "esbuild";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const APP = 'receiptcat';
const DOMAIN = 'backend';
const ENV = process.env.ENVIRONMENT || 'local'; // 'dev' or 'prod' or 'feature' from pipeline

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const manifest = JSON.parse(readFileSync(join(root, "functions.manifest.json"), "utf8"));

for (const [logicalName, { entry }] of Object.entries(manifest)) {
  const lambdaName = `${APP}-${DOMAIN}-${ENV}-${logicalName}`;
  const outdir = join(root, "out", lambdaName);
  mkdirSync(outdir, { recursive: true });

  await build({
    entryPoints: [join(root, entry)],
    outfile: join(outdir, "index.js"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    sourcemap: true,
    keepNames: true,
    minify: false,
  });

  // minimal package.json ensures Node treats output as CommonJS
  writeFileSync(join(outdir, "package.json"), JSON.stringify({ type: "commonjs" }));
}