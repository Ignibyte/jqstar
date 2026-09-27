import childProcess from "node:child_process";
import dns from "node:dns";
import fs from "node:fs";
import promises from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import dgram from "node:dgram";
import { syncBuiltinESMExports } from "node:module";
if (process.env.JQSTAR_DOCTOR_FAIL_RULES === "1") {
  const original = promises.readFile;
  promises.readFile = function (path, ...args) {
    if (String(path).endsWith("/bin/doctor/compatibility.json"))
      throw new Error("private-installed-rules-canary");
    return original.call(this, path, ...args);
  };
}

function denied() {
  throw new Error("JQSTAR_DOCTOR_EFFECT_DENIED");
}
for (const [object, keys] of [
  [childProcess, ["exec", "execFile", "execFileSync", "execSync", "fork", "spawn", "spawnSync"]],
  [http, ["get", "request"]],
  [https, ["get", "request"]],
  [net, ["connect", "createConnection"]],
  [tls, ["connect"]],
  [dns, ["lookup", "resolve"]],
  [dgram, ["createSocket"]],
])
  for (const key of keys) object[key] = denied;
net.Socket.prototype.connect = denied;
globalThis.fetch = denied;
globalThis.WebSocket = denied;
if (process.env.JQSTAR_DOCTOR_READONLY === "1") {
  const writes = [
    "appendFile",
    "chmod",
    "chown",
    "copyFile",
    "cp",
    "link",
    "mkdir",
    "mkdtemp",
    "rename",
    "rm",
    "rmdir",
    "symlink",
    "truncate",
    "unlink",
    "utimes",
    "writeFile",
  ];
  for (const key of writes) {
    fs[key] = denied;
    if (`${key}Sync` in fs) fs[`${key}Sync`] = denied;
    promises[key] = denied;
  }
  fs.createWriteStream = denied;
  for (const [object, key] of [
    [fs, "open"],
    [fs, "openSync"],
    [promises, "open"],
  ]) {
    const original = object[key];
    object[key] = function (path, flags, ...args) {
      if (
        typeof flags === "string"
          ? flags !== "r"
          : (flags &
              (fs.constants.O_WRONLY |
                fs.constants.O_RDWR |
                fs.constants.O_CREAT |
                fs.constants.O_TRUNC |
                fs.constants.O_APPEND)) !==
            0
      )
        denied();
      return original.call(this, path, flags, ...args);
    };
  }
}
syncBuiltinESMExports();
