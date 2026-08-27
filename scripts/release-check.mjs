import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { nodeExecutable, spawnEnv } from "./lib/exec.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
// `npm_execpath` points at whichever runner started this script; under `bun run`
// that is the Bun binary, not npm-cli.js, so only honour it when it really is npm.
const npmCli = /npm-cli\.js$/.test(process.env.npm_execpath ?? "") ? process.env.npm_execpath : undefined;
const node = nodeExecutable();
const bundledNpmCli =
  process.platform === "win32" && node !== "node"
    ? join(dirname(node), "node_modules", "npm", "bin", "npm-cli.js")
    : undefined;
const npm = npmCli ? [node, npmCli] : bundledNpmCli ? [node, bundledNpmCli] : ["npm"];
const results = [];
let failures = 0;

function pass(label) {
  results.push({ status: "PASS", label });
  console.log(`PASS ${label}`);
}

function skip(label, reason) {
  results.push({ status: "SKIP", label, reason });
  console.log(`SKIP ${label} (${reason})`);
}

function fail(label, output) {
  failures += 1;
  results.push({ status: "FAIL", label });
  console.error(`FAIL ${label}`);
  const details = output.trim();
  if (details) {
    console.error(details.split(/\r?\n/).slice(-30).join("\n"));
  }
}

function commandAvailable(command, args = ["--version"]) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, stdio: "ignore" });
  return result.error === undefined && result.status === 0;
}

function run(label, command, args, options = {}) {
  if (options.when && !options.when()) {
    skip(label, options.skipReason ?? `${command} is unavailable`);
    return false;
  }

  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: spawnEnv(options.env ?? process.env),
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error?.code === "ENOENT") {
    skip(label, `${command} is not installed`);
    return false;
  }
  if (result.status === 0) {
    pass(label);
    return true;
  }
  fail(label, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return false;
}

function runNpm(label, args, options = {}) {
  return run(label, npm[0], [...npm.slice(1), ...args], options);
}

function runReleaseNpm(label, args, options = {}) {
  if (!npmReady) {
    skip(label, "clean npm install failed");
    return false;
  }
  return runNpm(label, args, options);
}

function runJsTask(label, task, options = {}) {
  if (!npmReady) {
    skip(label, "clean npm install failed");
    return false;
  }
  return run(label, nodeExecutable(), [join(repositoryRoot, "scripts", "js-tasks.mjs"), task], options);
}

function runWorkspaceScript(label, scriptName, packageName, options = {}) {
  if (!npmReady) {
    skip(label, "clean npm install failed");
    return false;
  }
  return run(
    label,
    nodeExecutable(),
    [join(repositoryRoot, "scripts", "run-workspace.mjs"), scriptName, packageName],
    options
  );
}

function currentPlatformLabel() {
  const labels = {
    "win32:x64": "Windows x64",
    "linux:x64": "Linux x64",
    "darwin:arm64": "macOS ARM64",
    "darwin:x64": "macOS x64"
  };
  return labels[`${process.platform}:${process.arch}`];
}

function runWasmGate() {
  if (!commandAvailable("cargo", ["--version"])) {
    skip("WASM runtime smoke", "cargo is not installed");
    return;
  }
  if (!commandAvailable("rustup", ["target", "list", "--installed"])) {
    skip("WASM runtime smoke", "rustup is not installed");
    return;
  }
  const targetList = spawnSync("rustup", ["target", "list", "--installed"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  if (!targetList.stdout.split(/\r?\n/).includes("wasm32-unknown-unknown")) {
    skip("WASM runtime smoke", "wasm32-unknown-unknown target is not installed");
    return;
  }
  if (!run("WASM Rust build", "cargo", ["build", "-p", "utilitycss-wasm", "--release", "--target", "wasm32-unknown-unknown"])) {
    return;
  }
  if (!commandAvailable("wasm-bindgen", ["--version"])) {
    skip("WASM binding generation and runtime", "wasm-bindgen CLI is not installed");
    return;
  }
  const outputDirectory = join(repositoryRoot, "target", "release-check-wasm-bindgen");
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });
  if (!run("WASM binding generation", "wasm-bindgen", [
    join(repositoryRoot, "target", "wasm32-unknown-unknown", "release", "utilitycss_wasm.wasm"),
    "--target",
    "nodejs",
    "--out-dir",
    outputDirectory
  ])) {
    return;
  }
  run("WASM runtime smoke", process.execPath, [join(repositoryRoot, "scripts", "wasm-runtime-smoke.mjs")], {
    cwd: repositoryRoot,
    env: { ...process.env, UTILITYCSS_WASM_BINDINGS: outputDirectory }
  });
}

console.log("utilitycss local release check");

