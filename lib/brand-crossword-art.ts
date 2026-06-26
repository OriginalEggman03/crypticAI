/** Brand mark: CRYPTIC AI in crossword answer cells on the site paper background. */

export const PAPER = "#f4efe6";
export const CREAM = "#ebe4d6";
export const INK = "#1a1510";
export const ACCENT = "#8b3a2a";

const WORDS = ["CRYPTIC", "AI"] as const;

export interface RenderOptions {
  width: number;
  height: number;
  variant?: "wordmark" | "icon";
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderBrandSvg(options: RenderOptions): string {
  if (options.variant === "icon") {
    return renderIconSvg(options.width, options.height);
  }
  return renderWordmarkSvg(options.width, options.height);
}

function renderIconSvg(width: number, height: number): string {
  const size = Math.min(width, height);
  const cellSize = Math.floor(size * 0.58);
  const x = (width - cellSize) / 2;
  const y = (height - cellSize) / 2;
  const borderW = Math.max(2, Math.round(cellSize * 0.045));
  const radius = Math.max(3, Math.round(cellSize * 0.1));
  const fontSize = cellSize * 0.62;

  let svg = "";
  svg += `<rect width="100%" height="100%" fill="${CREAM}"/>`;
  svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${radius}" fill="#ffffff" stroke="${INK}" stroke-opacity="0.25" stroke-width="${borderW}"/>`;
  svg += `<text x="${x + cellSize / 2}" y="${y + cellSize * 0.7}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" fill="${INK}" text-anchor="middle">C</text>`;

  return wrapSvg(width, height, svg);
}

function renderWordmarkSvg(width: number, height: number): string {
  const letters = WORDS.join("").split("");
  const gapCells = 0.45;
  const cellCount = letters.length + gapCells;
  const margin = Math.min(width, height) * 0.1;
  const cellSize = Math.floor(
    Math.min((width - margin * 2) / cellCount, (height - margin * 2) * 0.55)
  );

  const crypticW = 7 * cellSize;
  const gapW = gapCells * cellSize;
  const aiW = 2 * cellSize;
  const rowW = crypticW + gapW + aiW;
  const rowH = cellSize;
  const offsetX = (width - rowW) / 2;
  const offsetY = (height - rowH) / 2;
  const borderW = Math.max(1, Math.round(cellSize * 0.04));
  const fontSize = cellSize * 0.52;
  const radius = Math.max(2, Math.round(cellSize * 0.08));

  let svg = "";
  svg += `<rect width="100%" height="100%" fill="${CREAM}"/>`;

  function drawCell(x: number, y: number, letter: string): void {
    svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${radius}" fill="#ffffff" stroke="${INK}" stroke-opacity="0.22" stroke-width="${borderW}"/>`;
    svg += `<text x="${x + cellSize / 2}" y="${y + cellSize * 0.68}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="600" fill="${INK}" text-anchor="middle" letter-spacing="0.02em">${escapeXml(letter)}</text>`;
  }

  let x = offsetX;
  for (let i = 0; i < 7; i++) {
    drawCell(x, offsetY, letters[i]!);
    x += cellSize;
  }

  x += gapW;

  for (let i = 7; i < letters.length; i++) {
    drawCell(x, offsetY, letters[i]!);
    x += cellSize;
  }

  return wrapSvg(width, height, svg);
}

function wrapSvg(width: number, height: number, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${body}
</svg>`;
}
