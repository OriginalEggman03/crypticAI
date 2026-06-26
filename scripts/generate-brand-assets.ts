import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { renderBrandSvg } from "../lib/brand-crossword-art";

const root = process.cwd();

const outputs: { path: string; width: number; height: number; variant?: "wordmark" | "icon" }[] = [
  { path: join(root, "app", "icon.png"), width: 512, height: 512, variant: "icon" },
  { path: join(root, "app", "apple-icon.png"), width: 512, height: 512, variant: "icon" },
  { path: join(root, "app", "opengraph-image.png"), width: 1200, height: 630 },
  { path: join(root, "public", "marketing", "ad-landscape.png"), width: 1200, height: 630 },
  { path: join(root, "public", "marketing", "ad-square.png"), width: 1080, height: 1080 },
];

async function main(): Promise<void> {
  mkdirSync(join(root, "public", "marketing"), { recursive: true });

  for (const out of outputs) {
    const svg = renderBrandSvg({
      width: out.width,
      height: out.height,
      variant: out.variant,
    });
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(out.path, png);
    console.log(`Wrote ${out.path} (${out.width}x${out.height}, ${png.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
