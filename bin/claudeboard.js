#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const staticDir = path.join(packageRoot, "backend", "ccm", "static");

const pkg = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf-8"));

const PURPLE = "\x1b[35m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

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
  claude-panel [--port <number>] [--no-open]

Options:
  --port <number>  Use a specific port (skips auto fallback)
  --no-open        Do not open the browser automatically
  --help           Show this help
`);
}

function hasCommand(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: false,
  });
  return result.status === 0;
}

function parseArgs(argv) {
  const parsed = { port: null, noOpen: false, help: false };
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

  const defaultPort = Number.parseInt(process.env.CCM_PORT || "8787", 10);
  if (Number.isInteger(defaultPort) && defaultPort > 0 && defaultPort <= 65535) {
    const free = await isPortFree(defaultPort);
    if (free) {
      return defaultPort;
    }
    console.log(`Port ${defaultPort} is busy; selecting a free port automatically...`);
  }

  return getRandomFreePort();
}

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (process.platform !== "linux" && process.platform !== "darwin" && process.platform !== "win32") {
    throw new Error("claude-panel supports Linux, macOS, and Windows only.");
  }

  if (!existsSync(staticDir)) {
    throw new Error(
      "Missing frontend static assets. Rebuild package assets with `npm run build:frontend` before running."
    );
  }

  if (!hasCommand("uv")) {
    throw new Error("Missing required dependency: `uv` is not installed or not in PATH.");
  }

  if (!hasCommand("python3") && !hasCommand("python")) {
    throw new Error("Missing required dependency: Python 3 is not installed or not in PATH.");
  }

  printBanner();

  const port = await choosePort(args.port);
  const appUrl = `http://127.0.0.1:${port}`;
  const healthUrl = `${appUrl}/api/health`;

  console.log(`${DIM}Starting at${RESET} ${CYAN}${appUrl}${RESET}`);
  const backend = spawn(
    "uv",
    [
      "run",
      "--project", path.join(packageRoot, "backend"),
      "uvicorn", "ccm.main:app",
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
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
