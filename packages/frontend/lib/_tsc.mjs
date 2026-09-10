// Strips TS types with the compiler already in node_modules, so the check
// needs no test runner and no build step.
import { readFileSync } from 'node:fs';
import ts from 'typescript';

export async function transpile(path) {
  const js = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
