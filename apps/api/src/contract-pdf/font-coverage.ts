// Reads the set of code points a TrueType/OpenType font maps to glyphs.
//
// Typst draws a character the pinned font lacks as an empty box (tofu) and
// raises no warning, so the contract renderer checks every value against the
// font's cmap itself and refuses to print one it can't render.
//
// Only cmap subtable formats 4 (BMP) and 12 (full Unicode) are read; every
// Unicode font ships at least one of them.

export function readCmapCoverage(font: Buffer): Set<number> {
  const numTables = font.readUInt16BE(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    if (font.toString('latin1', record, record + 4) === 'cmap') {
      cmapOffset = font.readUInt32BE(record + 8);
      break;
    }
  }
  if (cmapOffset < 0) throw new Error('Font has no cmap table');

  const covered = new Set<number>();
  const subtableCount = font.readUInt16BE(cmapOffset + 2);
  for (let i = 0; i < subtableCount; i++) {
    const record = cmapOffset + 4 + i * 8;
    const platformId = font.readUInt16BE(record);
    const encodingId = font.readUInt16BE(record + 2);
    // Unicode platform, or Windows Unicode BMP (1) / full repertoire (10).
    if (platformId !== 0 && !(platformId === 3 && (encodingId === 1 || encodingId === 10))) {
      continue;
    }
    const table = cmapOffset + font.readUInt32BE(record + 4);
    const format = font.readUInt16BE(table);
    if (format === 4) readFormat4(font, table, covered);
    else if (format === 12) readFormat12(font, table, covered);
  }
  if (covered.size === 0) throw new Error('Font has no Unicode cmap subtable');
  return covered;
}

function readFormat4(font: Buffer, table: number, covered: Set<number>): void {
  const segCount = font.readUInt16BE(table + 6) / 2;
  const endCodes = table + 14;
  const startCodes = endCodes + segCount * 2 + 2; // +2 skips reservedPad
  const idDeltas = startCodes + segCount * 2;
  const idRangeOffsets = idDeltas + segCount * 2;

  for (let s = 0; s < segCount; s++) {
    const end = font.readUInt16BE(endCodes + s * 2);
    const start = font.readUInt16BE(startCodes + s * 2);
    const delta = font.readInt16BE(idDeltas + s * 2);
    const rangeOffsetPos = idRangeOffsets + s * 2;
    const rangeOffset = font.readUInt16BE(rangeOffsetPos);

    for (let code = start; code <= end && code !== 0xffff; code++) {
      let glyph: number;
      if (rangeOffset === 0) {
        glyph = (code + delta) & 0xffff;
      } else {
        const glyphPos = rangeOffsetPos + rangeOffset + (code - start) * 2;
        glyph = font.readUInt16BE(glyphPos);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      // Glyph 0 is .notdef — the tofu box itself.
      if (glyph !== 0) covered.add(code);
    }
  }
}

function readFormat12(font: Buffer, table: number, covered: Set<number>): void {
  const groupCount = font.readUInt32BE(table + 12);
  for (let g = 0; g < groupCount; g++) {
    const group = table + 16 + g * 12;
    const start = font.readUInt32BE(group);
    const end = font.readUInt32BE(group + 4);
    const startGlyph = font.readUInt32BE(group + 8);
    for (let code = start; code <= end; code++) {
      if (startGlyph + (code - start) !== 0) covered.add(code);
    }
  }
}

// Characters in `text` that the font can't draw. Whitespace and line breaks
// are laid out by Typst rather than drawn, so they never count as missing.
export function missingCharacters(text: string, covered: Set<number>): string[] {
  const missing = new Set<string>();
  for (const char of text) {
    if (/\s/.test(char)) continue;
    if (!covered.has(char.codePointAt(0)!)) missing.add(char);
  }
  return [...missing];
}
