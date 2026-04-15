#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const backendDir = path.join(packageRoot, "backend");
const staticDir = path.join(backendDir, "claude_panel", "static");

const pkg = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf-8"));

// ── Colors ──────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const PURPLE = "\x1b[35m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ── Banner ──────────────────────────────────────────────────────────
function printBanner() {
  console.log(
    `\n${PURPLE}${BOLD}  Claude Panel${RESET} ${DIM}v${pkg.version}${RESET}` +
    `\n${CYAN}  Claude Code Control Panel${RESET}` +
    `\n${DIM}  ${pkg.homepage}${RESET}\n`
  );
}

function printHelp() {
  printBanner();
  console.log(`Usage:
  claude-panel [--port <number>] [--no-open] [--preflight]

Options:
  --port <number>  Use a specific port (skips auto fallback)
  --no-open        Do not open the browser automatically
  --preflight      Run pre-flight checks only (do not start the server)
  --help           Show this help
`);
}

// ── CLI parsing ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const parsed = { port: null, noOpen: false, help: false, preflight: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--no-open") {
      parsed.noOpen = true;
      continue;
    }
    if (arg === "--preflight") {
      parsed.preflight = true;
      continue;
    }
    if (arg === "--port") {
      const value = argv[i + 1];
      const parsedPort = Number.parseInt(value, 10);
      if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        throw new Error("Invalid --port value. Expected an integer between 1 and 65535.");
      }
      parsed.port = parsedPort;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

// ── Shell helpers ───────────────────────────────────────────────────
function getCommandOutput(command, args = ["--version"]) {
  try {
    const result = spawnSync(command, args, {
      stdio: ["ignore", "pipe", "ignore"],
      shell: false,
      timeout: 10_000,
    });
    if (result.status !== 0 || !result.stdout) {
      return null;
    }
    return result.stdout.toString().trim();
  } catch {
    return null;
  }
}

function parseVersion(versionStr) {
  const match = versionStr.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: match[3] ? Number.parseInt(match[3], 10) : 0,
    raw: match[0],
  };
}

