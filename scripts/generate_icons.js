const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawPixelFn) {
  // RGBA buffer
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA (6)
  ihdrData[10] = 0; // Compression: Deflate (0)
  ihdrData[11] = 0; // Filter: Adaptive (0)
  ihdrData[12] = 0; // Interlace: None (0)
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function drawIconPixel(x, y, w, h) {
  const nx = x / (w - 1);
  const ny = y / (h - 1);
  
  // Background: Rounded squircle (YouTube Red #FF0033 to Dark Red #CC0029 gradient)
  const cornerR = 0.22;
  let inSquircle = true;
  
  const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - cornerR));
  const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - cornerR));
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist > cornerR) {
    inSquircle = false;
  }
  
  if (!inSquircle) {
    return [0, 0, 0, 0]; // Transparent
  }
  
  // Gradient red background
  let bgR = 255 - Math.floor(ny * 40);
  let bgG = Math.floor(ny * 10);
  let bgB = 50 + Math.floor(ny * 20);

  // Inner Slide (White rectangle representing presentation slide)
  const slideLeft = 0.20;
  const slideRight = 0.80;
  const slideTop = 0.22;
  const slideBottom = 0.78;
  const slideCorner = 0.06;

  if (nx >= slideLeft && nx <= slideRight && ny >= slideTop && ny <= slideBottom) {
    // Check slide corners
    const sdx = Math.max(0, Math.abs(nx - (slideLeft + slideRight) / 2) - ((slideRight - slideLeft) / 2 - slideCorner));
    const sdy = Math.max(0, Math.abs(ny - (slideTop + slideBottom) / 2) - ((slideBottom - slideTop) / 2 - slideCorner));
    if (Math.sqrt(sdx * sdx + sdy * sdy) <= slideCorner) {
      // Inside slide canvas!
      // Slide Header bar (Orange/PPT tone #FF6B35)
      if (ny <= slideTop + 0.14) {
        return [255, 107, 53, 255];
      }
      
      // Presentation Play Triangle in center (Red #FF0033)
      // Triangle vertices: (0.42, 0.40), (0.42, 0.64), (0.62, 0.52)
      const tx1 = 0.42, ty1 = 0.40;
      const tx2 = 0.42, ty2 = 0.64;
      const tx3 = 0.62, ty3 = 0.52;

      const sign1 = (nx - tx2) * (ty1 - ty2) - (tx1 - tx2) * (ny - ty2);
      const sign2 = (nx - tx3) * (ty2 - ty3) - (tx2 - tx3) * (ny - ty3);
      const sign3 = (nx - tx1) * (ty3 - ty1) - (tx3 - tx1) * (ny - ty1);

      const hasNeg = (sign1 < 0) || (sign2 < 0) || (sign3 < 0);
      const hasPos = (sign1 > 0) || (sign2 > 0) || (sign3 > 0);

      if (!(hasNeg && hasPos)) {
        // Inside triangle
        return [255, 0, 51, 255];
      }

      // Slide Bullet Lines
      if (nx >= 0.28 && nx <= 0.36 && ny >= 0.42 && ny <= 0.46) return [70, 80, 95, 255];
      if (nx >= 0.28 && nx <= 0.36 && ny >= 0.52 && ny <= 0.56) return [70, 80, 95, 255];
      if (nx >= 0.28 && nx <= 0.36 && ny >= 0.62 && ny <= 0.66) return [70, 80, 95, 255];

      return [255, 255, 255, 255]; // Crisp white slide body
    }
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuffer = createPNG(size, size, drawIconPixel);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuffer);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
