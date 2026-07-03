// Shared helpers for money text inputs. Inputs keep their value as a STRING
// while the user types (so "12." survives the keystroke on the way to "12.50")
// and are only parsed to a number when used.

// Keep digits and a single decimal point; cap at 6 whole digits + 2 decimals.
export function sanitizeMoneyInput(v) {
  let s = String(v).replace(/[^0-9.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  const [whole, dec] = s.split('.');
  return whole.slice(0, 6) + (dec !== undefined ? '.' + dec.slice(0, 2) : '');
}

// String → positive amount in pounds/pence (0 when empty or invalid).
export function parseMoney(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}
