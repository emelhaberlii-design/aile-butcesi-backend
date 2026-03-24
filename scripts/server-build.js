const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "server_dist");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

const banner = `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`;

execSync(
  `npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=server_dist/index.mjs --banner:js="${banner}"`,
  { stdio: "inherit" }
);
