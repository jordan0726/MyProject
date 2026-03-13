const fs = require("fs");
const path = require("path");
const child = require("child_process");

const outDir = path.join(__dirname, "..", "out");
const entries = fs.readdirSync(outDir, { withFileTypes: true }).filter(d => d.isDirectory());

for (const d of entries) {
  const src = path.join(outDir, d.name);
  const zip = path.join(outDir, `${d.name}.zip`);
  if (fs.existsSync(zip)) fs.unlinkSync(zip);

  // Ensure index.js is at the root of the zip
  child.execFileSync("zip", ["-r", zip, "."], { cwd: src, stdio: "inherit" });
}