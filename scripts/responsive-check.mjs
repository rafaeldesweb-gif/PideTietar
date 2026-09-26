import { spawn } from "node:child_process";
import { chromium } from "playwright";

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

const targetUrl = "http://127.0.0.1:3000/";

const isServerReachable = async () => {
  try {
    const response = await fetch(targetUrl, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
};

let viteServer;
let startedByScript = false;
let logs = "";

if (!(await isServerReachable())) {
  startedByScript = true;
  viteServer =
    process.platform === "win32"
      ? spawn(
          "cmd.exe",
          ["/d", "/s", "/c", "npx vite --port=3000 --host=0.0.0.0"],
          {
            stdio: ["ignore", "pipe", "pipe"],
          },
        )
      : spawn("npx", ["vite", "--port=3000", "--host=0.0.0.0"], {
          stdio: ["ignore", "pipe", "pipe"],
        });

  viteServer.stdout.on("data", (chunk) => {
    logs += String(chunk);
  });

  viteServer.stderr.on("data", (chunk) => {
    logs += String(chunk);
  });

  const waitForServer = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Vite dev server did not start in time.\n${logs}`));
    }, 30000);

    const onOutput = () => {
      if (
        logs.includes("localhost:3000") ||
        logs.includes("127.0.0.1:3000") ||
        logs.includes("ready in")
      ) {
        clearTimeout(timeout);
        resolve();
      }
    };

    viteServer.stdout.on("data", onOutput);
    viteServer.stderr.on("data", onOutput);

    viteServer.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Vite exited early with code ${code}.\n${logs}`));
    });
  });

  await waitForServer;
}

let browser;
let page;
let failures = [];

try {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    const result = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      hasHorizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth,
    }));

    if (result.hasHorizontalOverflow) {
      failures.push({ viewport, ...result });
    }
  }

  if (failures.length > 0) {
    console.error("Responsive overflow detected:");
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log("Responsive overflow check passed for all target viewports.");
} finally {
  if (page) {
    await page.close();
  }

  if (browser) {
    await browser.close();
  }

  if (startedByScript && viteServer && !viteServer.killed) {
    viteServer.kill("SIGTERM");
  }
}
