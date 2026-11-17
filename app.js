/* Toen we daar zo zaten: winkel en site */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');
  const euro = c => '€ ' + (c / 100).toFixed(2).replace('.', ',').replace(',00', ',–');
  const euroExact = c => '€ ' + (c / 100).toFixed(2).replace('.', ',');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FEW = 10; // vanaf dit aantal tonen we hoeveel er nog zijn
  let DATA = null, STOCK = {};
  let filter = 'alle';

  /* ---------- voorraad ---------- */
  // Eén voorraad per print, voor passe-partout én ingelijst.
  const left = slug => { const v = STOCK[slug]; return typeof v === 'number' ? v : Object.values(v || {}).reduce((a, n) => a + (n || 0), 0); };
  const leftTotal = p => left(p.slug);
  const inCart = slug => cart.filter(l => l.slug === slug).reduce((a, l) => a + l.qty, 0);
  const scarcity = p => { const n = leftTotal(p); return n === 0 ? 'out' : n <= FEW ? 'few' : 'ok'; };

  /* ---------- winkelwagen ---------- */
  const KEY = 'twdzz-cart';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { cart = []; }
  const saveCart = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} updateCount(); };
  const updateCount = () => {
    const n = cart.reduce((a, l) => a + l.qty, 0);
    const el = $('.cart-count'); el.textContent = n; el.hidden = n === 0;
  };
  const findItem = l => {
    if (l.slug === 'boek') return { title: 'Toen we daar zo zaten', sub: 'Het boek', img: 'img/boek.webp', price: DATA.boek.price, max: left('boek') };
    const p = DATA.prints.find(x => x.slug === l.slug); if (!p) return null;
    const v = p.variants.find(x => x.id === l.variant); if (!v) return null;
    return { title: p.title, sub: `${v.id === "lijst" ? "Ingelijst" : "Met passe-partout"}, ${p.size.replace(" x ", " × ")}`, img: `img/thumb/${p.slug}-420.webp`, price: v.price, max: left(p.slug) };
  };
  const addToCart = (slug, variant) => {
    const item = findItem({ slug, variant });
    const ex = cart.find(l => l.slug === slug && l.variant === variant);
    if (inCart(slug) >= item.max) return toast(item.max === 0 ? 'Deze is helaas uitverkocht.' : 'Meer exemplaren zijn er niet.');
    if (ex) ex.qty++; else cart.push({ slug, variant, qty: 1 });
    saveCart();
    toast(`${esc(item.title)} ligt in je winkelwagen <a href="#winkelwagen">Bekijken</a>`);
  };

  let toastTimer;
  const toast = html => {
    const t = $('#toast'); t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3800);
  };

  /* ---------- bouwstenen ---------- */
  const pdf = k => `pdf/krant/${k.slug}.pdf`;
  const MAANDEN = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  const datum = d => d ? `${+d.slice(6, 8)} ${MAANDEN[+d.slice(4, 6) - 1]} ${d.slice(0, 4)}` : '';
  const fromPrice = p => Math.min(...p.variants.map(v => v.price));
  const sizeClass = p => p.xl ? 'xl' : p.size.startsWith('23') ? 'klein' : 'groot';
  const artImg = (p, cls = '', sizes = '(max-width:760px) 100vw, 58vw', lazy = false, prio = true) =>
    `<img class="${cls}" src="img/art/${p.slug}-1000.webp" srcset="img/thumb/${p.slug}.webp 700w, img/art/${p.slug}-1000.webp 1000w, img/art/${p.slug}.webp ${p.artW || 2000}w" sizes="${sizes}" width="1000" height="1000" alt="${esc(p.title)}, tekening van Staaf"${lazy ? ' loading="lazy"' : ''}${prio ? ' fetchpriority="high"' : ''}>`;
  const tagFor = p => {
    const s = scarcity(p);
    if (s === 'out') return '<span class="tag">Uitverkocht</span>';
    if (s === 'few') return `<span class="tag few">Nog ${leftTotal(p)}</span>`;
    if (p.xl) return '<span class="tag xl">XL</span>';
    return '';
  };
  const card = (p, i = 99) => `
    <a class="card ${scarcity(p) === 'out' ? 'soldout' : ''}" href="#print-${p.slug}">
      <div class="ph">
        <img src="img/thumb/${p.slug}-420.webp" srcset="img/thumb/${p.slug}-420.webp 420w, img/thumb/${p.slug}.webp 700w" sizes="(max-width:760px) 46vw, (max-width:960px) 45vw, 380px" width="420" height="420" alt="${esc(p.title)}, tekening van Staaf"${i > 2 ? ' loading="lazy"' : ''}>
        ${tagFor(p)}
      </div>
      <h3>${esc(p.title)}</h3>
      <div class="meta">${p.size.replace(' x ', ' × ')} · vanaf ${euro(fromPrice(p))}</div>
    </a>`;

  /* ---------- pagina's ---------- */
  const views = {
    shop() {
      const hero = DATA.prints.find(p => p.slug === 'de-oude-wester');
      const xl = DATA.prints.find(p => p.xl);
      const list = DATA.prints.filter(p => filter === 'alle' || sizeClass(p) === filter);
      const counts = { alle: DATA.prints.length, klein: 0, groot: 0, xl: 0 };
      DATA.prints.forEach(p => counts[sizeClass(p)]++);
      return `
        <section class="hero">
          <div>
            <p class="kicker">Gesigneerde fine art prints</p>
            <h1 class="display">Amsterdam vanaf het terras</h1>
            <p class="lede">Een jaar lang tekende Staaf elke week zijn uitzicht vanaf een Amsterdams terras, en schreef Rogier Cornelisse op wat hij zag, rook en hoorde. Elke tekening is er als gesigneerde print in een kleine oplage, los met passe-partout of ingelijst achter museumglas.</p>
            <div class="links"><a class="textlink" href="#prints">Bekijk de ${DATA.prints.length} prints</a><a class="textlink" href="#boek">Het boek</a></div>
          </div>
          <figure class="hero-art">
            <a href="#print-${hero.slug}">${artImg(hero, '', '(max-width:760px) 100vw, 56vw')}</a>
            <figcaption>${esc(hero.title)}. Ook als <a href="#print-${xl.slug}">XL-editie van 90 × 90 cm</a>, oplage ${xl.edition}.</figcaption>
          </figure>
        </section>
        <div class="section-head" id="prints">
          <h2 class="h2">De prints</h2>
          <div class="filters" role="group" aria-label="Filter op formaat">
            ${[['alle', 'Alle'], ['klein', '23 × 23 cm'], ['groot', '32 × 32 cm'], ['xl', 'XL']].map(([k, l]) => `<button data-filter="${k}" class="${filter === k ? 'on' : ''}" aria-pressed="${filter === k}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="grid">${list.map(card).join('')}</div>`;
    },

    print(slug) {
      const p = DATA.prints.find(x => x.slug === slug);
      if (!p) return views.notfound();
      const k = p.krant && DATA.krant.find(x => x.slug === p.krant);
      const s = scarcity(p);
      const firstAvail = p.variants[0];
      const others = DATA.prints.filter(x => x.slug !== slug && sizeClass(x) === sizeClass(p) && scarcity(x) !== 'out').slice(0, 4);
      return `
        <a class="crumb" href="#shop">← Alle prints</a>
        <div class="product">
          <figure class="stage">
            ${artImg(p, 'main')}
            <div class="views">
              <button class="on" data-view="art"><img src="img/thumb/${p.slug}-420.webp" alt=""><span>Tekening</span></button>
              <button data-view="frame"><img src="img/frame/${p.slug}.webp" alt=""><span>Ingelijst</span></button>
              ${k ? `<a class="vlink" href="${pdf(k)}" target="_blank" rel="noopener"><img src="img/krant/${k.slug}-440.webp" alt="" style="object-position:top"><span>De krant</span></a>` : ''}
            </div>
          </figure>
          <div class="info">
            <p class="kicker">Toen we daar zo zaten${p.xl ? ' · XL-editie' : ''}</p>
            <h1 class="display">${esc(p.title)}</h1>
            <p class="sub">Gesigneerde print, oplage ${p.edition}</p>
            <dl class="specs">
              <div><dt>Formaat</dt><dd>${p.size.replace(' x ', ' × ')}, beeld ${p.imageSize.replace(' x ', ' × ')}</dd></div>
              <div><dt>Papier</dt><dd>Hahnemühle Photo Rag, 310 gram</dd></div>
              <div><dt>Druk</dt><dd>Kleurvaste fine art print, gesigneerd</dd></div>
            </dl>
            ${s === 'few' ? `<p class="scarcity">Nog ${leftTotal(p)} van de ${p.edition}</p>` : ''}
            <fieldset class="variants"><legend class="label">Uitvoering</legend>
              ${p.variants.map(v => { const out = s === 'out'; return `
                <label class="variant ${out ? 'out' : ''}">
                  <input type="radio" name="variant" value="${v.id}" ${v.id === firstAvail.id ? 'checked' : ''} ${out ? 'disabled' : ''}>
                  <span class="v-name">${v.id === 'lijst' ? 'Ingelijst' : 'Met passe-partout'}<span class="v-note">${out ? 'Uitverkocht' : v.id === 'lijst' ? 'Zwarte houten lijst, museumglas' : 'Klaar om in te lijsten'}</span></span>
                  <span class="v-price">${euro(v.price)}</span>
                </label>`; }).join('')}
            </fieldset>
            <button class="btn wide" data-add="${p.slug}" ${s === 'out' ? 'disabled' : ''}>${s === 'out' ? 'Uitverkocht' : 'In winkelwagen'}</button>
            <p class="note">${p.xl ? 'Te groot voor de post: ophalen in Galerie Staaf, Bloemgracht 158, of mail ons voor bezorging in Amsterdam.' : `Verzending in Nederland ${euroExact(DATA.shipping.zones[0].pp)}, ingelijst ${euroExact(DATA.shipping.zones[0].lijst)} (stevig verpakt). Gratis ophalen in Galerie Staaf, Bloemgracht 158.`}</p>
          </div>
        </div>
        ${k ? `
        <section class="paper">
          <a class="paper-img" href="${pdf(k)}" target="_blank" rel="noopener" aria-label="Open de krantenpagina van ${esc(k.title)} als PDF"><img src="img/krant/${k.slug}.webp" alt="De pagina over ${esc(k.title)} in PS van Het Parool" loading="lazy" width="1059" height="1359"></a>
          <div>
            <p class="kicker">PS van Het Parool · ${datum(k.date)}</p>
            <blockquote>Zo stond ${esc(k.title)} in de krant: de tekening van Staaf, met het verhaal van Rogier Cornelisse ernaast.</blockquote>
            <a class="btn outline" href="${pdf(k)}" target="_blank" rel="noopener">Lees de krantenpagina (PDF)</a>
          </div>
        </section>` : ''}
        ${others.length ? `<section class="more"><div class="section-head"><h2 class="h2">Ook in dit formaat</h2><a class="textlink" href="#shop">Alle prints</a></div><div class="grid">${others.map(card).join('')}</div></section>` : ''}`;
    },

    krant() {
      return `
        <div class="section-head"><h1 class="h2">De krant</h1><span class="label">${DATA.krant.length} pagina's · PS van Het Parool</span></div>
        <p class="lede">Elke vrijdag een terras: een tekening van Staaf en een verhaal van Rogier. Klik op een pagina om de krant als PDF te openen.</p>
        <div class="krant-grid">${DATA.krant.map((k, i) => `<a href="${pdf(k)}" target="_blank" rel="noopener"><img src="img/krant/${k.slug}-440.webp" alt="Krantenpagina ${esc(k.title)}" loading="lazy" width="1059" height="1359"><span>${esc(k.title)}</span><em>${datum(k.date)} · PDF</em></a>`).join('')}</div>`;
    },

    boek() {
      const out = left('boek') === 0;
      return `
        <div class="split">
          <div class="boek-cover"><button class="inkijk-open" data-inkijk aria-label="Blader door het boek"><img src="img/boek.webp" alt="Omslag van het boek Toen we daar zo zaten" width="1181" height="1181"><span class="inkijk-badge">Inkijkexemplaar</span></button></div>
          <div>
            <p class="kicker">Het boek</p>
            <h1 class="display">Alle 52 verhalen en tekeningen</h1>
            <div class="prose">
              <p>Kunstenaar David (Staaf) de Winter en schrijver Rogier Cornelisse maakten een serie liefdevolle portretten, in woord en beeld, vanaf de mooiste terrassen van Amsterdam. Van Abina tot Zouk, van de Oudezijds tot de Nieuwendammerdijk en van P.King tot De Hoek.</p>
              <p>De tekeningen en de teksten stonden een jaar lang iedere week in bijlage PS van Het Parool en zijn nu gebundeld in één boek.</p>
            </div>
            ${!out && (DATA.boek.note || left('boek') <= FEW) ? `<p class="scarcity">${[DATA.boek.note, left('boek') <= FEW ? `nog ${left('boek')}` : ''].filter(Boolean).join(' · ')}</p>` : ''}
            <p class="price">${euro(DATA.boek.price)}</p>
            <div class="links" style="gap:18px 22px"><button class="btn" data-add="boek" ${out ? 'disabled' : ''}>${out ? 'Uitverkocht' : 'In winkelwagen'}</button><button class="btn outline" data-inkijk>Blader door het boek</button></div>
            <p class="note">116 pagina's, 25 × 25 cm, gebonden.</p>
          </div>
        </div>
        <div class="videos">
          ${(DATA.videos || []).map(v => `
            <div><p class="label">${esc(v.title)}</p>
              <div class="video">${v.src
                ? `<video controls preload="none" playsinline poster="${v.poster}" src="${v.src}"></video>`
                : `<iframe src="https://player.vimeo.com/video/${v.vimeo}&dnt=1" title="${esc(v.title)}" allow="fullscreen; picture-in-picture" loading="lazy"></iframe>`}</div></div>`).join('')}
        </div>`;
    },

    over() {
      return `
        <div class="split over">
          <div>
            <p class="kicker">Over de makers</p>
            <h1 class="display">Staaf &amp; Rogier</h1>
            <div class="prose">
              <p>David de Winter (1973) en Rogier Cornelisse (1975) kennen elkaar uit de reclame. Al meer dan tien jaar werken ze samen als creatief team, het liefst op een Amsterdams terras.</p>
              <p>Op een van die terrassen ontstond het idee voor Toen we daar zo zaten. David tekent, onder zijn pseudoniem Staaf, zijn uitzicht vanaf het terras. Rogier schrijft op wat hij ziet, ruikt, hoort, voelt en zich herinnert. Een jaar lang verscheen het elke vrijdag in PS van Het Parool.</p>
              <p>De Winter is naast kunstschilder filmmaker en visual artist. Cornelisse is schrijver en dichter, en doceert Creative Writing aan de Willem de Kooning Academie in Rotterdam.</p>
            </div>
          </div>
          <img src="img/david-rogier.webp" alt="David de Winter en Rogier Cornelisse lezen Het Parool op een stoep" width="1600" height="1078">
        </div>`;
    },

    plattegrond() {
      const mid = '16TaU1ymHwiP2n8tHsKfHDrW0XpZQBVYP';
      return `
        <div class="section-head"><h1 class="h2">De plattegrond</h1><a class="textlink" href="https://www.google.com/maps/d/viewer?mid=${mid}">Open in Google Maps</a></div>
        <p class="lede">Alle plekken in en om de stad die in de krant stonden. Klik op een icoontje voor de tekening en het verhaal. Weet je een terras waar we echt een keer moeten zitten? Mail het naar staaf@chello.nl.</p>
        <div class="map"><iframe src="https://www.google.com/maps/d/embed?mid=${mid}" title="Kaart van alle terrassen" loading="lazy"></iframe></div>`;
    },

    winkelwagen() {
      if (!cart.length) return `<div class="empty"><p class="kicker">Winkelwagen</p><h1 class="display">Nog leeg</h1><p class="lede">Kies een terras en neem het mee naar huis.</p><a class="btn" href="#shop">Naar de prints</a></div>`;
      const lines = cart.map((l, i) => { const it = findItem(l); return it ? `
        <div class="line">
          <img src="${it.img}" alt="">
          <div><h3>${esc(it.title)}</h3><div class="sub">${esc(it.sub)}</div>
            <div class="qty"><button data-q="${i}" data-d="-1" aria-label="Minder">−</button><span>${l.qty}</span><button data-q="${i}" data-d="1" aria-label="Meer">+</button><button class="rm" data-rm="${i}">Verwijder</button></div></div>
          <div class="line-price">${euroExact(it.price * l.qty)}</div>
        </div>` : ''; }).join('');
      return `
        <div class="section-head"><h1 class="h2">Winkelwagen</h1><a class="textlink" href="#shop">Verder kijken</a></div>
        <div class="cart">
          <div>${lines}</div>
          <form class="summary" id="checkout" novalidate>
            <h2 class="h2">Bezorging</h2>
            <label class="ship-opt"><input type="radio" name="ship" value="post" ${hasXL() ? 'disabled' : 'checked'}><span>Verzenden met PostNL</span><b id="ship-post"></b></label>
            <label class="ship-opt"><input type="radio" name="ship" value="pickup" ${hasXL() ? 'checked' : ''}><span>${esc(DATA.shipping.pickup.label)}</span><b>gratis</b></label>
            ${hasXL() ? '<p class="note">De XL-editie is te groot voor de post. Je haalt hem op in de galerie, of mail ons voor bezorging in Amsterdam.</p>' : ''}
            <div id="zonebox"><label for="f-zone">Verzenden naar</label>
              <select id="f-zone" name="zone">${DATA.shipping.zones.map(z => `<option value="${z.id}">${esc(z.label)}</option>`).join('')}</select></div>
            <h2 class="h2" style="margin-top:30px">Je gegevens</h2>
            <label for="f-name">Naam</label><input id="f-name" name="name" autocomplete="name" required>
            <label for="f-email">E-mail</label><input id="f-email" name="email" type="email" autocomplete="email" required>
            <label for="f-phone">Telefoon (optioneel)</label><input id="f-phone" name="phone" type="tel" autocomplete="tel">
            <div id="addr">
              <label for="f-street">Straat en huisnummer</label><input id="f-street" name="street" autocomplete="street-address">
              <div class="row2"><div><label for="f-zip">Postcode</label><input id="f-zip" name="zip" autocomplete="postal-code"></div>
              <div><label for="f-city">Plaats</label><input id="f-city" name="city" autocomplete="address-level2"></div></div>
              <div id="countrybox"><label for="f-country">Land</label><input id="f-country" name="country" autocomplete="country-name"></div>
            </div>
            <div class="totals" id="totals"></div>
            <button class="btn wide" type="submit">Betalen</button>
            <p class="err" id="err" role="alert" hidden></p>
            <p class="note">Je betaalt veilig via Mollie: iDEAL, creditcard, Bancontact of PayPal.</p>
          </form>
        </div>`;
    },

    bedankt() {
      return `<div class="empty"><p class="kicker">Bestelling ontvangen</p><h1 class="display">Dank je wel</h1><p class="lede">Zodra je betaling binnen is, maken we je bestelling klaar en nemen we contact met je op over ophalen of verzenden. Vragen? Mail naar staaf@chello.nl.</p><a class="btn outline" href="#shop">Terug naar de prints</a></div>`;
    },

    notfound() { return `<div class="empty"><h1 class="display">Niet gevonden</h1><a class="btn" href="#shop">Naar de prints</a></div>`; }
  };

  /* ---------- router ---------- */
  const route = (nav = false) => {
    const h = (location.hash || '#shop').slice(1);
    if (h === 'prints') { if (!$('#prints')) { views_render('shop'); } $('#prints')?.scrollIntoView({ behavior: 'smooth' }); return; }
    let name = h, arg;
    if (h.startsWith('print-')) { name = 'print'; arg = h.slice(6); }
    if (h === 'bedankt') { cart = []; saveCart(); }
    views_render(name, arg);
    if (nav) window.scrollTo(0, 0);
  };
  const views_render = (name, arg) => {
    const fn = views[name] || views.notfound;
    view.innerHTML = fn(arg);
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === (name === 'print' ? 'shop' : name)));
    const p = name === 'print' && DATA.prints.find(x => x.slug === arg);
    document.title = p ? `${p.title} · Toen we daar zo zaten` : 'Toen we daar zo zaten · Staaf & Rogier Cornelisse';
    if (name === 'winkelwagen' && cart.length) renderTotals();
  };
  const rerender = () => { const y = window.scrollY; const h = (location.hash || '#shop').slice(1); views_render(h.startsWith('print-') ? 'print' : (h === 'prints' ? 'shop' : h), h.startsWith('print-') ? h.slice(6) : undefined); window.scrollTo(0, y); };

  // Homepage staat al in de HTML: voorraadlabels erbij zetten zonder de beelden te vervangen.
  const hydrateShop = () => {
    view.querySelectorAll('.card').forEach(c => {
      const p = DATA.prints.find(x => x.slug === c.getAttribute('href').slice(7)); if (!p) return;
      c.querySelector('.tag')?.remove();
      const t = tagFor(p); if (t) c.querySelector('.ph').insertAdjacentHTML('beforeend', t);
      c.classList.toggle('soldout', scarcity(p) === 'out');
    });
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === 'shop'));
    if (location.hash === '#prints') $('#prints')?.scrollIntoView();
  };

  /* ---------- afrekenen ---------- */
  const hasXL = () => cart.some(l => DATA.prints.find(p => p.slug === l.slug)?.xl);
  const shipItems = () => cart.map(l => ({ slug: l.slug, variant: l.variant, qty: l.qty, xl: !!DATA.prints.find(p => p.slug === l.slug)?.xl }));
  const shipping = () => {
    const pickup = $('input[name=ship]:checked')?.value === 'pickup';
    const zone = pickup ? 'pickup' : ($('#f-zone')?.value || 'nl');
    return { zone, pickup, ...window.TWDZZShipping.calc(DATA.shipping, shipItems(), zone) };
  };
  const renderTotals = () => {
    const sub = cart.reduce((a, l) => { const it = findItem(l); return a + (it ? it.price * l.qty : 0); }, 0);
    const s = shipping();
    const post = window.TWDZZShipping.calc(DATA.shipping, shipItems(), $('#f-zone').value);
    $('#ship-post').textContent = post.ok ? euroExact(post.price) : '';
    $('#totals').innerHTML = `<div><span>Subtotaal</span><span>${euroExact(sub)}</span></div><div><span>Bezorging</span><span>${s.pickup ? 'gratis' : euroExact(s.price)}</span></div><div class="grand"><span>Totaal</span><span>${euroExact(sub + s.price)}</span></div>`;
    $('#addr').hidden = $('#zonebox').hidden = s.pickup;
    $('#countrybox').hidden = s.zone === 'nl';
  };
  const checkout = async form => {
    const err = $('#err'); err.hidden = true;
    const f = Object.fromEntries(new FormData(form));
    const s = shipping();
    if (s.zone === 'nl') f.country = 'Nederland';
    if (!s.ok) { err.textContent = s.reason; err.hidden = false; return; }
    const need = ['name', 'email'].concat(s.pickup ? [] : ['street', 'zip', 'city', 'country']);
    if (need.some(k => !String(f[k] || '').trim()) || !/^\S+@\S+\.\S+$/.test(f.email || '')) {
      err.textContent = 'Vul je naam, een geldig e-mailadres' + (s.pickup ? '' : ' en je adres') + ' in.'; err.hidden = false; return;
    }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Even geduld';
    try {
      const r = await fetch('/.netlify/functions/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, shipping: s.zone, customer: f, returnUrl: location.origin + location.pathname + '#bedankt' })
      });
      const j = await r.json();
      if (!r.ok || !j.checkoutUrl) throw new Error(j.error || 'Afrekenen lukt nu niet.');
      location.href = j.checkoutUrl;
    } catch (e) {
      err.textContent = (e instanceof TypeError || /JSON/.test(e.message)) ? 'Afrekenen is in dit voorbeeld niet aangesloten. Op de echte site ga je hier door naar iDEAL.' : e.message;
      err.hidden = false; btn.disabled = false; btn.textContent = 'Betalen';
      loadStock().then(rerender);
    }
  };

  /* ---------- vergroting ---------- */
  const lb = $('#lightbox');
  let lbList = [], lbIdx = 0, lbReturn = null;
  const lbShow = () => {
    const it = lbList[lbIdx];
    $('img', lb).src = it.src; $('img', lb).alt = it.caption;
    $('figcaption', lb).innerHTML = esc(it.caption) + (it.print ? ` · <a href="#print-${it.print}">Bekijk de print</a>` : '');
    $('.lb-prev', lb).hidden = $('.lb-next', lb).hidden = lbList.length < 2;
  };
  const lbOpen = (list, i) => { lbReturn = document.activeElement; lbList = list; lbIdx = i; lbShow(); lb.hidden = false; document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus(); };
  const lbClose = () => { lb.hidden = true; document.body.style.overflow = ''; lbReturn?.focus?.(); };
  const step = d => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; lbShow(); };
  const krantList = () => DATA.krant.map(k => ({ src: `img/krant/${k.slug}.webp`, caption: k.title, print: (DATA.prints.find(p => p.krant === k.slug && !p.xl) || {}).slug }));
  lb.addEventListener('click', e => {
    if (e.target.closest('.lb-prev')) step(-1);
    else if (e.target.closest('.lb-next')) step(1);
    else if (e.target.closest('a')) lbClose();
    else if (e.target === lb || e.target.closest('.lb-close')) lbClose();
  });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* ---------- ingelijste versie bij hover, pas laden als het nodig is ---------- */
  if (matchMedia('(hover:hover)').matches) view.addEventListener('pointerover', e => {
    const c = e.target.closest('.card'); if (!c || c.dataset.f) return;
    c.dataset.f = 1; const img = new Image(); img.className = 'alt'; img.alt = ''; img.decoding = 'async';
    img.src = `img/frame/${c.getAttribute('href').slice(7)}.webp`;
    img.onload = () => { c.querySelector('.ph').insertBefore(img, c.querySelector('.tag')); requestAnimationFrame(() => c.classList.add('hovered')); };
  });

  /* ---------- inkijkexemplaar ---------- */
  const ink = { el: null, i: 0, list: [] };
  const inkPages = () => {
    const wide = matchMedia('(min-width:761px)').matches;
    return wide ? DATA.boek.inkijk : DATA.boek.inkijk.flat().map(p => [p]);
  };
  const inkShow = (dir = 0) => {
    const sp = ink.list[ink.i], stage = $('.ink-stage', ink.el);
    stage.className = 'ink-stage ' + (sp.length === 2 ? 'two' : 'one') + (dir ? (dir > 0 ? ' in-next' : ' in-prev') : '');
    stage.innerHTML = sp.map(p => `<img src="img/inkijk/${p}.webp" alt="${p === 'voor' ? 'Voorkant' : p === 'achter' ? 'Achterkant' : 'Pagina ' + parseInt(p.slice(1), 10)}">`).join('');
    $('.ink-count', ink.el).textContent = `${ink.i + 1} / ${ink.list.length}`;
    $('.ink-prev', ink.el).disabled = ink.i === 0; $('.ink-next', ink.el).disabled = ink.i === ink.list.length - 1;
    (ink.list[ink.i + 1] || []).forEach(p => { const im = new Image(); im.src = `img/inkijk/${p}.webp`; });
  };
  const inkGo = d => { const n = ink.i + d; if (n < 0 || n >= ink.list.length) return; ink.i = n; inkShow(d); };
  const inkOpen = () => {
    if (!ink.el) {
      ink.el = document.createElement('div'); ink.el.className = 'inkijk'; ink.el.setAttribute('role', 'dialog'); ink.el.setAttribute('aria-modal', 'true'); ink.el.setAttribute('aria-label', 'Inkijkexemplaar');
      ink.el.innerHTML = `<div class="ink-top"><span class="label">Inkijkexemplaar · Toen we daar zo zaten</span><button class="ink-close" aria-label="Sluiten">×</button></div>
        <div class="ink-stage"></div>
        <div class="ink-bar"><button class="ink-prev" aria-label="Vorige pagina">‹</button><span class="ink-count"></span><button class="ink-next" aria-label="Volgende pagina">›</button></div>
        <p class="ink-foot">Je bladert door de eerste pagina's. Het hele boek telt 52 verhalen en tekeningen.</p>`;
      document.body.appendChild(ink.el);
      ink.el.addEventListener('click', e => {
        if (e.target.closest('.ink-close') || e.target === ink.el) return inkClose();
        if (e.target.closest('.ink-prev')) return inkGo(-1);
        if (e.target.closest('.ink-next')) return inkGo(1);
        const st = e.target.closest('.ink-stage'); if (st) { const r = st.getBoundingClientRect(); inkGo(e.clientX < r.left + r.width / 2 ? -1 : 1); }
      });
      let x0 = null;
      ink.el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      ink.el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) inkGo(dx < 0 ? 1 : -1); x0 = null; });
    }
    ink.list = inkPages(); ink.i = 0; ink.ret = document.activeElement;
    ink.el.hidden = false; document.body.style.overflow = 'hidden'; inkShow(); $('.ink-next', ink.el).focus();
  };
  const inkClose = () => { ink.el.hidden = true; document.body.style.overflow = ''; ink.ret?.focus?.(); };
  document.addEventListener('keydown', e => {
    if (!ink.el || ink.el.hidden) return;
    if (e.key === 'Escape') inkClose(); if (e.key === 'ArrowRight') inkGo(1); if (e.key === 'ArrowLeft') inkGo(-1);
  });

  /* ---------- klikken ---------- */
  view.addEventListener('click', e => {
    const t = e.target;
    const fb = t.closest('[data-filter]'); if (fb) { filter = fb.dataset.filter; rerender(); return; }
    const kt = t.closest('[data-krant]');
    if (kt) { const i = DATA.krant.findIndex(k => k.slug === kt.dataset.krant); lbOpen(krantList(), i); return; }
    const vw = t.closest('[data-view]');
    if (vw) {
      const slug = location.hash.slice(7), main = $('.stage .main');
      if (vw.dataset.view === 'frame') { main.srcset = ''; main.src = `img/frame/${slug}.webp`; }
      else { main.src = `img/art/${slug}-1000.webp`; const pp = DATA.prints.find(x => x.slug === slug); main.srcset = `img/art/${slug}-1000.webp 1000w, img/art/${slug}.webp ${pp.artW || 2000}w`; }
      document.querySelectorAll('.views button').forEach(b => b.classList.toggle('on', b === vw)); return;
    }
    if (t.closest('.stage .main')) { const slug = location.hash.slice(7); const isFrame = t.src.includes('/frame/'); lbOpen([{ src: isFrame ? `img/frame/${slug}.webp` : `img/art/${slug}.webp`, caption: t.alt }], 0); return; }
    if (t.closest('[data-inkijk]')) { inkOpen(); return; }
    const z = t.closest('[data-zoom]'); if (z) { lbOpen([{ src: z.dataset.zoom, caption: z.alt }], 0); return; }
    const add = t.closest('[data-add]');
    if (add) {
      if (add.dataset.add === 'boek') return addToCart('boek', 'boek');
      const v = $('input[name=variant]:checked'); if (v) addToCart(add.dataset.add, v.value); return;
    }
    const q = t.closest('[data-q]');
    if (q) {
      const l = cart[+q.dataset.q]; const it = findItem(l);
      l.qty += +q.dataset.d;
      const over = inCart(l.slug) - it.max;
      if (over > 0) { l.qty -= over; toast('Meer exemplaren zijn er niet.'); }
      if (l.qty < 1) cart.splice(+q.dataset.q, 1);
      saveCart(); rerender(); return;
    }
    const rm = t.closest('[data-rm]'); if (rm) { cart.splice(+rm.dataset.rm, 1); saveCart(); rerender(); }
  });
  view.addEventListener('change', e => { if (e.target.name === 'ship' || e.target.name === 'zone') renderTotals(); });
  view.addEventListener('submit', e => { e.preventDefault(); if (e.target.id === 'checkout') checkout(e.target); });
  window.addEventListener('hashchange', () => route(true));

  /* ---------- start ---------- */
  const seedStock = d => {
    const s = {}; d.prints.forEach(p => { s[p.slug] = p.variants.reduce((a, v) => a + (v.stock ?? 0), 0); });
    s.boek = d.boek.stock ?? 999; return s;
  };
  const loadStock = () => fetch('/.netlify/functions/stock', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject()).then(s => { STOCK = s; })
    .catch(() => {}); // geen functie (voorbeeld): voorraad uit data.json
  // Gegevens en voorraad tegelijk ophalen. Is de voorraad er binnen 600 ms,
  // dan in één keer tekenen; anders eerst tekenen en daarna bijwerken.
  let liveStock = null, drawn = false;
  const stockReq = fetch('/.netlify/functions/stock').then(r => r.ok ? r.json() : null).catch(() => null)
    .then(s => { liveStock = s; if (s && drawn && JSON.stringify(s) !== JSON.stringify(STOCK)) { STOCK = s; const h = (location.hash || '#shop').slice(1); (h === 'shop' || h === 'prints') ? hydrateShop() : rerender(); } });
  fetch('data.json').then(r => r.json()).then(async d => {
    DATA = d; STOCK = seedStock(d);
    await Promise.race([stockReq, new Promise(r => setTimeout(r, 600))]);
    if (liveStock) STOCK = liveStock;
    cart = cart.filter(l => findItem(l));
    updateCount();
    const h = (location.hash || '#shop').slice(1);
    if (view.querySelector('.grid .card') && (h === 'shop' || h === 'prints')) hydrateShop(); // vooraf ingevuld: alleen aanvullen
    else route();
    drawn = true;
    document.documentElement.classList.remove('deep');
  });
})();
