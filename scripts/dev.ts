import { spawn } from "child_process";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || "";
// Extract IP from cookie domain (e.g., ".192.168.1.122.nip.io" -> "192.168.1.122")
const ipMatch = /\.?(\d+\.\d+\.\d+\.\d+)\.nip\.io/.exec(cookieDomain);
const ip = ipMatch?.[1];

const port = 3000;

console.log("\n🚀 Starting Web (App) dev server...\n");
console.log("   Local:        http://localhost:" + port);
if (ip) {
  console.log("   Network:      http://" + ip + ":" + port);
  console.log("   nip.io:       http://app.stampeo." + ip + ".nip.io:" + port);
}
console.log("");

const proc = spawn("npx", ["next", "dev", "-p", String(port)], {
  stdio: "inherit",
  shell: true,
});

proc.on("close", (code) => process.exit(code ?? 0));
