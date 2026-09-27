#!/usr/bin/env node
// Renders the live scene in a headless browser and composes the link-preview and
// Instagram images from it. Run it against a running dev or production server:
//
//   npm run dev                      # in one terminal
//   npm run share-images             # in another
//   npm run share-images -- --url https://trinayani.example --domain trinayani.example
//
// Re-run whenever the pratima art changes.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const url = arg("url", "http://localhost:3000");
const host = new URL(url).host;
const domain = arg("domain", /^(localhost|127\.)/.test(host) ? "" : host);

const HIDE_UI = `#captions, .corner, #rail, #hints, .sound-toggle, #loader, .tooltip, nextjs-portal { display: none !important; }`;
const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;1,300&family=Cormorant+SC:wght@400&family=Tiro+Bangla&family=Tiro+Devanagari+Hindi&family=Noto+Serif+Gujarati&display=block";

async function capture(browser, { url: pageUrl, width, height, progress }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: HIDE_UI });
  await page.waitForSelector('#loader[data-ready="yes"]', { state: "attached", timeout: 30000 });
  await page.evaluate((p) => {
    const journey = document.getElementById("journey");
    window.scrollTo(0, (journey.offsetHeight - window.innerHeight) * p);
  }, progress);
  // Let the smoothed scroll settle and the astras finish arriving.
  await page.waitForTimeout(4000);
  const image = await page.screenshot({ type: "png" });
  await page.close();
  return `data:image/png;base64,${image.toString("base64")}`;
}

