// Mollie roept dit aan bij elke statuswijziging van een betaling.
// Bij "paid" boeken we de verkochte exemplaren af van de voorraad.
import { recordSale } from './lib/voorraad.mjs';

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
    await recordSale(id, p.metadata.i, {
      bedrag: p.amount?.value, klant: p.metadata.k, bezorging: p.metadata.s, test: p.mode === 'test'
    });
  }
  return new Response('ok');
};
