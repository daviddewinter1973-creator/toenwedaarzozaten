"""Zet de opmaak van de homepage alvast in index.html, zodat het eerste beeld
verschijnt zonder op JavaScript te wachten. Draai opnieuw na wijzigingen in
data.json of in de vormgeving:  python3 tools/prerender.py  (vanuit de sitemap,
met een lokale server op poort 8765)."""
import asyncio, re, sys
from playwright.async_api import async_playwright
PATH = 'index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        await pg.route('**/.netlify/functions/stock', lambda r: r.fulfill(status=404, body=''))
        empty = re.sub(r'<main id="view" tabindex="-1">.*?</main>', '<main id="view" tabindex="-1"></main>', open(PATH).read(), flags=re.S)
        await pg.route('http://localhost:8765/', lambda r: r.fulfill(status=200, content_type='text/html', body=empty))
        await pg.goto('http://localhost:8765/#shop'); await pg.wait_for_selector('.grid .card')
        html = await pg.eval_on_selector('#view', 'e => e.innerHTML')
        await b.close()
    # voorraadlabels horen niet in de vaste HTML: die vult het script live in
    html = re.sub(r'<span class="tag[^"]*">[^<]*</span>', '', html)
    src = open(PATH).read()
    src = re.sub(r'<main id="view" tabindex="-1">.*?</main>', '<main id="view" tabindex="-1">' + html.strip() + '</main>', src, flags=re.S)
    open(PATH, 'w').write(src); print('prerendered', len(html), 'bytes')
asyncio.run(main())