async function compose(browser, { width, height, html, out, quality = 84 }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="${FONTS}"><style>
      * { margin: 0; box-sizing: border-box; }
      body { width: ${width}px; height: ${height}px; overflow: hidden; background: #070304; color: #f2e9d6;
             font-family: Cormorant, Georgia, serif; position: relative; }
      .bn { font-family: "Tiro Bangla", "Tiro Devanagari Hindi", "Noto Serif Gujarati", serif; color: #d9a64a; }
      .sc { font-family: "Cormorant SC", serif; letter-spacing: 0.22em; text-transform: lowercase; color: rgba(242,233,214,.66); }
      h1 { font-weight: 300; line-height: .9; letter-spacing: .01em; }
      .scene { position: absolute; background-size: cover; background-repeat: no-repeat; }
      .rule { width: 56px; height: 1px; background: #d9a64a; }
    </style></head><body>${html}</body></html>`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(() => document.fonts.ready);
  const type = out.endsWith(".png") ? "png" : "jpeg";
  const image = await page.screenshot({ type, ...(type === "jpeg" ? { quality } : {}) });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, image);
  await page.close();
  console.log(`  ${out.replace(root + "/", "")}  ${(image.length / 1024).toFixed(0)} KB`);
}

const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
console.log(`Rendering ${url}`);

const REGIONS = [
  { style: "bengal", path: "/" },
  { style: "madhubani", path: "/bihar" },
  { style: "pachedi", path: "/gujarat" },
];

/** Reads a region page's own words (name in its script, share line, title) from the rendered page. */
async function words(browser, path) {
  const page = await browser.newPage();
  await page.goto(new URL(path, url).toString(), { waitUntil: "networkidle" });
  const result = await page.evaluate(() => {
    const meta = (p) => document.querySelector(`meta[property="${p}"]`)?.getAttribute("content") ?? "";
    return {
      native: document.querySelector(".hero-bangla")?.textContent?.trim() ?? "",
      share: meta("og:description").replace(/\s*Scroll, with sound on\.$/, ""),
      label: meta("og:title").split("—").pop()?.trim().toLowerCase() ?? "",
    };
  });
  await page.close();
  return result;
}

for (const { style, path } of REGIONS) {
  const text = await words(browser, path);
  const pageUrl = new URL(path, url).toString();
  console.log(`${style}: ${text.native} · ${text.share}`);

  // Link preview, 1200×630: the scene on the right, the title on the left.
  const wide = await capture(browser, { url: pageUrl, width: 1200, height: 630, progress: 0.44 });
  await compose(browser, {
    width: 1200,
    height: 630,
    out: join(root, `public/share/og-${style}.jpg`),
    html: `
      <div class="scene" style="left:200px; top:0; width:1200px; height:630px; background-image:url(${wide})"></div>
      <div style="position:absolute; inset:0; background:linear-gradient(90deg, #070304 22%, rgba(7,3,4,.85) 36%, rgba(7,3,4,0) 58%)"></div>
      <div style="position:absolute; left:72px; top:0; bottom:0; width:470px; display:flex; flex-direction:column; justify-content:center; gap:18px">
        <p class="bn" style="font-size:44px">${text.native}</p>
        <h1 style="font-size:104px">Trinayanī</h1>
        <div class="rule"></div>
        <p style="font-size:30px; font-style:italic; font-weight:300; line-height:1.3; color:rgba(242,233,214,.8)">${text.share}</p>
        <p class="sc" style="font-size:20px; margin-top:6px">${domain || "scroll · with sound on"}</p>
      </div>`,
  });

  // Instagram story, 1080×1920: the scene above, the words below.
  const tall = await capture(browser, { url: pageUrl, width: 1080, height: 1350, progress: 0.44 });
  await compose(browser, {
    width: 1080,
    height: 1920,
    out: join(root, `public/share/instagram-story-${style}.jpg`),
    html: `
      <div class="scene" style="left:0; top:0; width:1080px; height:1350px; background-image:url(${tall})"></div>
      <div style="position:absolute; inset:0; background:linear-gradient(#070304 4%, rgba(7,3,4,0) 14%, rgba(7,3,4,0) 56%, #070304 70%)"></div>
      <p class="sc" style="position:absolute; top:120px; width:100%; text-align:center; font-size:30px">${text.label}</p>
      <div style="position:absolute; left:0; right:0; bottom:230px; display:flex; flex-direction:column; align-items:center; gap:26px; text-align:center">
        <p class="bn" style="font-size:66px">${text.native}</p>
        <h1 style="font-size:150px">Trinayanī</h1>
        <div class="rule" style="margin-top:34px"></div>
        <p style="font-size:44px; font-style:italic; font-weight:300; line-height:1.3; max-width:860px; color:rgba(242,233,214,.82)">${text.share}</p>
        <p class="sc" style="font-size:30px; margin-top:12px">${domain ? `${domain} · ` : ""}sound on</p>
      </div>`,
  });

  // Instagram post, 1080×1350 (4:5).
  const square = await capture(browser, { url: pageUrl, width: 1080, height: 1080, progress: 0.44 });
  await compose(browser, {
    width: 1080,
    height: 1350,
    out: join(root, `public/share/instagram-post-${style}.jpg`),
    html: `
      <div class="scene" style="left:0; top:0; width:1080px; height:1080px; background-image:url(${square})"></div>
      <div style="position:absolute; inset:0; background:linear-gradient(rgba(7,3,4,0) 62%, #070304 82%)"></div>
      <div style="position:absolute; left:0; right:0; bottom:90px; display:flex; flex-direction:column; align-items:center; gap:18px; text-align:center">
        <p class="bn" style="font-size:52px">${text.native}</p>
        <h1 style="font-size:118px">Trinayanī</h1>
        <p class="sc" style="font-size:26px; margin-top:8px">${domain ? `${domain} · ` : ""}${text.label}</p>
      </div>`,
  });
}

// Apple touch icon from the SVG favicon (iOS rounds the corners itself).
const svg = await readFile(join(root, "src/app/icon.svg"), "utf8");
await compose(browser, {
  width: 180,
  height: 180,
  out: join(root, "src/app/apple-icon.png"),
  html: `<div style="width:180px;height:180px">${svg.replace("<svg ", '<svg width="180" height="180" ').replace('rx="14"', 'rx="0"')}</div>`,
});

await browser.close();
