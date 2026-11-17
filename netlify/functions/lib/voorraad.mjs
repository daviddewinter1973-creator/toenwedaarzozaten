// Voorraad = het aantal dat David in /beheer instelt (de "basis"),
// min alle betaalde verkopen die daarna binnenkwamen.
// Elke verkoop is een eigen record (verkoop/<betaling-id>), zodat twee
// gelijktijdige bestellingen elkaar nooit kunnen overschrijven.
import { getStore } from '@netlify/blobs';

export const store = () => getStore('voorraad');

export async function loadData(origin) {
  const r = await fetch(`${origin}/data.json`, { headers: { 'cache-control': 'no-cache' } });
  return r.json();
}

// Eén voorraad per print: passe-partout en ingelijst komen van dezelfde stapel.
// Oudere opslag per uitvoering ({pp, lijst}) wordt opgeteld.
export const count = v => typeof v === 'number' ? v : Object.values(v || {}).reduce((a, n) => a + (n || 0), 0);
const normalize = stock => Object.fromEntries(Object.entries(stock).map(([k, v]) => [k, count(v)]));

// Startwaarden uit data.json, voor als er nog nooit iets is opgeslagen.
export function seedFrom(data) {
  const stock = {};
  for (const p of data.prints) stock[p.slug] = p.variants.reduce((a, v) => a + (v.stock ?? 0), 0);
  stock.boek = data.boek.stock ?? 999;
  return { stock, updatedAt: '1970-01-01T00:00:00.000Z' };
}

export async function getBasis(origin, data) {
  const s = store();
  const basis = await s.get('basis', { type: 'json' });
  if (basis) return { ...basis, stock: normalize(basis.stock) };
  return seedFrom(data || await loadData(origin));
}

export async function getSales() {
  const s = store();
  const { blobs } = await s.list({ prefix: 'verkoop/' });
  const out = [];
  for (const b of blobs) {
    const v = await s.get(b.key, { type: 'json' });
    if (v) out.push(v);
  }
  return out;
}

// Huidige voorraad per print per uitvoering.
export async function currentStock(origin, data) {
  const basis = await getBasis(origin, data);
  const sales = await getSales();
  const stock = structuredClone(basis.stock);
  for (const sale of sales) {
    if (sale.at <= basis.updatedAt) continue;
    for (const [slug, , qty] of sale.items) {
      if (typeof stock[slug] === 'number') stock[slug] = Math.max(0, stock[slug] - qty);
    }
  }
  return { stock, updatedAt: basis.updatedAt, sales: sales.length };
}

// asOf = het moment waarop David de getallen zag. Verkopen daarna worden
// er alsnog vanaf gehaald, zodat opslaan geen tussentijdse bestelling wist.
export async function saveBasis(stock, asOf) {
  const now = new Date();
  const t = asOf ? new Date(asOf) : now;
  const at = isNaN(t) || t > now ? now : t;
  const basis = { stock, updatedAt: at.toISOString() };
  await store().setJSON('basis', basis);
  return basis;
}

// Idempotent: een betaling telt maar één keer, ook als Mollie de webhook vaker stuurt.
export async function recordSale(paymentId, items, extra = {}) {
  const s = store();
  const key = `verkoop/${paymentId}`;
  const existing = await s.get(key, { type: 'json' });
  if (existing) return false;
  await s.setJSON(key, { id: paymentId, items, at: new Date().toISOString(), ...extra });
  return true;
}
