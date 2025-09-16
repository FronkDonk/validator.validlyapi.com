import crypto from "node:crypto";
import dns from "node:dns/promises";
import { readFile } from "node:fs/promises";
import net from "node:net";

let cachedBlocklist: string[] | null = null;

export async function isDisposable(email: string): Promise<boolean> {
  // Load and cache the blocklist once
  if (cachedBlocklist === null) {
    try {
      const content = await readFile("./disposable_email_blocklist.conf", { encoding: "utf-8" });
      // Handle both Windows (\r\n) and Unix (\n) line endings
      cachedBlocklist = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line !== "");
    }
    catch (error) {
      console.error("Could not load disposable email blocklist:", error);
      cachedBlocklist = []; // Empty array as fallback
    }
  }
  const atIndex = email.indexOf("@");
  if (atIndex === -1) {
    return false;
  }
  const domain = email.split("@")[1].toLowerCase();
  return cachedBlocklist.includes(domain);
}

export async function isCatchAll(email: string) {
  const [_, domain] = email.split("@");

  const randomLocal = crypto.randomBytes(10).toString("hex");
  const testEmail = `${randomLocal}@${domain}`;

  const result = await smtpValidate(testEmail);

  return result;
}

export async function smtpValidate(email: string): Promise<boolean> {
  const [_, domain] = email.split("@");
  if (!domain)
    throw new Error("Invalid email format");

  // 1. Resolve MX records
  const mxRecords = await dns.resolveMx(domain).catch(() => []);
  if (mxRecords.length === 0)
    return false;

  // Pick lowest priority MX
  mxRecords.sort((a, b) => a.priority - b.priority);
  const mx = mxRecords[0].exchange;

  return new Promise((resolve) => {
    const socket = net.createConnection(25, mx);
    let step = 0;

    socket.setEncoding("utf8");
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(false); // Timeout → treat as invalid
    });

    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false); // ⏱ fail safe
    }, 8000); // 8s timeout

    socket.on("data", (data) => {
      const strData = data.toString();
      console.log("SMTP Response:", strData);

      if (step === 0 && strData.startsWith("220")) {
        socket.write(`HELO api.validlyapi.com\r\n`);
        step = 1;
      }
      else if (step === 1 && strData.startsWith("250")) {
        socket.write(`MAIL FROM:<validator@validlyapi.com>\r\n`);
        step = 2;
      }
      else if (step === 2 && strData.startsWith("250")) {
        socket.write(`RCPT TO:<${email}>\r\n`);
        step = 3;
      }
      else if (step === 3) {
        clearTimeout(timer);

        if (strData.startsWith("250")) {
          resolve(true); // ✅ Deliverable
        }
        else if (strData.startsWith("550")) {
          resolve(false); // ❌ Rejected
        }
        else {
          resolve(false); // catchall → treat as invalid
        }

        socket.write("QUIT\r\n");
        socket.end();
        step = 4; // prevent further triggers
      }
    });
  });
}
