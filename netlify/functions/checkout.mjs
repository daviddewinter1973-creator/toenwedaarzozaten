// Maakt een Mollie-betaling aan. Prijzen en voorraad komen altijd van de server,
// nooit uit de browser. Nodig in Netlify: MOLLIE_API_KEY.
import { currentStock, loadData } from './lib/voorraad.mjs';
import '../../shipping.js';

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Alleen POST' });
  const key = process.env.MOLLIE_API_KEY;
  if (!key) return json(500, { error: 'Betalen is nog niet ingesteld.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Ongeldige bestelling.' }); }

  const site = new URL(req.url).origin;
  const data = await loadData(site);
  const { stock } = await currentStock(site, data);

  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  if (!items.length) return json(400, { error: 'Je winkelwagen is leeg.' });

  const lines = [];
  const meta = [];
  const wanted = {}; // per print opgeteld, ongeacht de uitvoering
  let total = 0;
  for (const l of items) {
    const qty = Math.max(1, Math.min(10, parseInt(l.qty, 10) || 1));
    let name, price, slug, variant;
    if (l.slug === 'boek') {
      slug = 'boek'; variant = 'boek'; name = 'Boek Toen we daar zo zaten'; price = data.boek.price;
    } else {
      const p = data.prints.find(x => x.slug === l.slug);
      const v = p && p.variants.find(x => x.id === l.variant);
      if (!v) return json(400, { error: 'Een van de prints bestaat niet meer. Vernieuw de pagina.' });
      slug = p.slug; variant = v.id; price = v.price;
      name = `${p.title}, ${v.id === 'lijst' ? 'ingelijst' : 'passe-partout'}`;
    }
    wanted[slug] = (wanted[slug] || 0) + qty;
    const left = stock[slug] ?? 0;
    const title = slug === 'boek' ? 'het boek' : data.prints.find(x => x.slug === slug).title;
    if (left < wanted[slug]) {
      return json(409, { error: left === 0 ? `${title} is helaas uitverkocht.` : `Van ${title} zijn er nog maar ${left}.` });
    }
    lines.push({ name, qty, price, slug, variant, xl: !!data.prints.find(x => x.slug === slug)?.xl });
    meta.push([slug, variant, qty]);
    total += price * qty;
  }

  const zone = String(body.shipping || '');
  const ship = globalThis.TWDZZShipping.calc(data.shipping, lines.map(l => ({ slug: l.slug, variant: l.variant, qty: l.qty, xl: l.xl })), zone);
  if (!ship.ok) return json(400, { error: ship.reason });
  total += ship.price;
  const pickup = zone === 'pickup';

  const c = body.customer || {};
  const clean = (s, n = 120) => String(s || '').slice(0, n).trim();
  const klant = {
    n: clean(c.name, 80), e: clean(c.email, 100), t: clean(c.phone, 30),
    a: pickup ? 'ophalen' : [clean(c.street, 80), clean(c.zip, 12), clean(c.city, 50), clean(c.country, 40)].join(', ')
  };
  if (!klant.n || !/^\S+@\S+\.\S+$/.test(klant.e)) return json(400, { error: 'Vul je naam en e-mailadres in.' });

  let redirectUrl = `${site}/#bedankt`;
  try { const u = new URL(body.returnUrl); if (u.origin === site) redirectUrl = u.href; } catch {}

  const summary = lines.map(l => `${l.qty}x ${l.name}`).join('; ');
  const res = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: (total / 100).toFixed(2) },
      description: `TWDZZ ${klant.n}: ${summary}`.slice(0, 255),
      redirectUrl,
      webhookUrl: `${site}/.netlify/functions/mollie-webhook`,
      locale: 'nl_NL',
      // Mollie staat max 1 KB metadata toe, daarom compact.
      metadata: { i: meta, s: zone, k: klant }
    })
  });
  const pay = await res.json();
  if (!res.ok) return json(502, { error: 'Mollie gaf een fout. Probeer het later opnieuw.', detail: pay.detail });
  return json(200, { checkoutUrl: pay._links.checkout.href });
};
