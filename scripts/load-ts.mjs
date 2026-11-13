import { readFile } from "node:fs/promises";
import ts from "typescript";

// Small test-only loader for the repository's pure TypeScript modules. Uses the
// installed compiler and keeps generated files out of the source tree.
const cached = new Map();
export async function moduleUrl(url) {
  if (cached.has(url.href)) return cached.get(url.href);
  const source = await readFile(url, "utf8");
  let js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const imports = [...js.matchAll(/from\s+["']((?:\.|@\/)[^"']+)["']/g)];
  for (const [, specifier] of imports) {
    const target = specifier.startsWith("@/")
      ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url) : new URL(`${specifier}.ts`, url);
    js = js.replace(`"${specifier}"`, JSON.stringify(await moduleUrl(target)));
  }
  const data = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
  cached.set(url.href, data);
  return data;
}
export const loadTs = async (path) => import(await moduleUrl(new URL(path, import.meta.url)));