function isWritable(dirPath) {
  try {
    accessSync(dirPath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function tildeify(absPath) {
  const home = homedir();
  if (absPath.startsWith(home)) {
    return "~" + absPath.slice(home.length);
  }
  return absPath;
}

// ── Pre-flight checks ───────────────────────────────────────────────
function runPreflight() {
  const results = [];
  let hasFatal = false;
  const home = homedir();

  // 1. Platform & architecture
  const platform = process.platform;
  const arch = process.arch;
  if (platform !== "linux" && platform !== "darwin" && platform !== "win32") {
    results.push({
      label: "Platform",
      status: "fail",
      detail: `${platform} (${arch})`,
      hint: "Supported platforms: Linux, macOS, Windows",
    });
    hasFatal = true;
  } else {
    const platformName = { linux: "Linux", darwin: "macOS", win32: "Windows" }[platform];
    results.push({ label: "Platform", status: "ok", detail: `${platformName} (${arch})` });
  }

  // 2. Node.js (informational — if we're running, Node works)
  results.push({ label: "Node.js", status: "ok", detail: process.version });

  // 3. uv — required to manage Python deps and run the backend
  const uvOutput = getCommandOutput("uv", ["--version"]);
  if (!uvOutput) {
    results.push({
      label: "uv",
      status: "fail",
      detail: "not found in PATH",
      hint: "Install: curl -LsSf https://astral.sh/uv/install.sh | sh",
    });
    hasFatal = true;
  } else {
    const uvVersion = parseVersion(uvOutput);
    results.push({ label: "uv", status: "ok", detail: uvVersion ? uvVersion.raw : uvOutput });
  }

  // 4. Python — need 3.12+ (backend requires-python = ">=3.12")
  let pythonCmd = null;
  let pythonVersion = null;
  for (const cmd of ["python3", "python"]) {
    const output = getCommandOutput(cmd, ["--version"]);
    if (output) {
      pythonCmd = cmd;
      pythonVersion = parseVersion(output);
      break;
    }
  }
  if (!pythonCmd) {
    results.push({
      label: "Python",
      status: "fail",
      detail: "not found in PATH",
      hint: "Install Python 3.12+ from https://python.org",
    });
    hasFatal = true;
  } else if (!pythonVersion || pythonVersion.major < 3 || (pythonVersion.major === 3 && pythonVersion.minor < 12)) {
    const ver = pythonVersion ? pythonVersion.raw : "unknown";
    results.push({
      label: "Python",
      status: "fail",
      detail: `${ver} found via '${pythonCmd}' (requires >= 3.12)`,
      hint: "Upgrade to Python 3.12+: https://python.org/downloads",
    });
    hasFatal = true;
  } else {
    results.push({ label: "Python", status: "ok", detail: `${pythonVersion.raw} (${pythonCmd})` });
  }

  // 5. Frontend static assets — SPA won't load without index.html + assets/
  if (!existsSync(staticDir)) {
    results.push({
      label: "Frontend assets",
      status: "fail",
      detail: "static/ directory missing",
      hint: "Reinstall: npm install -g claude-panel",
    });
    hasFatal = true;
  } else {
    const hasIndex = existsSync(path.join(staticDir, "index.html"));
    const hasAssets = existsSync(path.join(staticDir, "assets"));
    if (!hasIndex || !hasAssets) {
      const missing = [!hasIndex && "index.html", !hasAssets && "assets/"].filter(Boolean).join(", ");
      results.push({
        label: "Frontend assets",
        status: "fail",
        detail: `incomplete — missing ${missing}`,
        hint: "Rebuild: npm run build:frontend",
      });
      hasFatal = true;
    } else {
      results.push({ label: "Frontend assets", status: "ok", detail: "found" });
    }
  }

  // 6. Backend package structure — detect corrupted installs
  const mainPy = path.join(backendDir, "claude_panel", "main.py");
  const backendPyproject = path.join(backendDir, "pyproject.toml");
  if (!existsSync(backendDir)) {
    results.push({
      label: "Backend package",
      status: "fail",
      detail: "backend/ directory missing",
      hint: "Reinstall: npm install -g claude-panel",
    });
    hasFatal = true;
  } else if (!existsSync(mainPy) || !existsSync(backendPyproject)) {
    const missing = [!existsSync(mainPy) && "main.py", !existsSync(backendPyproject) && "pyproject.toml"]
      .filter(Boolean)
      .join(", ");
    results.push({
      label: "Backend package",
      status: "fail",
      detail: `incomplete — missing ${missing}`,
      hint: "Reinstall: npm install -g claude-panel",
    });
    hasFatal = true;
  } else {
    results.push({ label: "Backend package", status: "ok", detail: "found" });
  }

  // 7. Lock file — deps resolve slower without it
  const uvLock = path.join(packageRoot, "uv.lock");
  if (!existsSync(uvLock)) {
    results.push({
      label: "Lock file",
      status: "warn",
      detail: "uv.lock missing — dependency resolution will be slower",
    });
  } else {
    results.push({ label: "Lock file", status: "ok", detail: "found" });
  }

  // 8. Python venv — first-run detection
  const venvDir = path.join(packageRoot, ".venv");
  if (!existsSync(venvDir)) {
    results.push({
      label: "Python env",
      status: "warn",
      detail: "not yet created — first start will install dependencies",
    });
  } else {
    results.push({ label: "Python env", status: "ok", detail: ".venv ready" });
  }

  // 9. Claude Code home directory
  const claudeHome = path.join(home, ".claude");
  if (!existsSync(claudeHome)) {
    results.push({
      label: "Claude Code",
      status: "warn",
      detail: "~/.claude/ not found",
      hint: "Install Claude Code first — dashboard will show empty data without it",
    });
  } else {
    results.push({ label: "Claude Code", status: "ok", detail: "~/.claude/ found" });
  }

  // 10. Claude config file
  const claudeJson = path.join(home, ".claude.json");
  if (!existsSync(claudeJson)) {
    results.push({
      label: "Claude config",
      status: "warn",
      detail: "~/.claude.json not found",
      hint: "MCP servers and project config won't appear until Claude Code creates this file",
    });
  } else {
    results.push({ label: "Claude config", status: "ok", detail: "~/.claude.json found" });
  }

  // 11. Write permissions — backend needs to write backups and state
  if (existsSync(claudeHome) && !isWritable(claudeHome)) {
    results.push({
      label: "Permissions",
      status: "warn",
      detail: "~/.claude/ is not writable",
      hint: "Backup and config edits will fail — check directory permissions",
    });
  }

  // 12. State directory — persistence for instance switching, health snapshots
  const stateDir = platform === "win32"
    ? path.join(process.env.APPDATA || home, "claude-panel")
    : path.join(home, ".config", "claude-panel");
  const stateParent = path.dirname(stateDir);
  if (existsSync(stateParent) && !isWritable(stateParent)) {
    results.push({
      label: "State directory",
      status: "warn",
      detail: `${tildeify(stateParent)} is not writable`,
      hint: "Instance persistence and health snapshots will not be saved",
    });
  }

  // 13. Deprecated env var
  if (process.env.CCM_PORT && !process.env.CLAUDE_PANEL_PORT) {
    results.push({
      label: "Env: CCM_PORT",
      status: "warn",
      detail: "deprecated — rename to CLAUDE_PANEL_PORT",
    });
  }

  return { results, hasFatal };
}

// ── Pre-flight output ───────────────────────────────────────────────
function printPreflight(results) {
  console.log(`  ${DIM}Pre-flight checks${RESET}`);
  for (const r of results) {
    let icon;
    let detailColor;
    if (r.status === "ok") {
      icon = `${GREEN}\u2713${RESET}`;
      detailColor = DIM;
    } else if (r.status === "warn") {
      icon = `${YELLOW}\u26A0${RESET}`;
      detailColor = YELLOW;
    } else {
      icon = `${RED}\u2717${RESET}`;
      detailColor = RED;
    }
    const label = r.label.padEnd(18);
    console.log(`  ${icon} ${label}${detailColor}${r.detail}${RESET}`);
    if (r.hint && r.status !== "ok") {
      console.log(`    ${DIM}\u2192 ${r.hint}${RESET}`);
    }
  }
  console.log();
}

// ── Port selection ──────────────────────────────────────────────────
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function getRandomFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not resolve random port.")));
        return;
      }
      const freePort = address.port;
      server.close(() => resolve(freePort));
    });
    server.listen(0, "127.0.0.1");
  });
}

