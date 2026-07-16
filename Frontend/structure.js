import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IGNORE = ["node_modules", "dist", "build", ".git", "coverage", ".vscode", "structure.txt", "structure.js"];

function generateTree(dir = ".", prefix = "", output = []) {
  try {
    const items = fs.readdirSync(dir).filter((item) => !IGNORE.includes(item));

    items.sort((a, b) => {
      const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    items.forEach((item, index) => {
      const fullPath = path.join(dir, item);
      const isLast = index === items.length - 1;
      const connector = isLast ? "└── " : "├── ";

      output.push(prefix + connector + item);

      if (fs.statSync(fullPath).isDirectory()) {
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        generateTree(fullPath, newPrefix, output);
      }
    });
  } catch (error) {
    // ignore
  }
  return output;
}

// اجرا
console.log("🔄 Generating structure...");
const tree = generateTree(".");
const content = "📁 Project Structure:\n\n" + tree.join("\n");
fs.writeFileSync("structure.txt", content, "utf8");
console.log("✅ structure.txt updated successfully!");
