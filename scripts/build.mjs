import { build } from "vite";
import fs from "node:fs";
import path from "node:path";

await build();

try {
  const distDir = path.resolve(process.cwd(), "dist");
  fs.copyFileSync(
    path.join(distDir, "index.html"),
    path.join(distDir, "404.html")
  );
  console.log("Successfully copied dist/index.html to dist/404.html");
} catch (error) {
  console.error("Failed to copy dist/index.html to dist/404.html:", error);
  process.exit(1);
}

