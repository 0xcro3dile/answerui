// Assembles dist/, the npm package behind `npx answerui`, from Next's standalone build.
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));

rmSync("dist", { recursive: true, force: true });
cpSync(".next/standalone", "dist/app", { recursive: true });
cpSync(".next/static", "dist/app/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", "dist/app/public", { recursive: true });
cpSync("bin", "dist/bin", { recursive: true });
for (const file of ["README.md", "LICENSE"]) cpSync(file, `dist/${file}`);

const leakedEnv = readdirSync("dist/app").filter((file) => file.startsWith(".env"));
if (leakedEnv.length) throw new Error(`Refusing to package env files: ${leakedEnv.join(", ")}`);

const { name, version, description, license, repository, keywords, engines } = manifest;
const published = { name, version, description, license, repository, keywords, engines };
writeFileSync(
  "dist/package.json",
  `${JSON.stringify({ ...published, bin: { answerui: "bin/answerui.mjs" }, files: ["app", "bin"] }, null, 2)}\n`,
);
console.log(`Packaged ${name}@${version} in dist/`);
