import { readFile, writeFile } from "node:fs/promises";
import { build } from "vite";

const rootIndexPath = new URL("../index.html", import.meta.url);
const sourceIndexPath = new URL("../index.vite.html", import.meta.url);

let previousIndex = "";

try {
  previousIndex = await readFile(rootIndexPath, "utf8");
} catch {
  previousIndex = "";
}

try {
  const sourceIndex = await readFile(sourceIndexPath, "utf8");
  await writeFile(rootIndexPath, sourceIndex, "utf8");
  await build();
} finally {
  await writeFile(rootIndexPath, previousIndex, "utf8");
}
