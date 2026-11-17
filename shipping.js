// Verzendkosten, gedeeld door de winkel (browser) en de betaalfunctie (server).
// Eén doos voor boeken en passe-partouts; ingelijste prints gaan per 'perDoos' in een doos.
// De XL-editie (90 x 90 cm) past niet binnen de PostNL-maximummaat: alleen ophalen.
(function (root) {
  function calc(shipping, items, zoneId) {
    var hasXL = items.some(function (i) { return i.xl; });
    if (zoneId === 'pickup') return { price: 0, ok: true };
    if (hasXL) return { price: 0, ok: false, reason: 'De XL-editie is te groot voor de post. Kies ophalen in de galerie, of mail ons voor bezorging in Amsterdam.' };
    var z = shipping.zones.find(function (x) { return x.id === zoneId; });
    if (!z) return { price: 0, ok: false, reason: 'Kies een land.' };
    var framed = 0, flat = 0, books = 0;
    items.forEach(function (i) {
      if (i.slug === 'boek') books += i.qty; else if (i.variant === 'lijst') framed += i.qty; else flat += i.qty;
    });
    if (framed && z.lijst == null) return { price: 0, ok: false, reason: 'Ingelijste prints versturen we alleen binnen Europa. Kies passe-partout, ophalen in de galerie, of mail ons.' };
    var price = 0;
    if (framed) price += Math.ceil(framed / z.perDoos) * z.lijst;      // ingelijst: per doos
    if (flat) price += framed ? 0 : z.pp;                                // passe-partouts gaan mee in de doos, anders eigen plat pakket
    if (books && !framed && !flat) price += Math.ceil(books / 2) * z.boek; // alleen boeken: per 2 een buspakje
    return { price: price, ok: true };
  }
  root.TWDZZShipping = { calc: calc };
})(typeof window !== 'undefined' ? window : globalThis);
