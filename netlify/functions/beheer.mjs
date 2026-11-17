// Beheer van de voorraad. Beveiligd met ADMIN_PASSWORD (Netlify-omgevingsvariabele).
import { timingSafeEqual, createHash } from 'node:crypto';
import { currentStock, saveBasis, getSales, loadData } from './lib/voorraad.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
const same = (a, b) => {
  const h = s => createHash('sha256').update(String(s)).digest();
  return timingSafeEqual(h(a), h(b));
};

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Alleen POST' });
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return json(500, { error: 'ADMIN_PASSWORD is nog niet ingesteld in Netlify.' });
  let body; try { body = await req.json(); } catch { return json(400, { error: 'Ongeldig verzoek' }); }
  if (!same(body.password || '', pw)) {
    await new Promise(r => setTimeout(r, 800));
    return json(401, { error: 'Onjuist wachtwoord' });
  }
  const origin = new URL(req.url).origin;
  const data = await loadData(origin);

  if (body.action === 'save') {
    const clamp = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(0, Math.min(9999, n)) : 0; };
    const valid = {};
    for (const p of data.prints) valid[p.slug] = clamp(body.stock?.[p.slug]);
    valid.boek = clamp(body.stock?.boek);
    await saveBasis(valid, body.asOf);
    const cur = await currentStock(origin, data);
    return json(200, { ok: true, stock: cur.stock, updatedAt: new Date().toISOString(), asOf: new Date().toISOString() });
  }

  const asOf = new Date().toISOString();
  const cur = await currentStock(origin, data);
  const sales = (await getSales()).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50);
  return json(200, { stock: cur.stock, updatedAt: cur.updatedAt, asOf, sales });
};
