const fs = require("fs");

const file = "client/src/utils/RouteProtection.jsx";

if (!fs.existsSync(file)) {
  process.exit(0);
}

const text = fs.readFileSync(file, "utf8");
const match = text.match(/const RouteProtection = \(\{([\s\S]*?)\}\) =>/);

if (!match) {
  console.error("Could not parse RouteProtection signature");
  process.exit(1);
}

const params = match[1];
const extras = [];

if (/\ballowedAssignments\b/.test(text) && !/\ballowedAssignments\b/.test(params)) {
  extras.push("allowedAssignments");
}

if (/\brequireMusyrif\b/.test(text) && !/\brequireMusyrif\b/.test(params)) {
  extras.push("requireMusyrif = false");
}

if (extras.length) {
  const trimmed = params.replace(/\s+$/, "");
  const sep = trimmed.trim()
    ? trimmed.trim().endsWith(",")
      ? "\n  "
      : ",\n  "
    : "";
  const nextParams = `${trimmed}${sep}${extras.join(",\n  ")}\n`;
  fs.writeFileSync(
    file,
    text.replace(match[0], `const RouteProtection = ({${nextParams}}) =>`),
  );
  console.log("harmonized RouteProtection params:", extras.join(", "));
}

const finalText = fs.readFileSync(file, "utf8");
const finalMatch = finalText.match(/const RouteProtection = \(\{([\s\S]*?)\}\) =>/);
const finalParams = finalMatch ? finalMatch[1] : "";
const missing = [];

if (/\ballowedAssignments\b/.test(finalText) && !/\ballowedAssignments\b/.test(finalParams)) {
  missing.push("allowedAssignments");
}

if (/\brequireMusyrif\b/.test(finalText) && !/\brequireMusyrif\b/.test(finalParams)) {
  missing.push("requireMusyrif");
}

if (missing.length) {
  console.error(
    "RouteProtection still missing destructured params:",
    missing.join(", "),
  );
  process.exit(1);
}
