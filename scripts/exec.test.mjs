import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { compactPath, expandArg, spawnEnv, tokenize } from "./lib/exec.mjs";

test("spawnEnv drops npm_package metadata and oversized values", () => {
  const env = spawnEnv({
    PATH: "/usr/bin:/usr/bin:/opt/bin",
    HOME: "/home/dev",
    npm_package_dependencies_foo: "1.0.0",
    npm_config_cache: "/tmp/npm",
    npm_config_registry: "https://registry.npmjs.org/",
    BUN_DEBUG: "1",
    BUN_INSTALL: "/home/dev/.bun",
    HUGE: "x".repeat(20_000)
  });
  assert.equal(env.HOME, "/home/dev");
  assert.equal(env.BUN_INSTALL, "/home/dev/.bun");
  assert.equal(env.npm_config_registry, "https://registry.npmjs.org/");
  assert.equal(env.npm_package_dependencies_foo, undefined);
  assert.equal(env.npm_config_cache, undefined);
  assert.equal(env.BUN_DEBUG, undefined);
  assert.equal(env.HUGE, undefined);
  assert.equal(env.PATH.split(":").filter((part) => part === "/usr/bin").length, 1);
});

test("compactPath caps unique entries", () => {
  const parts = Array.from({ length: 80 }, (_, index) => `/p${index}`);
  const compacted = compactPath(parts.join(":"));
  assert.equal(compacted.split(":").length, 64);
});

test("tokenize splits on whitespace", () => {
  assert.deepEqual(tokenize("  napi build --release  "), ["napi", "build", "--release"]);
});

test("expandArg expands a directory glob without a shell", () => {
  const dir = join(tmpdir(), `utilitycss-glob-${process.pid}`);
  mkdirSync(join(dir, "test"), { recursive: true });
  writeFileSync(join(dir, "test", "index.test.mjs"), "");
  writeFileSync(join(dir, "test", "native.test.mjs"), "");
  writeFileSync(join(dir, "test", "skip.txt"), "");
  assert.deepEqual(expandArg(dir, "test/*.test.mjs"), [
    "test/index.test.mjs",
    "test/native.test.mjs"
  ]);
});
