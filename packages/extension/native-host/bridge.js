#!/usr/bin/env node
// ContextKit native messaging host.
//
// Chromium native messaging framing (verified 2026-05-28 against
// https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging):
//   - Each message is sent as a UInt32 little-endian length header followed by
//     a UTF-8 JSON payload, over stdin/stdout.
//   - Max message size: 1 MB → host, 64 MB → browser.
//
// Protocol (extension ↔ host):
//   request:  { id: string, method: "list" | "get", slug?: string }
//   response: { id: string, ok: true, data: ... } | { id, ok: false, error }
//
// At Phase 2 this just shells out to the local `ck` CLI:
//   list → `ck list --json`
//   get  → `ck get <slug> --json`

import { spawn } from "node:child_process";

function readMessages(onMessage) {
  let buffer = Buffer.alloc(0);
  process.stdin.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const len = buffer.readUInt32LE(0);
      if (buffer.length < 4 + len) break;
      const payload = buffer.subarray(4, 4 + len).toString("utf8");
      buffer = buffer.subarray(4 + len);
      try {
        onMessage(JSON.parse(payload));
      } catch (err) {
        // ignore malformed
      }
    }
  });
}

function writeMessage(msg) {
  const json = Buffer.from(JSON.stringify(msg), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(Buffer.concat([header, json]));
}

function runCk(args) {
  return new Promise((resolve) => {
    const cmd = process.platform === "win32" ? "ck.cmd" : "ck";
    const child = spawn(cmd, args, { shell: process.platform === "win32" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf8")));
    child.on("error", (err) => resolve({ ok: false, error: String(err) }));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve({ ok: false, error: stderr.trim() || `exit ${code}` });
        return;
      }
      try {
        resolve({ ok: true, data: JSON.parse(stdout) });
      } catch (err) {
        resolve({ ok: false, error: `parse-error: ${String(err)}` });
      }
    });
  });
}

readMessages(async (req) => {
  if (!req || typeof req.id !== "string") return;
  if (req.method === "list") {
    const r = await runCk(["list", "--json"]);
    writeMessage({ id: req.id, ...r });
  } else if (req.method === "get" && typeof req.slug === "string") {
    const r = await runCk(["get", req.slug, "--json"]);
    writeMessage({ id: req.id, ...r });
  } else {
    writeMessage({ id: req.id, ok: false, error: "unknown-method" });
  }
});
