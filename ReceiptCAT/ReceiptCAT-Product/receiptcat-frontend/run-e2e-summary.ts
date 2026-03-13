import { spawn } from "node:child_process";
import readline from "node:readline";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const env = { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", CYPRESS_NO_PROMPT: "1" };

const child = spawn("npm run -s test:e2e:run", { env, shell: true });

child.on("error", (err) => {
  console.error("Failed to start test:e2e:run", err);
  process.exit(1);
});

let show = false;
let suppressTail = false;
const attach = (stream: NodeJS.ReadableStream) => {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line: string) => {
    if (!show && line.includes("Run Starting")) show = true;

    if (/^Error: Command failed with exit code \d+:/i.test(line)) { suppressTail = true; return; }
    if (suppressTail && (/^\s*at\s/.test(line) || /^Node\.js v/.test(line))) return;

    if (show && !suppressTail) console.log(line);
  });
};

attach(child.stdout);
attach(child.stderr);

child.on("close", (code) => process.exit(code ?? 1));