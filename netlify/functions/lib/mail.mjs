// E-mail via Resend (resend.com). Nodig in Netlify:
//   RESEND_API_KEY  de sleutel uit Resend
//   MAIL_FROM       afzender, bv. "Staaf <bestellingen@staaf.nl>" (pas na domeinverificatie in Resend).
//                   Zonder MAIL_FROM gaat alleen de melding aan de eigenaar, via onboarding@resend.dev.
//   MAIL_TO         (optioneel) waar bestelmeldingen heen gaan; standaard staaf@chello.nl
export const OWNER = () => process.env.MAIL_TO || 'staaf@chello.nl';
export const canMailCustomers = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail({ to, subject, html, text, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Staaf <onboarding@resend.dev>',
        to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {})
      })
    });
    if (!r.ok) console.error('mail mislukt', r.status, await r.text());
    return { ok: r.ok };
  } catch (e) {
    console.error('mail mislukt', e);
    return { ok: false };
  }
}

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const eur = c => '€ ' + (c / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Eenvoudige, nette HTML-mail: wit, zwarte tekst, één accentkleur.
export function layout({ accent, title, intro, rows, totalLabel, total, blocks = [], footer }) {
  const tr = rows.map(([a, b]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e6e6e6">${a}</td><td style="padding:8px 0;border-bottom:1px solid #e6e6e6;text-align:right;white-space:nowrap">${b}</td></tr>`).join('');
  const bl = blocks.map(([h, b]) => `<p style="margin:18px 0 4px;font:600 11px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5c5c5c">${h}</p><p style="margin:0">${b}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#f4f3f1;padding:24px 12px">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px 28px;font:16px/1.55 Georgia,serif;color:#111">
<div style="height:4px;background:${accent};margin:-32px -28px 28px"></div>
<h1 style="font:800 24px/1.15 Arial,sans-serif;text-transform:uppercase;margin:0 0 14px">${title}</h1>
<p style="margin:0 0 20px">${intro}</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">${tr}
<tr><td style="padding:12px 0 0;font:800 16px Arial,sans-serif">${totalLabel}</td><td style="padding:12px 0 0;text-align:right;font:800 16px Arial,sans-serif">${total}</td></tr></table>
${bl}
<p style="margin:28px 0 0;font-size:14px;color:#5c5c5c">${footer}</p>
</div></body></html>`;
}
