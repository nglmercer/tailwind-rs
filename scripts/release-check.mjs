import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const npm = process.env.npm_execpath
  ? [process.execPath, process.env.npm_execpath]
  : process.platform === "win32"
    ? [process.execPath, join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
    : ["npm"];
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
    env: options.env ?? process.env,
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
run("Rust benchmark", "cargo", ["bench", "-p", "utilitycss-bench"]);
run("Rust package validation", "cargo", ["package", "--allow-dirty", "--workspace"]);
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

runReleaseNpm("JavaScript lint", ["run", "lint"]);
runReleaseNpm("JavaScript typecheck", ["run", "typecheck"]);
runReleaseNpm("JavaScript build", ["run", "build"]);
runReleaseNpm("JavaScript tests", ["test"]);
runReleaseNpm("JavaScript dependency audit", ["audit", "--audit-level=high"]);
runReleaseNpm("Package-content validation", ["run", "validate:packages"]);
runReleaseNpm("Vite production smoke", ["run", "smoke:vite"]);

const currentPlatform = currentPlatformLabel();
let currentPlatformEvidence = false;
if (currentPlatform) {
  const nativeBuild = runReleaseNpm("Current-platform native build", ["run", "build:native"]);
  if (nativeBuild) {
    const nodeBuild = runReleaseNpm("Current-platform Node adapter build", ["run", "build", "--workspace=@utilitycss/node"]);
    runReleaseNpm("Current-platform Bun adapter build", ["run", "build", "--workspace=@utilitycss/bun"]);
    const nodeSmoke = runReleaseNpm("Current-platform native Node smoke", ["test", "--workspace=@utilitycss/node"]);
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
  run("Bun example dependency install", "bun", ["install", "--cwd", join(repositoryRoot, "examples", "bun"), "--frozen-lockfile"]);
  runReleaseNpm("Bun example typecheck", ["--prefix", "examples/bun", "run", "typecheck"]);
  runReleaseNpm("Bun adapter tests", ["test", "--workspace=@utilitycss/bun"]);
  runReleaseNpm("Bun fullstack example verify", ["--prefix", "examples/bun", "run", "verify"]);
  runReleaseNpm("Bun fullstack production build", ["--prefix", "examples/bun", "run", "build"]);
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
