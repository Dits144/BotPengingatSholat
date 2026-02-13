export function rp(value: number | string) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export function box(title: string, lines: string[]) {
  return [`╭─ ${title}`, ...lines.map((l) => `┊ ${l}`), '╰────────────'].join('\n');
}
