#!/usr/bin/env node

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const exts = new Set([".ts",".tsx",".js",".jsx"]);

const results = {
  openaiImports: [],
  topLevelOpenAI: [],
  apiMissingRuntime: [],
  clientUsesServiceRole: [],
  zodErrorsProp: [],
  missingPaths: [],
  clientServerMismatch: [],
  riskyEnvOnClient: [],
};

function* walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".next") || name === "node_modules" || name === ".git") continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function read(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}

function isClientComponent(src) {
  return /^\s*["']use client["']/.test(src);
}

function isApiRoute(file) {
  return file.includes(`${path.sep}app${path.sep}api${path.sep}`) && (file.endsWith(`${path.sep}route.ts`) || file.endsWith(`${path.sep}route.js`));
}

function hasRuntimeNode(src) {
  return /export\s+const\s+runtime\s*=\s*["']nodejs["']/.test(src);
}

function findLines(src, re) {
  const lines = src.split(/\r?\n/);
  const hits = [];
  for (let i=0;i<lines.length;i++){
    if (re.test(lines[i])) hits.push(i+1);
  }
  return hits;
}

function scanFile(file) {
  const ext = path.extname(file);
  if (!exts.has(ext)) return;
  const src = read(file);
  if (!src) return;

  // 1) OpenAI import or usage
  if (/from\s+["']openai["']/.test(src)) {
    results.openaiImports.push(file);
  }

  const topLevelNew = src.match(/^\s*const\s+\w+\s*=\s*new\s+OpenAI\(/m);
  if (topLevelNew) results.topLevelOpenAI.push(file);

  // 2) API routes using OpenAI must declare node runtime
  if (isApiRoute(file) && /from\s+["']openai["']/.test(src) && !hasRuntimeNode(src)) {
    results.apiMissingRuntime.push(file);
  }

  // 3) Client components must not touch service role or server env
  if (isClientComponent(src)) {
    if (/SUPABASE_SERVICE_ROLE_KEY/.test(src)) {
      results.clientUsesServiceRole.push(file);
    }

    // any process.env.* in client is risky unless NEXT_PUBLIC_
    const badEnv = src.match(/process\.env\.([A-Z0-9_]+)/g) || [];
    for (const m of badEnv) {
      const key = m.split(".").pop();
      if (key && !key.startsWith("NEXT_PUBLIC_")) {
        results.riskyEnvOnClient.push(`${file}:${findLines(src, new RegExp(m.replace(/\./g,"\\.")))[0]} -> ${m}`);
      }
    }
  }

  // 4) zod errors vs issues
  if (/ZodError/.test(src) && /\.errors\b/.test(src)) {
    const lines = findLines(src, /\.errors\b/);
    results.zodErrorsProp.push(`${file}:${lines.join(",")}`);
  }

  // 5) imports of server helpers in client components
  if (isClientComponent(src)) {
    if (/createServerClient/.test(src) || /getServerSession/.test(src)) {
      results.clientServerMismatch.push(file);
    }
  }

  // 6) naive broken imports (file exists?)
  const importRe = /from\s+["']([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(src))) {
    const spec = m[1];
    if (spec.startsWith(".") || spec.startsWith("@/")) {
      const base = spec.startsWith("@/") ? spec.replace("@/", `${ROOT}/`) : path.resolve(path.dirname(file), spec);
      const candidates = ["", ".ts",".tsx",".js",".jsx","/index.ts","/index.tsx","/index.js","/index.jsx"].map(s => base + s);
      const exists = candidates.some(p => fs.existsSync(p));
      if (!exists) {
        const line = findLines(src, new RegExp(`from\\s+["']${spec.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\$&")}["']`)).at(0);
        results.missingPaths.push(`${file}:${line} -> ${spec}`);
      }
    }
  }
}

for (const f of walk(ROOT)) scanFile(f);

// Report
function section(title, arr) {
  if (!arr.length) return `\n## ${title}\n✓ None\n`;
  return `\n## ${title}\n` + arr.map(x => `- ${x}`).join("\n") + "\n";
}

let out = "";
out += section("OpenAI imports found", results.openaiImports);
out += section("Top-level new OpenAI() (should be lazy-inited)", results.topLevelOpenAI);
out += section("API routes using OpenAI but missing `export const runtime = \"nodejs\"`", results.apiMissingRuntime);
out += section("Client components referencing SERVICE ROLE or server env", results.clientUsesServiceRole);
out += section("Risky process.env.* in client (not NEXT_PUBLIC_)", results.riskyEnvOnClient);
out += section("ZodError.errors occurrences", results.zodErrorsProp);
out += section("Client components importing server helpers", results.clientServerMismatch);
out += section("Import paths likely missing on disk", results.missingPaths);

console.log(out.trim() || "All clear");
process.exit(0);

