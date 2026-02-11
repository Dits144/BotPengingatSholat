export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain || name.length < 2) return '***';
  return `${name.slice(0, 2)}***@${domain}`;
}
