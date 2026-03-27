#!/usr/bin/env node
// Wrapper that starts expo and auto-answers "Proceed anonymously" when prompted
import { spawn } from "child_process";

const env = { ...process.env };

const args = process.argv.slice(2);

const proc = spawn("pnpm", ["exec", "expo", "start", ...args], {
  env,
  stdio: ["pipe", "inherit", "inherit"],
});

// Expo's inquirer prompt for "Log in / Proceed anonymously" uses arrow keys.
// Down arrow = ESC [ B, then Enter. But since stdin is not a TTY here,
// inquirer may auto-select when it receives a newline on the current item.
// We send a down-arrow sequence then newline after a short delay to pick "Proceed anonymously".
const sendAnonymous = () => {
  try {
    // ESC [ B = cursor down (selects second option), then \r = confirm
    proc.stdin.write("\x1B[B\r");
  } catch {
    // stdin may be closed already
  }
};

// Send once at startup and repeat every 500ms in case the prompt loops
sendAnonymous();
const interval = setInterval(sendAnonymous, 500);

proc.on("exit", (code) => {
  clearInterval(interval);
  process.exit(code ?? 0);
});

process.on("SIGTERM", () => proc.kill("SIGTERM"));
process.on("SIGINT", () => proc.kill("SIGINT"));
