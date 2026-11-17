# Toen we daar zo zaten: nieuwe site

Statische site + één Netlify Function voor betalen via Mollie.

## Live zetten
1. Maak een Mollie-account (mollie.com) en rond de verificatie af.
2. In Netlify: nieuwe site, sleep deze map erin (of koppel via GitHub).
   Let op: drag-and-drop draait geen functions. Gebruik GitHub of `netlify deploy`.
3. Site settings > Environment variables: MOLLIE_API_KEY = je test_-sleutel. Eerst testen, dan live_-sleutel.
4. Domein: toenwedaarzozaten.staaf.nl (CNAME in de DNS van staaf.nl naar de Netlify-site).

## Aanpassen
Alles staat in data.json: prijzen in centen, voorraad per uitvoering (stock), verzendkosten.
Na een verkoop: verlaag stock bij de juiste print. 0 = uitverkocht.

## Bestellingen
Staan in het Mollie-dashboard, met naam, adres en de bestelde prints bij elke betaling.
