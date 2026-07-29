// Build paytida kompilyatsiya qilinmaydigan asset fayllarni dist ga ko'chiradi.
// Busiz `node dist/server.js` EJS view va statik fayllarni topa olmaydi.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

for (const dir of ["views", "public"]) {
  const src = path.join(root, "src", dir);
  const dest = path.join(root, "dist", dir);
  if (!fs.existsSync(src)) continue;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`Copied src/${dir} -> dist/${dir}`);
}
