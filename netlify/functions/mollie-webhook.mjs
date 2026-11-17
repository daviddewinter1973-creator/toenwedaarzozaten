// Mollie roept dit aan bij elke statuswijziging van een betaling.
// Bij "paid" boeken we de verkochte exemplaren af van de voorraad en sturen we de mails.
import { recordSale } from './lib/voorraad.mjs';
import { sendMail, canMailCustomers, OWNER, layout, esc } from './lib/mail.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  const form = await req.formData().catch(() => null);
  const id = form && String(form.get('id') || '');
  if (!/^tr_[A-Za-z0-9]+$/.test(id)) return new Response('ok');

  // Status altijd zelf opvragen bij Mollie; nooit de inhoud van het verzoek vertrouwen.
  const r = await fetch(`https://api.mollie.com/v2/payments/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MOLLIE_API_KEY}` }
  });
  if (!r.ok) return new Response('ok');
  const p = await r.json();
  if (p.status === 'paid' && Array.isArray(p.metadata?.i)) {
    const isNew = await recordSale(id, p.metadata.i, {
      bedrag: p.amount?.value, klant: p.metadata.k, bezorging: p.metadata.s, test: p.mode === 'test'
    });
    // Alleen bij de eerste melding mailen, ook als Mollie de webhook vaker stuurt.
    if (isNew) await mails(new URL(req.url).origin, p).catch(e => console.error(e));
  }
  return new Response('ok');
};

async function mails(site, p) {
  const data = await fetch(`${site}/data.json`).then(r => r.json());
  const k = p.metadata.k || {};
  const lines = p.metadata.i.map(([slug, variant, qty]) => {
    if (slug === 'boek') return `${qty}× Het boek Toen we daar zo zaten`;
    const pr = data.prints.find(x => x.slug === slug);
    const v = pr?.variants.find(x => x.id === variant);
    return `${qty}× Print ${pr ? pr.title : slug}${v ? ', ' + v.label.toLowerCase() : ''}`;
  });
  const zone = p.metadata.s;
  const pickup = zone === 'pickup';
  const zoneLabel = pickup ? 'Ophalen bij Galerie Staaf, Bloemgracht 158'
    : 'Verzenden naar ' + ((data.shipping.zones || []).find(z => z.id === zone)?.label || zone);
  const total = '€ ' + String(p.amount.value).replace('.', ',');
  const rows = lines.map(l => [esc(l), '']);
  const test = p.mode === 'test' ? ' [TEST]' : '';

  await sendMail({
    to: OWNER(), replyTo: k.e || undefined,
    subject: `Toen we daar zo zaten, verkocht${test}: ${lines.join(', ')}`.slice(0, 180),
    html: layout({
      accent: '#d7141e', title: `Nieuwe bestelling${test}`,
      intro: 'Er is betaald via toenwedaarzozaten. Beantwoord deze mail om de koper direct te mailen.',
      rows, totalLabel: 'Betaald', total,
      blocks: [['Koper', `${esc(k.n)}<br><a href="mailto:${esc(k.e)}">${esc(k.e)}</a>${k.t ? '<br>' + esc(k.t) : ''}`],
        ['Ontvangen', esc(zoneLabel) + (!pickup && k.a ? '<br>' + esc(k.a) : '')], ['Mollie', esc(p.id)]],
      footer: `De voorraad is al bijgewerkt. Overzicht: <a href="${site}/beheer">${site}/beheer</a>`
    }),
    text: `Nieuwe bestelling${test}\n\n${lines.join('\n')}\nBetaald: ${total}\n\nKoper: ${k.n}, ${k.e} ${k.t || ''}\n${zoneLabel}${!pickup && k.a ? ', ' + k.a : ''}\nMollie: ${p.id}`
  });

  if (!canMailCustomers() || !/^\S+@\S+\.\S+$/.test(k.e || '')) return;
  const next = pickup ? 'We nemen contact met je op om een moment af te spreken waarop je je bestelling kunt ophalen.'
    : 'We pakken je bestelling zorgvuldig in en sturen hem zo snel mogelijk op.';
  await sendMail({
    to: k.e, replyTo: OWNER(),
    subject: 'Bedankt voor je bestelling: Toen we daar zo zaten',
    html: layout({
      accent: '#d7141e', title: 'Dank je wel!', intro: `Hoi ${esc(k.n)}, je betaling is binnen. Dit heb je besteld:`,
      rows, totalLabel: 'Betaald', total,
      blocks: [['Hoe nu verder', esc(zoneLabel) + '. ' + next]],
      footer: 'Vragen? Beantwoord gewoon deze mail.<br>Toen we daar zo zaten · Staaf &amp; Rogier Cornelisse · Galerie Staaf, Bloemgracht 158, Amsterdam'
    }),
    text: `Hoi ${k.n},\n\nJe betaling is binnen. Dit heb je besteld:\n${lines.join('\n')}\nBetaald: ${total}\n\n${zoneLabel}. ${next}\n\nToen we daar zo zaten · Galerie Staaf, Bloemgracht 158, Amsterdam`
  });
}
