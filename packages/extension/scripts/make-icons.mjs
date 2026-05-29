// Programmatic icon generator for the ContextKit MV3 extension.
//
// Renders three PNGs (16, 48, 128) of a black rounded square with white "ck"
// text and writes them to src/icons/. Uses only Node built-ins (zlib + crypto)
// — no new runtime deps — so the bundled extension stays lean.
//
// PNG encoding format reference: https://www.w3.org/TR/PNG/ (sections 4 + 11).
// We emit truecolor + alpha (color type 6), bit depth 8, filter "none" per row.

import { deflateSync } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---- CRC32 (PNG-flavored, IEEE polynomial 0xedb88320) ----------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// ---- 5×5 bitmap font for "ck" ----------------------------------------------
// Designed to read cleanly even at 16×16 after scaling.
const FONT = {
  c: ["01110", "10001", "10000", "10001", "01110"],
  k: ["10010", "10100", "11000", "10100", "10010"],
};
const LETTER_W = 5;
const LETTER_H = 5;
const LETTER_GAP = 1;
const TEXT_W = LETTER_W * 2 + LETTER_GAP; // 11

function makePng(size) {
  const pixels = new Uint8Array(size * size * 4);
  const r = Math.max(1, Math.round(size * 0.18)); // corner radius

  // Black rounded square on transparent background.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true;
      if (x < r && y < r) {
        inside = (r - x) * (r - x) + (r - y) * (r - y) <= r * r;
      } else if (x >= size - r && y < r) {
        const dx = x - (size - r - 1);
        inside = dx * dx + (r - y) * (r - y) <= r * r;
      } else if (x < r && y >= size - r) {
        const dy = y - (size - r - 1);
        inside = (r - x) * (r - x) + dy * dy <= r * r;
      } else if (x >= size - r && y >= size - r) {
        const dx = x - (size - r - 1);
        const dy = y - (size - r - 1);
        inside = dx * dx + dy * dy <= r * r;
      }
      const idx = (y * size + x) * 4;
      if (inside) {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  // Scale the "ck" bitmap to ~70% of the icon width and center it.
  const targetW = Math.floor(size * 0.7);
  const scale = Math.max(1, Math.floor(targetW / TEXT_W));
  const drawW = TEXT_W * scale;
  const drawH = LETTER_H * scale;
  const offX = Math.floor((size - drawW) / 2);
  const offY = Math.floor((size - drawH) / 2);

  function paint(letter, baseX) {
    const rows = FONT[letter];
    for (let ry = 0; ry < LETTER_H; ry++) {
      const row = rows[ry];
      for (let rx = 0; rx < LETTER_W; rx++) {
        if (row[rx] !== "1") continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = baseX + rx * scale + dx;
            const py = offY + ry * scale + dy;
            if (px < 0 || px >= size || py < 0 || py >= size) continue;
            const idx = (py * size + px) * 4;
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
            pixels[idx + 3] = 255;
          }
        }
      }
    }
  }
  paint("c", offX);
  paint("k", offX + (LETTER_W + LETTER_GAP) * scale);

  // ---- IDAT: filter-none per scanline, then zlib deflate ------------------
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter type 0 (none)
    for (let x = 0; x < rowBytes; x++) {
      raw[y * (rowBytes + 1) + 1 + x] = pixels[y * rowBytes + x];
    }
  }
  const compressed = deflateSync(raw);

  // ---- IHDR ---------------------------------------------------------------
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type = truecolor + alpha (RGBA)
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter: standard
  ihdr[12] = 0; // interlace: none

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = path.join(here, "..", "src", "icons");
  await mkdir(out, { recursive: true });
  for (const size of [16, 48, 128]) {
    await writeFile(path.join(out, `${size}.png`), makePng(size));
    console.log(`  ${size}×${size} → src/icons/${size}.png`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
