/* =========================================================
 * pixel/encoding.js — manipulateurs de "rows" (framebuffer)
 * 1 ligne = 1 string, 1 pixel = 1 caractère :
 * "." = transparent, sinon index de palette en base62 (PIX_CHARS)
 * Fonctions pures, testables sans navigateur.
 * ======================================================= */

const pixChar = (i) => PIX_CHARS[i] || PIX_CHARS[PIX_CHARS.length - 1];
const pixIndex = (c) => PIX_CHARS.indexOf(c);

const emptyRows = (w, h) => Array.from({ length: h }, () => PIX_EMPTY.repeat(w));

function setPixel(rows, x, y, ch) {
  const h = rows.length, w = rows[0].length;
  if (x < 0 || y < 0 || x >= w || y >= h) return rows;
  if (rows[y][x] === ch) return rows;
  const out = rows.slice();
  out[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
  return out;
}

function paintSquare(rows, x, y, ch, size) {
  let out = rows;
  const o = Math.floor((size - 1) / 2);
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) out = setPixel(out, x + dx - o, y + dy - o, ch);
  return out;
}

function checkerRows(w, h, ch) {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => ((x + y) % 2 === 0 ? ch : PIX_EMPTY)).join("")
  );
}
