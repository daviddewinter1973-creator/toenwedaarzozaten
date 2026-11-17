# Toen we daar zo zaten

Statische site op Netlify, met drie functies:
- `checkout`: maakt een Mollie-betaling aan (prijs en voorraad komen van de server).
- `mollie-webhook`: boekt een betaalde bestelling af van de voorraad.
- `stock` en `beheer`: voorraad lezen en aanpassen. Opslag in Netlify Blobs.

## Instellingen in Netlify (Environment variables)
- `MOLLIE_API_KEY`: test_... om te testen, live_... voor echte verkoop.
- `ADMIN_PASSWORD`: wachtwoord voor /beheer.html.

## Voorraad
Ga naar /beheer.html. Op de site is het aantal pas zichtbaar bij 10 of minder;
bij 0 is de print uitverkocht en niet te bestellen. Betaalde bestellingen worden
automatisch afgeboekt. Prijzen, titels en verzendkosten staan in data.json.

## Vormgeving aangepast?
Draai `python3 tools/prerender.py` (met `python3 -m http.server 8765` in deze map),
zodat de vooraf ingevulde homepage in index.html weer klopt.
