// Fails when server or client code uses an identifier that is never declared
// or imported. Merges can keep a function call while dropping its import,
// which only crashes at runtime (e.g. `canManageCbt is not defined`).
// Uses the ESLint already installed in client/node_modules.
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const root = process.cwd();
const clientRequire = createRequire(path.join(root, "client", "package.json"));
const { ESLint } = clientRequire("eslint");
const globals = clientRequire("globals");

const languageOptions = (extraGlobals) => ({
  ecmaVersion: "latest",
  sourceType: "module",
  globals: extraGlobals,
  parserOptions: { ecmaFeatures: { jsx: true } },
});

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: true,
  overrideConfig: [
    {
      ignores: ["**/node_modules/**", "**/dist/**", "server/assets/**"],
    },
    {
      files: ["server/**/*.{js,mjs,cjs}", "scripts/**/*.{js,mjs,cjs}"],
      languageOptions: languageOptions({ ...globals.node }),
      linterOptions: { reportUnusedDisableDirectives: "off" },
      rules: { "no-undef": "error" },
    },
    {
      files: ["client/src/**/*.{js,jsx}"],
      languageOptions: languageOptions({ ...globals.browser }),
      linterOptions: { reportUnusedDisableDirectives: "off" },
      rules: { "no-undef": "error" },
    },
  ],
});

const targets = ["server", "client/src", "scripts"].filter((dir) =>
  fs.existsSync(path.join(root, dir)),
);
const results = await eslint.lintFiles(targets);
const problems = results.flatMap((result) =>
  result.messages
    .filter((message) => message.ruleId === "no-undef" || message.fatal)
    .map(
      (message) =>
        `${path.relative(root, result.filePath)}:${message.line}:${message.column} ${message.message}`,
    ),
);

if (problems.length) {
  console.error("Undefined identifiers found (missing import after merge?):");
  problems.forEach((line) => console.error(`  ${line}`));
  process.exit(1);
}

console.log(`No undefined identifiers in ${results.length} files.`);
