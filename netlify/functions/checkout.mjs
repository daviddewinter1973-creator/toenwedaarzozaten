// Maakt een Mollie-betaling aan. Prijzen komen altijd uit data.json op de server,
// nooit uit de browser, zodat niemand zelf een prijs kan verzinnen.
// Nodig in Netlify: omgevingsvariabele MOLLIE_API_KEY (test_... of live_...).

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Alleen POST' });
  const key = process.env.MOLLIE_API_KEY;
  if (!key) return json(500, { error: 'Betalen is nog niet ingesteld (MOLLIE_API_KEY ontbreekt).' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Ongeldige bestelling.' }); }

  const site = new URL(req.url).origin;
  const data = await (await fetch(`${site}/data.json`)).json();

  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!items.length) return json(400, { error: 'Je winkelwagen is leeg.' });

  const lines = [];
  let total = 0;
  for (const l of items) {
    const qty = Math.max(1, Math.min(10, parseInt(l.qty, 10) || 1));
    if (l.slug === 'boek') {
      lines.push({ name: 'Boek Toen we daar zo zaten', qty, price: data.boek.price });
      total += data.boek.price * qty;
      continue;
    }
    const p = data.prints.find(x => x.slug === l.slug);
    const v = p && p.variants.find(x => x.id === l.variant);
    if (!v) return json(400, { error: 'Een van de prints bestaat niet meer. Vernieuw de pagina.' });
    if (v.stock != null && v.stock < qty) return json(409, { error: `${p.title} (${v.label.toLowerCase()}) is helaas niet meer in deze hoeveelheid op voorraad.` });
    lines.push({ name: `${p.title}, ${v.id === 'lijst' ? 'ingelijst' : 'passe-partout'}`, qty, price: v.price });
    total += v.price * qty;
  }

  const ship = data.shipping.find(s => s.id === body.shipping) || data.shipping[0];
  total += ship.price;

  const c = body.customer || {};
  const clean = s => String(s || '').slice(0, 200).trim();
  const customer = {
    naam: clean(c.name), email: clean(c.email), telefoon: clean(c.phone),
    adres: ship.id === 'pickup' ? 'ophalen in de galerie' : [clean(c.street), clean(c.zip), clean(c.city), clean(c.country)].join(', ')
  };
  if (!customer.naam || !/^\S+@\S+\.\S+$/.test(customer.email)) return json(400, { error: 'Vul je naam en e-mailadres in.' });

  // Alleen terugsturen naar onze eigen site.
  let redirectUrl = `${site}/#bedankt`;
  try { const u = new URL(body.returnUrl); if (u.origin === site) redirectUrl = u.href; } catch {}

  const summary = lines.map(l => `${l.qty}x ${l.name}`).join('; ');
  const res = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: (total / 100).toFixed(2) },
      description: `TWDZZ ${customer.naam}: ${summary}`.slice(0, 255),
      redirectUrl,
      locale: 'nl_NL',
      metadata: { bestelling: lines, bezorging: ship.label, klant: customer }
    })
  });
  const pay = await res.json();
  if (!res.ok) return json(502, { error: 'Mollie gaf een fout. Probeer het later opnieuw.', detail: pay.detail });
  return json(200, { checkoutUrl: pay._links.checkout.href });
};