const npmReady = runNpm("Clean npm install", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
run("Rust format", "cargo", ["fmt", "--all", "--", "--check"]);
run("Rust Clippy", "cargo", ["clippy", "--workspace", "--all-targets", "--all-features", "--", "-D", "warnings"]);
run("Rust workspace tests", "cargo", ["test", "--workspace", "--all-features"]);
run("Compiler conformance", "cargo", ["test", "-p", "utilitycss-compiler", "--test", "conformance"]);
run("Stylesheet Rust tests", "cargo", ["test", "-p", "utilitycss-stylesheet"]);
run("@apply conformance", "cargo", ["test", "-p", "utilitycss-stylesheet", "--test", "apply_fixtures"]);
run("Rust benchmark", "cargo", ["bench", "-p", "utilitycss-bench"]);
// Workspace crates intentionally share the pre-1.0 version while they are
// unpublished. Cargo's normal package verification resolves path dependencies
// from crates.io, which can select an older copy of a sibling crate and make a
// valid local workspace fail. Packaging still validates manifests, included
// files, and tarball creation here; the workspace build/test gates above cover
// local compilation until the crates are published together.
run("Rust package artifacts", "cargo", ["package", "--allow-dirty", "--workspace", "--no-verify"]);
run("Rust dependency audit", "cargo", ["audit"], {
  when: () => commandAvailable("cargo-audit", ["--version"]) || commandAvailable("cargo", ["audit", "--version"]),
  skipReason: "cargo-audit is not installed"
});
run("Rust dependency and license policy", "cargo", ["deny", "check"], {
  when: () => commandAvailable("cargo-deny", ["--version"]) || commandAvailable("cargo", ["deny", "--version"]),
  skipReason: "cargo-deny is not installed"
});

const msrvAvailable = commandAvailable("cargo", ["+1.88", "--version"]);
run("Rust 1.88 check", "cargo", ["+1.88", "check", "--workspace", "--all-targets", "--all-features"], {
  when: () => msrvAvailable,
  skipReason: "Rust 1.88 toolchain is not installed"
});
run("Rust 1.88 tests", "cargo", ["+1.88", "test", "--workspace", "--all-features"], {
  when: () => msrvAvailable,
  skipReason: "Rust 1.88 toolchain is not installed"
});

runJsTask("JavaScript lint", "lint");
runJsTask("JavaScript typecheck", "typecheck");
runJsTask("JavaScript build", "build");
runJsTask("JavaScript tests", "test");
runWorkspaceScript("Node @apply smoke", "test", "@utilitycss/node");
runReleaseNpm("JavaScript dependency audit", ["audit", "--audit-level=high"]);
runReleaseNpm("Package-content validation", ["run", "validate:packages"]);
runReleaseNpm("Vite production smoke", ["run", "smoke:vite"]);
runReleaseNpm("Vite @apply smoke", ["run", "smoke:vite"]);

const currentPlatform = currentPlatformLabel();
let currentPlatformEvidence = false;
if (currentPlatform) {
  const nativeBuild = runJsTask("Current-platform native build", "build:native");
  if (nativeBuild) {
    const nodeBuild = runWorkspaceScript("Current-platform Node adapter build", "build", "@utilitycss/node");
    runWorkspaceScript("Current-platform Bun adapter build", "build", "@utilitycss/bun");
    const nodeSmoke = runWorkspaceScript("Current-platform native Node smoke", "test", "@utilitycss/node");
    currentPlatformEvidence = nodeBuild && nodeSmoke;
    runReleaseNpm("Packed Node clean-project smoke", ["run", "smoke:packed-node"]);
    runReleaseNpm("Packed Bun clean-project smoke", ["run", "smoke:packed-bun"], {
      when: () => commandAvailable("bun", ["--version"]),
      skipReason: "Bun is not installed"
    });
  }
} else {
  skip("Current-platform native smoke", `${process.platform}/${process.arch} is not an advertised target`);
}

for (const [label, platform, arch] of [
  ["Linux x64 native smoke", "linux", "x64"],
  ["Windows x64 native smoke", "win32", "x64"],
  ["macOS ARM64 native smoke", "darwin", "arm64"],
  ["macOS x64 native smoke", "darwin", "x64"]
]) {
  if (platform === process.platform && arch === process.arch) {
    if (currentPlatformEvidence) {
      pass(`${label} (covered by current-platform native smoke)`);
    } else {
      skip(label, "current-platform native smoke did not complete");
    }
  } else {
    skip(label, `requires ${label.replace(" native smoke", "")}`);
  }
}

runWasmGate();

if (commandAvailable("bun", ["--version"])) {
  const exampleDir = join(repositoryRoot, "examples", "bun");
  run("Bun example dependency install", "bun", ["install", "--cwd", exampleDir, "--frozen-lockfile"]);
  runJsTask("Bun example typecheck", "example-typecheck");
  runJsTask("Bun adapter tests", "test:bun");
  runJsTask("Bun @apply and incremental smoke", "test:bun");
  run("Bun fullstack example verify", "bun", [join(exampleDir, "src", "verify.ts")], { cwd: exampleDir });
  run("Bun fullstack production build", "bun", [join(exampleDir, "src", "production-build.ts")], { cwd: exampleDir });
} else {
  skip("Bun adapter tests", "Bun is not installed");
  skip("Bun fullstack example verify", "Bun is not installed");
  skip("Bun fullstack production build", "Bun is not installed");
}

console.log("");
console.log(`RESULT: ${failures === 0 ? "local checks completed without failures" : `${failures} check(s) failed`}`);
if (results.some((result) => result.status === "SKIP")) {
  console.log("Skipped checks are not release evidence for the skipped surface.");
}
process.exitCode = failures === 0 ? 0 : 1;
