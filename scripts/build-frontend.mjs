import { rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(repoRoot, "frontend");
const staticDir = path.join(repoRoot, "backend", "claude_panel", "static");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function main() {
  await rm(staticDir, { recursive: true, force: true });
  await run("npx", ["tsc"], frontendRoot);
  await run("npx", ["vite", "build", "--outDir", staticDir], frontendRoot);
  console.log(`Built frontend into ${staticDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