async function choosePort(userPort) {
  if (userPort) {
    const free = await isPortFree(userPort);
    if (!free) {
      throw new Error(`Requested port ${userPort} is already in use.`);
    }
    return userPort;
  }

  const defaultPort = Number.parseInt(process.env.CLAUDE_PANEL_PORT || process.env.CCM_PORT || "8787", 10);
  if (Number.isInteger(defaultPort) && defaultPort > 0 && defaultPort <= 65535) {
    const free = await isPortFree(defaultPort);
    if (free) {
      return defaultPort;
    }
    console.log(`Port ${defaultPort} is busy; selecting a free port automatically...`);
  }

  return getRandomFreePort();
}

// ── Health polling ──────────────────────────────────────────────────
async function waitForHealth(url, maxAttempts = 40) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Keep polling until the server starts or we hit max attempts.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

// ── Browser ─────────────────────────────────────────────────────────
function openBrowser(url) {
  const platform = process.platform;
  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  printBanner();

  // Run all pre-flight checks and display results
  const { results, hasFatal } = runPreflight();
  printPreflight(results);

  if (hasFatal) {
    const failCount = results.filter((r) => r.status === "fail").length;
    throw new Error(
      `${failCount} pre-flight check${failCount > 1 ? "s" : ""} failed — resolve the issues above before starting.`
    );
  }

  // --preflight flag: exit after checks pass
  if (args.preflight) {
    console.log(`${GREEN}  All checks passed.${RESET}\n`);
    return;
  }

  const port = await choosePort(args.port);
  const appUrl = `http://127.0.0.1:${port}`;
  const healthUrl = `${appUrl}/api/health`;

  console.log(`${DIM}Starting at${RESET} ${CYAN}${appUrl}${RESET}`);
  const backend = spawn(
    "uv",
    [
      "run",
      "--project", backendDir,
      "uvicorn", "claude_panel.main:app",
      "--host", "127.0.0.1",
      "--port", String(port),
    ],
    {
      cwd: packageRoot,
      stdio: "inherit",
      shell: false,
    }
  );

  const shutdown = (signal) => {
    if (!backend.killed) {
      backend.kill(signal);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  backend.once("exit", (code) => {
    process.exit(code ?? 0);
  });

  const healthy = await waitForHealth(healthUrl);
  if (healthy && !args.noOpen) {
    openBrowser(appUrl);
  }
  if (!healthy) {
    console.log("Server is starting slowly. Open this URL manually:");
  }
  console.log(appUrl);
}

main().catch((error) => {
  console.error(`${RED}Error: ${error.message}${RESET}`);
  process.exit(1);
});
