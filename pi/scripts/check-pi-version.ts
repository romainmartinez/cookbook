import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { delimiter, sep } from "node:path";

const packages = ["pi-coding-agent", "pi-ai", "pi-tui"].map((name) => `@earendil-works/${name}`);
const binSuffix = `${sep}node_modules${sep}.bin`;
const PATH = (process.env.PATH ?? "").split(delimiter).filter((dir) => !dir.endsWith(binSuffix)).join(delimiter);
const installed = execFileSync("pi", ["--version"], { encoding: "utf8", env: { ...process.env, PATH } }).trim();
const { devDependencies } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const mismatched = packages.filter((name) => devDependencies[name] !== installed);

if (mismatched.length > 0) {
  console.error(`Pi ${installed} is installed, but package.json pins ${mismatched.map((name) => `${name}@${devDependencies[name]}`).join(", ")}.`);
  console.error(`Run: pnpm --dir pi add -D -E ${packages.map((name) => `${name}@${installed}`).join(" ")}`);
  process.exit(1);
}
