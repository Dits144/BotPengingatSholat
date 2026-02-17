function handleCalc(text) {
  const m = String(text || '').trim().match(/^(tambah|kurang|kali|bagi)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/i);
  if (!m) {
    if (/^(tambah|kurang|kali|bagi)/i.test(String(text || '').trim())) {
      return 'Format kalkulator salah. Contoh: tambah 100 50 | kurang 100 20 | kali 10 5 | bagi 10 4';
    }
    return null;
  }

  const op = m[1].toLowerCase();
  const a = Number.parseFloat(m[2].replace(',', '.'));
  const b = Number.parseFloat(m[3].replace(',', '.'));

  const pretty = (n) => Number(n.toFixed(4)).toString();
  if (op === 'tambah') return `Hasil: ${a} + ${b} = ${pretty(a + b)}`;
  if (op === 'kurang') return `Hasil: ${a} - ${b} = ${pretty(a - b)}`;
  if (op === 'kali') return `Hasil: ${a} x ${b} = ${pretty(a * b)}`;
  if (b === 0) return 'Tidak bisa membagi dengan nol.';
  return `Hasil: ${a} / ${b} = ${pretty(a / b)}`;
}

module.exports = { handleCalc };
