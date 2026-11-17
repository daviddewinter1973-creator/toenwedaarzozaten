/* Toen we daar zo zaten: winkel en site */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');
  const euro = c => '€ ' + (c / 100).toFixed(2).replace('.', ',');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let DATA = null;
  let filter = 'alle';

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
    if (l.slug === 'boek') return { title: 'Boek: Toen we daar zo zaten', img: 'img/boek.jpg', price: DATA.boek.price, label: 'Boek', stock: null };
    const p = DATA.prints.find(x => x.slug === l.slug); if (!p) return null;
    const v = p.variants.find(x => x.id === l.variant); if (!v) return null;
    return { title: p.title, img: `img/thumb/${p.slug}.jpg`, price: v.price, label: v.label, stock: v.stock, size: p.size };
  };
  const addToCart = (slug, variant) => {
    const ex = cart.find(l => l.slug === slug && l.variant === variant);
    const item = findItem({ slug, variant });
    if (ex) {
      if (item.stock != null && ex.qty >= item.stock) return toast('Meer exemplaren hebben we niet op voorraad.');
      ex.qty++;
    } else cart.push({ slug, variant, qty: 1 });
    saveCart();
    toast(`${esc(item.title)} zit in je winkelwagen. <a href="#winkelwagen">Bekijken</a>`);
  };

  let toastTimer;
  const toast = html => {
    const t = $('#toast'); t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
  };

  /* ---------- helpers ---------- */
  const fromPrice = p => Math.min(...p.variants.map(v => v.price));
  const totalStock = p => p.variants.reduce((a, v) => a + (v.stock ?? 99), 0);
  const sizeClass = p => p.xl ? 'xl' : p.size.startsWith('23') ? 'klein' : 'groot';
  const card = p => `
    <a class="card" href="#print-${p.slug}">
      <div class="ph"><img src="img/thumb/${p.slug}.jpg" alt="${esc(p.title)}, tekening van Staaf" loading="lazy"><img class="alt" src="img/frame/${p.slug}.jpg" alt="" loading="lazy"></div>
      <h3>${esc(p.title)}${p.xl ? '<span class="tag red">XL</span>' : ''}${totalStock(p) === 0 ? '<span class="tag">Uitverkocht</span>' : ''}</h3>
      <div class="meta">${esc(p.size)} · vanaf ${euro(fromPrice(p))}</div>
    </a>`;

  /* ---------- views ---------- */
  const views = {
    shop() {
      const list = DATA.prints.filter(p => filter === 'alle' || sizeClass(p) === filter);
      return `
        <p class="kicker">Gesigneerde fine art prints</p>
        <h2 class="section">Amsterdam vanaf het terras</h2>
        <p class="lede">Een jaar lang tekende Staaf elke week zijn uitzicht vanaf een Amsterdams terras, en schreef Rogier Cornelisse op wat hij zag, rook en hoorde. De tekeningen zijn er als gesigneerde print op Hahnemühle Photo Rag, in een beperkte oplage. Los met passe-partout, of kant-en-klaar in een zwarte houten lijst met museumglas.</p>
        <div class="filters" role="group" aria-label="Filter op formaat">
          ${[['alle', 'Alle prints'], ['klein', '23 × 23 cm'], ['groot', '32 × 32 cm'], ['xl', 'XL 90 × 90 cm']].map(([k, l]) => `<button data-filter="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}
        </div>
        <div class="grid">${list.map(card).join('')}</div>`;
    },

    print(slug) {
      const p = DATA.prints.find(x => x.slug === slug);
      if (!p) return views.notfound();
      const k = p.krant && DATA.krant.find(x => x.slug === p.krant);
      const firstAvail = p.variants.find(v => v.stock !== 0) || p.variants[0];
      const others = DATA.prints.filter(x => x.slug !== slug && sizeClass(x) === sizeClass(p)).slice(0, 6);
      return `
        <a class="back" href="#shop">← Alle prints</a>
        <div class="product">
          <div class="gallery">
            <img class="main" src="img/art/${p.slug}.jpg" alt="${esc(p.title)}, tekening van Staaf" data-lb="art">
            <div class="thumbs">
              <button class="on" data-src="img/art/${p.slug}.jpg" aria-label="Tekening"><img src="img/thumb/${p.slug}.jpg" alt=""></button>
              <button data-src="img/frame/${p.slug}.jpg" aria-label="Ingelijst"><img src="img/frame/${p.slug}.jpg" alt=""></button>
            </div>
          </div>
          <div class="info">
            <p class="kicker">Toen we daar zo zaten${p.xl ? ' · XL special edition' : ''}</p>
            <h2>${esc(p.title)}</h2>
            <ul class="specs">
              <li><span>Print</span><span>Gesigneerde fine art print, kleurvast</span></li>
              <li><span>Oplage</span><span>${p.edition} exemplaren</span></li>
              <li><span>Formaat</span><span>${esc(p.size)} (beeld ${esc(p.imageSize)})</span></li>
              <li><span>Papier</span><span>Hahnemühle Photo Rag, 310 gram</span></li>
            </ul>
            <fieldset class="variants"><legend>Kies je uitvoering</legend>
              ${p.variants.map(v => `
                <label class="variant ${v.stock === 0 ? 'soldout' : ''}">
                  <input type="radio" name="variant" value="${v.id}" ${v.id === firstAvail.id ? 'checked' : ''} ${v.stock === 0 ? 'disabled' : ''}>
                  <span class="v-label">${esc(v.label)}<span class="v-stock">${v.stock === 0 ? 'Uitverkocht' : v.stock != null && v.stock <= 5 ? `Nog ${v.stock} op voorraad` : 'Op voorraad'}</span></span>
                  <span class="v-price">${euro(v.price)}</span>
                </label>`).join('')}
            </fieldset>
            <button class="btn wide" data-add="${p.slug}" ${totalStock(p) === 0 ? 'disabled' : ''}>${totalStock(p) === 0 ? 'Uitverkocht' : 'In winkelwagen'}</button>
            <p class="small" style="margin-top:12px">Verzending binnen Nederland ${euro(725)}, of gratis ophalen in Galerie Staaf aan de Bloemgracht.</p>
            ${k ? `<a class="krant-teaser" href="#krant" data-krant="${k.slug}"><img src="img/krant/${k.slug}.jpg" alt=""><span><span class="kicker">Zoals het in Het Parool stond</span><strong>Lees het verhaal van Rogier</strong></span></a>` : ''}
          </div>
        </div>
        ${others.length ? `<section class="more"><p class="kicker">Ook in dit formaat</p><div class="grid">${others.map(card).join('')}</div></section>` : ''}`;
    },

    krant() {
      return `
        <p class="kicker">PS van Het Parool</p>
        <h2 class="section">De krantenpagina's</h2>
        <p class="lede">Elke vrijdag een terras: een tekening van Staaf en een verhaal van Rogier. Klik op een pagina om hem groot te lezen.</p>
        <div class="krant-grid">${DATA.krant.map((k, i) => `<button data-kidx="${i}"><img src="img/krant/${k.slug}.jpg" alt="Krantenpagina ${esc(k.title)}" loading="lazy"><span>${esc(k.title)}</span></button>`).join('')}</div>`;
    },

    boek() {
      return `
        <div class="boek">
          <img src="img/boek.jpg" alt="Omslag van het boek Toen we daar zo zaten" data-lb="boek" style="cursor:zoom-in;background:#fff">
          <div>
            <p class="kicker">Het boek</p>
            <h2 class="section">Alle 52 verhalen en tekeningen in één boek</h2>
            <p>Kunstenaar David (Staaf) de Winter en schrijver Rogier Cornelisse maakten een serie liefdevolle portretten, in woord en beeld, vanaf de mooiste terrassen van Amsterdam. Van Abina tot Zouk, van de Oudezijds tot de Nieuwendammerdijk en van P.King tot De Hoek.</p>
            <p>De tekeningen en de teksten stonden een jaar lang iedere week in bijlage PS van Het Parool en zijn nu gebundeld in dit boek.</p>
            <p class="price">${euro(DATA.boek.price)}</p>
            <button class="btn" data-add="boek">In winkelwagen</button>
            <p class="small" style="margin-top:12px">Betalen met iDEAL, creditcard en meer. Liever een betaalverzoek? Mail je adres en het aantal exemplaren naar staaf@chello.nl.</p>
          </div>
        </div>
        <div class="videos">
          ${[['Het crowdfundingfilmpje', '585264794?h=1a469316f3'], ['Bij de drukker', '630845011?h=2d0d074a84']].map(([t, id]) => `
            <div><p class="video-label">${t}</p>
              <div class="video"><iframe src="https://player.vimeo.com/video/${id}&dnt=1" title="${t}" allow="fullscreen; picture-in-picture" loading="lazy"></iframe></div>
              <p class="small"><a href="https://vimeo.com/${id.replace('?h=', '/')}">Bekijk op Vimeo</a></p></div>`).join('')}
        </div>`;
    },

    over() {
      return `
        <div class="over">
          <div>
            <p class="kicker">Over de makers</p>
            <h2 class="section">Staaf &amp; Rogier</h2>
            <p>David de Winter (1973) en Rogier Cornelisse (1975) kennen elkaar uit de reclame. Al meer dan tien jaar werken ze regelmatig samen als freelance creatief team. Het art-director-en-copywriterduo maakte campagnes voor klanten als Calvé, HEMA, Melkunie en Monuta. Dat doen ze vaak op een Amsterdams terras.</p>
            <p>Op een van die terrassen ontstond het idee voor de serie Toen we daar zo zaten. David schildert, onder zijn pseudoniem Staaf, zijn uitzicht vanaf het terras en Rogier schrijft op wat hij ziet, ruikt, hoort, voelt en zich herinnert. De serie verscheen elke vrijdag in bijlage PS van Het Parool.</p>
            <p>De Winter is naast kunstschilder vooral filmmaker en visual artist. Cornelisse is naast reclamemaker ook schrijver en dichter, en doceert Creative Writing aan de Willem de Kooning Academie in Rotterdam.</p>
          </div>
          <img src="img/david-rogier.jpg" alt="David de Winter en Rogier Cornelisse lezen Het Parool op een stoep">
        </div>`;
    },

    plattegrond() {
      const src = 'https://www.google.com/maps/d/embed?mid=16TaU1ymHwiP2n8tHsKfHDrW0XpZQBVYP';
      return `
        <p class="kicker">Alle terrassen</p>
        <h2 class="section">De plattegrond</h2>
        <p class="lede">Hier zie je alle plekken in en om de stad die in de krant hebben gestaan. Klik op een icoontje om de tekening te bekijken en het verhaal te lezen. Ken jij een plek waar we echt een keer naartoe moeten? Mail het naar staaf@chello.nl.</p>
        <div class="map"><iframe src="${src}" title="Kaart van alle terrassen" loading="lazy"></iframe></div>
        <p class="small" style="margin-top:10px"><a href="https://www.google.com/maps/d/viewer?mid=16TaU1ymHwiP2n8tHsKfHDrW0XpZQBVYP">Open de kaart in Google Maps</a></p>`;
    },

    winkelwagen() {
      if (!cart.length) return `<div class="empty"><h2 class="section">Je winkelwagen is leeg</h2><p class="lede" style="margin:10px auto 26px">Kies een terras en neem het mee naar huis.</p><a class="btn" href="#shop">Naar de prints</a></div>`;
      const lines = cart.map((l, i) => { const it = findItem(l); return it ? `
        <div class="line">
          <img src="${it.img}" alt="">
          <div><h3>${esc(it.title)}</h3><div class="small">${esc(it.label)}${it.size ? ' · ' + esc(it.size) : ''}</div>
            <div class="qty"><button data-q="${i}" data-d="-1" aria-label="Minder">−</button><span>${l.qty}</span><button data-q="${i}" data-d="1" aria-label="Meer">+</button><button class="rm" data-rm="${i}">Verwijderen</button></div></div>
          <div class="line-price">${euro(it.price * l.qty)}</div>
        </div>` : ''; }).join('');
      return `
        <p class="kicker">Afrekenen</p>
        <h2 class="section">Je winkelwagen</h2>
        <div class="cart">
          <div>${lines}<p style="margin-top:22px"><a class="back" href="#shop">← Verder kijken</a></p></div>
          <form class="summary" id="checkout" novalidate>
            <h3>Bezorging</h3>
            ${DATA.shipping.map((s, i) => `<label class="ship-opt"><input type="radio" name="ship" value="${s.id}" ${i === 0 ? 'checked' : ''}><span>${esc(s.label)}</span><span>${s.price ? euro(s.price) : 'gratis'}</span></label>`).join('')}
            <h3 style="margin-top:22px">Je gegevens</h3>
            <label for="f-name">Naam</label><input id="f-name" name="name" autocomplete="name" required>
            <label for="f-email">E-mail</label><input id="f-email" name="email" type="email" autocomplete="email" required>
            <label for="f-phone">Telefoon <span class="small">(optioneel)</span></label><input id="f-phone" name="phone" type="tel" autocomplete="tel">
            <div id="addr">
              <label for="f-street">Straat en huisnummer</label><input id="f-street" name="street" autocomplete="street-address">
              <div class="row2"><div><label for="f-zip">Postcode</label><input id="f-zip" name="zip" autocomplete="postal-code"></div>
              <div><label for="f-city">Plaats</label><input id="f-city" name="city" autocomplete="address-level2"></div></div>
              <label for="f-country">Land</label><input id="f-country" name="country" autocomplete="country-name" value="Nederland">
            </div>
            <div class="totals" id="totals"></div>
            <button class="btn wide" type="submit">Betalen</button>
            <p class="err" id="err" hidden></p>
            <p class="small" style="margin-top:12px">Je betaalt veilig via Mollie met iDEAL, creditcard, Bancontact of PayPal.</p>
          </form>
        </div>`;
    },

    bedankt() {
      return `<div class="empty"><p class="kicker">Bestelling ontvangen</p><h2 class="section">Dank je wel!</h2><p class="lede" style="margin:10px auto 26px">Zodra je betaling binnen is, maken we je bestelling klaar. Je krijgt een bevestiging per e-mail. Vragen? Mail naar staaf@chello.nl.</p><a class="btn ghost" href="#shop">Terug naar de prints</a></div>`;
    },

    notfound() { return `<div class="empty"><h2 class="section">Deze pagina bestaat niet (meer)</h2><a class="btn" href="#shop">Naar de prints</a></div>`; }
  };

  /* ---------- router ---------- */
  const route = () => {
    const h = (location.hash || '#shop').slice(1);
    let name = h, arg;
    if (h.startsWith('print-')) { name = 'print'; arg = h.slice(6); }
    if (h === 'bedankt') { cart = []; saveCart(); }
    const fn = views[name] || views.notfound;
    view.innerHTML = fn(arg);
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === (name === 'print' ? 'shop' : name)));
    const p = name === 'print' && DATA.prints.find(x => x.slug === arg);
    document.title = p ? `${p.title} · Toen we daar zo zaten` : 'Toen we daar zo zaten';
    if (name === 'winkelwagen' && cart.length) renderTotals();
    window.scrollTo(0, 0);
  };

  /* ---------- totals en afrekenen ---------- */
  const shipping = () => {
    const sel = $('input[name=ship]:checked');
    return DATA.shipping.find(s => s.id === (sel ? sel.value : 'nl'));
  };
  const renderTotals = () => {
    const sub = cart.reduce((a, l) => { const it = findItem(l); return a + (it ? it.price * l.qty : 0); }, 0);
    const s = shipping();
    $('#totals').innerHTML = `<div><span>Subtotaal</span><span>${euro(sub)}</span></div><div><span>Bezorging</span><span>${s.price ? euro(s.price) : 'gratis'}</span></div><div class="grand"><span>Totaal</span><span>${euro(sub + s.price)}</span></div>`;
    $('#addr').hidden = s.id === 'pickup';
  };
  const checkout = async form => {
    const err = $('#err'); err.hidden = true;
    const f = Object.fromEntries(new FormData(form));
    const s = shipping();
    const need = ['name', 'email'].concat(s.id === 'pickup' ? [] : ['street', 'zip', 'city', 'country']);
    const missing = need.filter(k => !String(f[k] || '').trim());
    if (missing.length || !/^\S+@\S+\.\S+$/.test(f.email || '')) {
      err.textContent = 'Vul je naam, een geldig e-mailadres' + (s.id === 'pickup' ? '' : ' en je adres') + ' in.'; err.hidden = false; return;
    }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Even geduld…';
    try {
      const r = await fetch('/.netlify/functions/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, shipping: s.id, customer: f, returnUrl: location.origin + location.pathname + '#bedankt' })
      });
      const j = await r.json();
      if (!r.ok || !j.checkoutUrl) throw new Error(j.error || 'Afrekenen lukt nu niet.');
      location.href = j.checkoutUrl;
    } catch (e) {
      err.textContent = (e instanceof TypeError || /JSON/.test(e.message)) ? 'Afrekenen is in dit voorbeeld nog niet aangesloten. Op de echte site ga je hier door naar iDEAL.' : e.message;
      err.hidden = false; btn.disabled = false; btn.textContent = 'Betalen';
    }
  };

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox');
  let lbList = [], lbIdx = 0;
  const lbShow = () => {
    const it = lbList[lbIdx];
    $('img', lb).src = it.src; $('img', lb).alt = it.caption;
    const prod = it.print ? ` · <a href="#print-${it.print}">Bekijk de print</a>` : '';
    $('figcaption', lb).innerHTML = esc(it.caption) + prod;
    $('.lb-prev', lb).hidden = $('.lb-next', lb).hidden = lbList.length < 2;
  };
  const lbOpen = (list, i) => { lbList = list; lbIdx = i; lbShow(); lb.hidden = false; document.body.style.overflow = 'hidden'; };
  const lbClose = () => { lb.hidden = true; document.body.style.overflow = ''; };
  const krantList = () => DATA.krant.map(k => ({ src: `img/krant/${k.slug}.jpg`, caption: k.title, print: (DATA.prints.find(p => p.krant === k.slug && !p.xl) || {}).slug }));
  lb.addEventListener('click', e => {
    if (e.target.closest('.lb-prev')) { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; lbShow(); }
    else if (e.target.closest('.lb-next')) { lbIdx = (lbIdx + 1) % lbList.length; lbShow(); }
    else if (e.target.closest('a')) lbClose();
    else if (e.target === lb || e.target.closest('.lb-close')) lbClose();
  });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; lbShow(); }
    if (e.key === 'ArrowRight') { lbIdx = (lbIdx + 1) % lbList.length; lbShow(); }
  });

  /* ---------- events ---------- */
  view.addEventListener('click', e => {
    const t = e.target;
    const fb = t.closest('[data-filter]'); if (fb) { filter = fb.dataset.filter; route(); return; }
    const th = t.closest('.thumbs button');
    if (th) { $('.gallery .main').src = th.dataset.src; document.querySelectorAll('.thumbs button').forEach(b => b.classList.toggle('on', b === th)); return; }
    const main = t.closest('[data-lb]');
    if (main) { lbOpen([{ src: main.getAttribute('src').replace('/thumb/', '/art/'), caption: main.alt }], 0); return; }
    const add = t.closest('[data-add]');
    if (add) {
      if (add.dataset.add === 'boek') return addToCart('boek', 'boek');
      const v = $('input[name=variant]:checked'); if (v) addToCart(add.dataset.add, v.value); return;
    }
    const kt = t.closest('[data-krant]');
    if (kt) { e.preventDefault(); const i = DATA.krant.findIndex(k => k.slug === kt.dataset.krant); lbOpen(krantList(), i); return; }
    const kb = t.closest('[data-kidx]'); if (kb) { lbOpen(krantList(), +kb.dataset.kidx); return; }
    const q = t.closest('[data-q]');
    if (q) {
      const l = cart[+q.dataset.q]; const it = findItem(l);
      l.qty += +q.dataset.d;
      if (it.stock != null && l.qty > it.stock) { l.qty = it.stock; toast('Meer exemplaren hebben we niet op voorraad.'); }
      if (l.qty < 1) cart.splice(+q.dataset.q, 1);
      saveCart(); route(); return;
    }
    const rm = t.closest('[data-rm]'); if (rm) { cart.splice(+rm.dataset.rm, 1); saveCart(); route(); }
  });
  view.addEventListener('change', e => { if (e.target.name === 'ship') renderTotals(); });
  view.addEventListener('submit', e => { e.preventDefault(); if (e.target.id === 'checkout') checkout(e.target); });
  window.addEventListener('hashchange', route);

  fetch('data.json').then(r => r.json()).then(d => {
    DATA = d;
    cart = cart.filter(l => findItem(l));
    updateCount(); route();
  });
})();
