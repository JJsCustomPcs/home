import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const expectedAssetVersion = "24";

function hslToRgb(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs((2 * l) - 1)) * s;
  const segment = h / 60;
  const second = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = l - (chroma / 2);
  const channels = segment < 1 ? [chroma, second, 0]
    : segment < 2 ? [second, chroma, 0]
      : segment < 3 ? [0, chroma, second]
        : segment < 4 ? [0, second, chroma]
          : segment < 5 ? [second, 0, chroma]
            : [chroma, 0, second];
  return channels.map((channel) => Math.round((channel + offset) * 255));
}

function relativeLuminance(rgb) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (linear[0] * 0.2126) + (linear[1] * 0.7152) + (linear[2] * 0.0722);
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

async function publicHtmlFiles() {
  const rootEntries = await readdir(root, { withFileTypes: true });
  const buildEntries = await readdir(join(root, "builds"), { withFileTypes: true });
  return [
    ...rootEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".html")).map((entry) => join(root, entry.name)),
    ...buildEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".html")).map((entry) => join(root, "builds", entry.name)),
  ].sort();
}

function assertSharedAssetVersion(html, page) {
  const sharedAssets = [
    "assets/css/styles.css",
    "assets/js/script.js",
    "assets/logo.svg",
    "assets/favicon.svg",
    "site.webmanifest",
  ];

  for (const asset of sharedAssets) {
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(html, new RegExp(`${escaped}\\?v=${expectedAssetVersion}`), `${page} must load ${asset} at v=${expectedAssetVersion}`);
  }
}

const [script, css, pages] = await Promise.all([
  readFile(join(root, "assets/js/script.js"), "utf8"),
  readFile(join(root, "assets/css/styles.css"), "utf8"),
  publicHtmlFiles(),
]);

assert.match(script, /const assetVersion = "v=24";/);
assert.match(script, /const rgbThemeStorageKey = "jjRgbThemeHueV1";/);
assert.match(script, /const rgbThemeDefaultHue = 234;/);
assert.match(script, /\(\(normalizeHue\(selectedHue\) - normalizeHue\(baseHue\) \+ 540\) % 360\) - 180/);
assert.match(script, /localStorage\.getItem\(rgbThemeStorageKey\)/);
assert.match(script, /localStorage\.setItem\(rgbThemeStorageKey/);
assert.match(script, /localStorage\.removeItem\(rgbThemeStorageKey\)/);
assert.match(script, /requestAnimationFrame/);
assert.match(script, /aria-expanded="false" aria-controls="rgb-theme-panel"/);
assert.match(script, /event\.key === "Enter" \|\| event\.key === " "/);
assert.match(script, /event\.key === "Escape"/);
assert.match(script, /role="status" aria-live="polite"/);
assert.match(script, /\["Default", 234\]/);
assert.match(script, /\["Red", 0\]/);
assert.match(script, /\["Orange", 30\]/);
assert.match(script, /\["Green", 120\]/);
assert.match(script, /\["Cyan", 180\]/);
assert.match(script, /\["Blue", 220\]/);
assert.match(script, /\["Purple", 280\]/);
assert.match(script, /\["Pink", 330\]/);

assert.match(css, /--theme-hue:\s*234;/);
assert.match(css, /--hero-hue-shift:\s*0deg;/);
assert.match(css, /--ok:\s*#54f0a6;/);
assert.match(css, /--danger:\s*#ff637d;/);
assert.match(css, /\.btn-primary\s*\{[^}]*background:\s*linear-gradient\(135deg, var\(--theme-accent-light\), hsl\(var\(--theme-hue-blue\) 100% 70%\) 46%, var\(--theme-secondary\)\);[^}]*color:\s*#02040a;/s);
assert.match(css, /\.hero-image img\s*\{[^}]*filter:\s*hue-rotate\(var\(--hero-hue-shift\)\) saturate\(1\.08\);/s);
assert.match(css, /\.brand-mark img\s*\{[^}]*filter:\s*hue-rotate\(var\(--hero-hue-shift\)\)/s);
assert.match(css, /\.featured-build-panel picture\s*\{[^}]*aspect-ratio:\s*1672 \/ 941;/s);
assert.match(css, /\.featured-build-panel img\s*\{[^}]*height:\s*100%;[^}]*object-fit:\s*contain;/s);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration:\s*1ms !important;/);
assert.doesNotMatch(css, /(?:\.gallery-link|\.gallery-grid|\.build-photo)[^{]*\{[^}]*hue-rotate/s);
assert.doesNotMatch(css, /rgba\((?:36,\s*107,\s*255|103,\s*199,\s*255|155,\s*92,\s*255|151,\s*101,\s*255|192,\s*120,\s*255|187,\s*167,\s*255),/);

const primaryButtonText = [2, 4, 10];
for (let hue = 0; hue < 360; hue += 1) {
  for (const offset of [-32, -14, 29]) {
    const ratio = contrastRatio(primaryButtonText, hslToRgb(hue + offset, 100, 70));
    assert.ok(ratio >= 4.5, `Primary button contrast fell below WCAG AA at hue ${hue + offset}: ${ratio.toFixed(2)}:1`);
  }
}

assert.equal(pages.length, 22, "Expected the complete 22-page public site");
for (const file of pages) {
  const html = await readFile(file, "utf8");
  assertSharedAssetVersion(html, relative(root, file));
}

const home = await readFile(join(root, "index.html"), "utf8");
assert.match(home, /assets\/js\/form-submit\.js\?v=24/);
assert.match(home, /class="section proof-panel featured-build-panel reveal-up"/);

console.log(`RGB theme tests passed: theme architecture, scoped image treatment, semantic colors, and ${pages.length} page asset versions.`);
