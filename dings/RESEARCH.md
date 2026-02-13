# Maklerleads — Research Findings

## Goal

Build a tool that scrapes Kleinanzeigen.de for private property sellers ("Immobilien zu verkaufen" by Privatanbieter) and automatically messages them on behalf of a Makler (real estate agent).

---

## 1. Kleinanzeigen's Anti-Bot Protection

**Akamai Bot Manager** — confirmed via [Akamai's own case study](https://www.akamai.com/resources/customer-story/kleinanzeigen).

What it does:
- **TLS fingerprinting** (JA3/JA4) — identifies Python HTTP clients at the TLS handshake level, before any HTTP headers
- **JavaScript challenge** — injects obfuscated JS that collects 100+ browser/device signals, generates sensor data, POSTs to `/_sec/cp_challenge/verify`, and produces an `_abck` cookie
- **HTTP 418 "You look like a robot"** — the block response. Triggered by datacenter IPs, VPNs, missing/invalid `_abck` cookie
- **Behavioral analysis** — request timing, mouse movements, patterns
- **reCAPTCHA** — deployed on messaging and account actions

**Critical finding:** The `_abck` cookie requires real JavaScript execution in a real browser. No HTTP library (curl_cffi, tls_client, hrequests) can generate it. Pure HTTP scraping will NOT work against Akamai.

---

## 2. What Works and What Doesn't

| Approach | Works? | Evidence |
|----------|--------|----------|
| Plain HTTP (requests/httpx) | NO | Blocked by TLS fingerprinting + missing _abck cookie |
| curl_cffi (Chrome TLS impersonation) | NO alone | Bypasses TLS check but can't generate _abck cookie |
| Official API (partner account) | NO | Locked down, docs removed, accounts get locked (tejado/ebk-client Issue #22) |
| Mobile API reverse engineering | NO | "DO NOT USE — you will get blocked" (exislow/kleinanzeigen-magic) |
| Browser automation (Playwright/Patchright) | YES | All active projects use this. kleinanzeigen-bot has 1k+ stars |
| Cookie bootstrap (browser once → HTTP bulk) | LIKELY YES | Proven pattern against Akamai on other sites. Browser generates _abck, curl_cffi uses it for fast requests |

---

## 3. Existing Projects

**Most relevant:**
- [Second-Hand-Friends/kleinanzeigen-bot](https://github.com/Second-Hand-Friends/kleinanzeigen-bot) — 1k+ stars, actively maintained, Chromium-based. Publishes, updates, deletes, republishes listings. Users report 30-50% failure rates on publishing, reCAPTCHA issues, DOM errors.
- [kleinanzeigen-scraper-python-playwright-2024](https://github.com/infynnity/kleinanzeigen-scraper-python-playwright-2024) — Playwright-based scraper
- [DanielWTE/ebay-kleinanzeigen-api](https://github.com/DanielWTE/ebay-kleinanzeigen-api) — Playwright wrapper exposing REST endpoints for search/detail

**Dead/dangerous:**
- [tejado/ebk-client](https://github.com/tejado/ebk-client) — Official API client, requires unavailable partner account, causes account lockouts
- [exislow/kleinanzeigen-magic](https://github.com/exislow/kleinanzeigen-magic) — Mobile API reverse engineering, author warns against using it

**Monitoring bots:**
- [KleinanzeigenTelegramBot](https://github.com/JoeKL/KleinanzeigenTelegramBot) — Monitors + Telegram notifications
- [Superschnizel/Kleinanzeigen-Telegram-Bot](https://github.com/Superschnizel/Kleinanzeigen-Telegram-Bot)

**API documentation:**
- [BastelPichi's Gist](https://gist.github.com/BastelPichi/43e441f166fcd6a4c76f875dcbb91d5c) — Reverse-engineered endpoints: `api.ebay-kleinanzeigen.de/api/ads.json` etc. Requires special headers (`X-EBAYK-APP`, `X-ECG-USER-AGENT`) and base64 auth token.

---

## 4. Messaging

**No API exists for sending messages.** Every project that sends messages uses browser automation. The flow is:
1. Login with account (email + password)
2. Navigate to listing page
3. Click "Nachricht schreiben"
4. Type message in textarea
5. Click send

Patchright (patched Playwright) is required for this. Rate limits should be ultra-conservative: max 20 messages/day/account, 3-10 min between messages.

---

## 5. Scraping — Data Location

Listing data is embedded in the raw HTML as JSON inside `<script>` tags (Kleinanzeigen's React app hydration data). This means we don't need to parse DOM elements — we extract structured JSON directly.

---

## 6. URL Structure

```
# Base patterns
/s-immobilien/anbieter:privat/c195                    # All Immobilien, private sellers
/s-wohnung-kaufen/anbieter:privat/c196                # Eigentumswohnungen
/s-haus-kaufen/anbieter:privat/c208                   # Häuser zum Kauf

# Filters (embedded in URL path, not query params)
/s-immobilien/berlin/anbieter:privat/c195              # City filter
/s-immobilien/anbieter:privat/preis:100000:500000/c195 # Price range
/s-immobilien/anbieter:privat/seite:2/c195             # Page 2
```

25 listings per page. Pagination via `seite:{N}` inserted before `/c{NNN}`.

---

## 7. Anti-Detection Libraries (Python, 2025/2026)

| Library | Type | What it does | Akamai bypass? |
|---------|------|-------------|----------------|
| **Patchright** | Patched Playwright | Patches CDP detection, passes Cloudflare/Akamai/DataDome | YES — real browser |
| **curl_cffi** | HTTP client | Impersonates Chrome TLS (JA3/JA4 + HTTP/2 fingerprint) | Partial — needs _abck cookie from browser |
| **hrequests** | HTTP + optional browser | TLS spoofing via tls-client, optional Firefox headless | YES in browser mode |
| **Camoufox** | Patched Firefox | C++ level patches, Playwright compatible | YES but unmaintained (author hospitalized) |
| **rebrowser** | Patched Playwright | Patches automation detection | YES |
| **Nodriver** | Undetected Chrome | Successor to undetected-chromedriver | YES |

**Best combo for our use case:** Patchright (browser, cookie generation, messaging) + curl_cffi (fast HTTP with stolen cookies for bulk scraping)

---

## 8. Real User Pain Points (from GitHub Issues)

- **reCAPTCHA in Docker** — headless browser + Docker = more CAPTCHA triggers
- **30-50% failure rates** on kleinanzeigen-bot publishing operations
- **"DOM agent hasn't been enabled"** errors
- **Frame detachment** errors during ad processing
- **Account softlocks** — new accounts locked within 2-3 days
- **IP blocks** lasting 24-48 hours
- **CSS selector breakage** when Kleinanzeigen updates frontend

---

## 9. Legal Considerations (Germany) — DETAILED RESEARCH

> **ACHTUNG: Die rechtliche Lage ist deutlich kritischer als urspruenglich angenommen. Dieses Kapitel wurde am 13.02.2026 umfassend erweitert.**

### 9.1 Zusammenfassung: Unternehmen die automatisiert Privatinserenten anschreiben

Es gibt in Deutschland mehrere Unternehmen, die Maklern beim Auffinden und Kontaktieren von Privatinserenten helfen. Diese lassen sich in drei Kategorien einteilen:

#### Kategorie A: Inserate finden (NICHT automatisch anschreiben)

| Anbieter | Was es tut | Status |
|----------|-----------|--------|
| **PropHunter** (prophunter.de) | Scannt Portale (ImmoScout24, Kleinanzeigen, regionale Portale) nach neuen Privatinseraten. Zeigt sie uebersichtlich an. Team-Funktionen zur Zuweisung. Kein automatisches Anschreiben. | Aktiv |
| **ImmoScout24 Akquise Edition** | Offizielles ImmoScout24-Produkt. Zeigt privat inserierte Objekte, bietet "Maklervergleich" (Eigentuemerleads) und "Eigentuemercheckbox" (26% der Suchenden besitzen Immobilien). | Aktiv, offizielles Produkt |
| **Kleinanzeigen Objektakquise-Paket** | Offizielles Kleinanzeigen-Produkt (99 EUR/Monat). Privatpersonen die Hilfe wuenschen werden an max. 3 Makler vermittelt. Nur wenn Inserent aktiv zustimmt. | Aktiv, offizielles Produkt |
| **onpreo** (onpreo.com) | Aggregiert Leads von ImmoScout24, Immowelt, Aroundhome, WattFox, IMV. Fokus auf Lead-Management. | Aktiv |
| **MaklerWerft** (maklerwerft.de) | Lead-Generator fuer Makler-Webseiten. KI-Immobiliensuche. | Aktiv |

#### Kategorie B: Automatische Kontaktaufnahme (rechtlich HOCHRISKANT)

| Anbieter | Was es tut | Status |
|----------|-----------|--------|
| **kyl.immo ("Kyle")** | KI-"Akquise-Mitarbeiter" als onOffice-Plugin. Behauptet, automatisiert Eigentuemer aus dem eigenen Datenbestand zu kontaktieren und Pipeline zu fuellen. | Aktiv, aber rechtlich fragwuerdig |
| **Voll GmbH** (voll-gmbh.de) | Beschreibt KI-Loesung mit Make.com + OpenAI: eBay Kleinanzeigen scannen, filtern, personalisierte Nachrichten ERSTELLEN (nicht automatisch senden). Betont ausdruecklich, dass automatischer Versand auf vielen Plattformen verboten ist. | Aktiv als Beratung |
| **Namenloser Anbieter (LG Augsburg Fall)** | KI-System das automatisch Kontaktdaten von Privatinserenten sammelte und an Makler weitergab. | **VERBOTEN durch Urteil (Jan 2026)** |

#### Kategorie C: Lead-Vermittler (Eigentümer kommen zum Makler)

| Anbieter | Was es tut | Status |
|----------|-----------|--------|
| **WattFox** (wattfox.de) | Endkunden stellen Anfragen fuer Immobilienbewertung. WattFox vermittelt an Partner-Makler. Keine Kaltakquise. | Aktiv, 250+ MA |
| **Homeday** (homeday.de) | Hybrider Makler, seit 2015. Eigentümer kommen ueber Bewertungstools. | Aktiv |
| **Maklaro** (maklaro.de) | Teil von Hypoport SE. Digitale Services fuer Makler. | Aktiv |
| **PropValue** (propvalue.de) | Lead-Generator-Formular fuer Makler-Webseiten (Wertermittlung). | Aktiv |
| **IWA Lead** | Besucher geben Immobiliendaten ein, werden als Leads an Makler weitergeleitet. | Aktiv |
| **Lot Internet GmbH** (lot-internet.de) | B2B Web-Crawling und Analyse fuer Immobilienportale. Marktdaten, Wettbewerbsbeobachtung. KEINE Kontaktaufnahme. | Aktiv, gegr. 2011, Potsdam |

**Kernfinding:** Kein serioeses deutsches Unternehmen bietet aktuell einen Dienst an, der vollautomatisch im Auftrag von Maklern Privatinserenten auf Plattformen ANSCHREIBT. Die meisten beschraenken sich auf das Finden/Anzeigen von Inseraten oder das Erstellen von Nachrichtenvorlagen. Der einzige bekannte Anbieter, der automatisierte Kontaktdaten-Weiterleitung bewarb, wurde vom LG Augsburg verboten.

---

### 9.2 Gerichtsentscheidungen und Urteile

#### URTEIL 1: LG Augsburg — KI-Akquisesystem verboten (8. Januar 2026)
- **Gericht:** Landgericht Augsburg
- **Az.:** 2 HK O 4274/25
- **Datum:** 08.01.2026
- **Art:** Versaeumnisurteil
- **Klaeger:** Wettbewerbszentrale
- **Beklagter:** Anbieter eines KI-Akquisesystems (Name nicht oeffentlich)
- **Sachverhalt:** Das System durchsuchte automatisch mehrere Online-Immobilienportale nach Privatinseraten und leitete Kontaktdaten privater Inserenten direkt in die Software von Maklerbüros weiter. Der Anbieter warb damit, dass die KI Inserate mit dem Vermerk "keine Makleranfragen" aussortiere, um "unnoetige Kontakte und Rechtsrisiken" zu vermeiden.
- **Entscheidung:** Das Gericht verbot die **Werbung** fuer das System. Begruendung:
  - Ohne Einwilligung stellt **jede** Kontaktaufnahme mittels der von der KI erhobenen Daten eine **unzumutbare Belaestigung** dar (§ 7 UWG)
  - Jedes Immobilienunternehmen, das das System zur Kontaktaufnahme nutzt, verhaelt sich **wettbewerbswidrig**
  - Das Aussortieren ablehnender Inserate ersetzt **keine** Einwilligung der verbleibenden Inserenten
  - Die Behauptung, das System vermeide "Rechtsrisiken", ist **irrefuehrend**
  - Das Tool ist darauf ausgelegt, Personen mit **belaestigender Werbung zu konfrontieren**
- **Quelle:** [Wettbewerbszentrale](https://www.wettbewerbszentrale.de/wettbewerbszentrale-beanstandet-ki-akquise-system/), [ad-hoc-news.de](https://www.ad-hoc-news.de/boerse/news/ueberblick/ki-akquisesystem-fuer-makler-ist-wettbewerbswidrig/68548003), [procontra](https://www.procontra-online.de/immobilien/artikel/immobilienmakler-vorsicht-bei-ki-tools-zur-kundenakquise)

#### URTEIL 2: LG Stuttgart — Makler-Nachrichten auf Kleinanzeigen.de sind Spam (5. Juni 2025)
- **Gericht:** Landgericht Stuttgart
- **Az.:** 33 O 10/25 KfH
- **Datum:** 05.06.2025
- **Sachverhalt:** Eigentuemer inserierte Wohnung auf kleinanzeigen.de mit Hinweis "Keine Makleranfragen". Zwei Tage spaeter erhielt er ueber das Portal-Postfach eine Nachricht eines Maklerbueros mit Verweis auf einen angeblichen Interessenten und Provisionsangaben (3,57% bzw. 3%).
- **Entscheidung:**
  - Persoenliche Nachrichten ueber das interne Postfach von Kleinanzeigen.de = **unerlaubte Werbung (Spam)**
  - Der Begriff "elektronische Post" (§ 7 Abs. 2 Nr. 2 UWG) ist **technikoffen** — umfasst nicht nur E-Mails, sondern auch Portal-Nachrichten
  - Dass ein freier Mitarbeiter die Nachricht verschickte, aendert nichts — das **Maklerbuero haftet**
  - Bereits **ein einziger Verstoss** begruendet Unterlassungsanspruch
  - Maklerbueros muessen **Organisationspflichten** erfuellen (Richtlinien, Schulungen, Kontrollen)
- **Quelle:** [ratgeberrecht.eu](https://www.ratgeberrecht.eu/aktuell/persoenliche-makler-nachrichten-auf-kleinanzeigen-de-sind-spam/), [ohne-makler.net](https://www.ohne-makler.net/magazin/urteil-maklerspam/), [absolit.de](https://www.absolit.de/rechtslage/gericht-auch-nachrichten-ueber-portale-koennen-spam-sein)

#### URTEIL 3: LG Tuebingen — E-Mail trotz "KEINE MAKLERANFRAGEN" (9. Mai 2022)
- **Gericht:** Landgericht Tuebingen
- **Az.:** 20 O 74/21
- **Datum:** 09.05.2022
- **Sachverhalt:** Makler schrieb per E-Mail Privatverkaeufer an, dessen Inserat deutlich sichtbar "KEINE MAKLERANFRAGEN!!! Verkauf von privat, keine Maklerprovision!" enthielt. Der Makler entschuldigte sich, versuchte aber dennoch, das Objekt fuer seine Kunden zu besichtigen.
- **Entscheidung:** Verstoss gegen § 7 Abs. 2 Nr. 3 UWG. Auch Nachfragehandlungen fallen unter den Werbungsbegriff des UWG.
- **Quelle:** [Breiholdt Voscherau Rechtsanwaelte](https://breiholdt-voscherau.de/newsletter/wettbewerbsrecht/kontaktaufnahme-durch-makler-trotz-hinweis-keine-makleranfragen/)

#### URTEIL 4: OLG Karlsruhe — Makler-Anruf bei Privatinserat erlaubt UNTER BESTIMMTEN BEDINGUNGEN (12. Juni 2018)
- **Gericht:** OLG Karlsruhe
- **Az.:** 8 U 153/17
- **Datum:** 12.06.2018
- **Sachverhalt:** Verkaeufer stellte Wohnung "von privat" mit Telefonnummer auf Immobilienplattform ein. Makler rief an.
- **Entscheidung:**
  - Telefonanruf = Telefonwerbung i.S.d. UWG, ABER: Wer seine Telefonnummer in einem Inserat angibt, stimmt der Kontaktaufnahme per Telefon zu
  - **WICHTIGE EINSCHRAENKUNG:** Die Einwilligung gilt nur fuer Makler, die **Suchkunden fuer das Objekt** haben — NICHT fuer Makler, die **ihre Maklerdienstleistungen anbieten** wollen!
  - Wer nur anruft, um das Objekt "pauschal ins Angebot aufzunehmen", handelt **wettbewerbswidrig**
- **Quelle:** [dejure.org](https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=OLG+Karlsruhe&Datum=12.06.2018&Aktenzeichen=8+U+153/17), [exali.de](https://www.exali.de/Info-Base/kundenwerbung-immobilienmakler), [kanzlei.biz](https://www.kanzlei.biz/wohnungsinserat-stellt-einwilligung-in-kontaktaufnahme-dar-olg-karlsruhe-12-06-2018-8-u-153-17/)

#### URTEIL 5: OLG Hamm — Kaltakquise ueber Social Media / Portale ist Spam (2023)
- **Gericht:** OLG Hamm
- **Sachverhalt:** Versand von Werbenachrichten ueber LinkedIn, Instagram, Xing, Facebook an potenzielle Kunden
- **Entscheidung:**
  - Direktnachrichten ueber Social-Media-Dienste = **elektronische Post** i.S.d. § 7 UWG
  - Entscheidend: Nachrichten werden in einem **privaten Bereich** des Empfaengers gespeichert, der nur mit Zugangsdaten erreichbar ist
  - Kein Unterschied zwischen E-Mail, SMS, WhatsApp oder Portal-Nachricht
  - Einwilligung muss **ausdruecklich** sein — die blosse Angabe einer Telefonnummer im Inserat reicht NICHT
- **Relevanz fuer Immobilien:** Der Klaeger war ein Dienstleister fuer Immobilienmakler, der Erstkontakte mit Eigentuemern gegen Gebuehr vermittelte
- **Quelle:** [it-recht-kanzlei.de](https://www.it-recht-kanzlei.de/olg-hamm-werbenachrichten-internetportale-social-media-einwilligung-erforderlich.html), [skradde.com](https://www.skradde.com/post/olg-hamm-kaltakquise-uber-linkedin-oder-instagram-zu-werbezwecken-uber-soziale-medien-portale-und-messengerdienste-sind-unzulassig), [dr-bahr.com](https://www.dr-bahr.com/news/werbe-nachrichten-ueber-social-media-dienste-wie-xing-linkedin-oder-x-sind-ebenfalls-unzulaessiger.html)

#### URTEIL 6: BGH — Screen Scraping grundsaetzlich zulaessig (30. April 2014)
- **Gericht:** Bundesgerichtshof
- **Az.:** I ZR 224/12
- **Datum:** 30.04.2014
- **Sachverhalt:** Reiseportal scrapte Flugpreise von Ryanair-Webseite trotz AGB-Verbot
- **Entscheidung:**
  - Screen-Scraping ist **nicht per se wettbewerbswidrig**
  - Verstoss gegen AGB allein begruendet keinen Wettbewerbsverstoss
  - Technische Schutzmassnahmen (wie Akamai) duerfen aber nicht umgangen werden
  - Scraping darf die Webseite nicht merkbar verlangsamen
- **Relevanz:** Das Urteil betrifft das **Auslesen von Daten** — NICHT das automatisierte Versenden von Nachrichten. Fuer den Nachrichtenversand gelten die UWG-Regeln (siehe oben).
- **Quelle:** [ra-plutte.de](https://www.ra-plutte.de/bgh-zum-automatisierten-auslesen-fremder-websites-via-screen-scraping/), [lto.de](https://www.lto.de/recht/hintergruende/h/bgh-urteil-izr22412-screen-scraping-flugdaten-automatisiert-auslesen-ryanair-reiseportal)

---

### 9.3 AGB-Verbote der Portale

#### ImmoScout24 (Nutzungs-AGB, Ziffer 8.2/8.3)
- "Eine **automatisierte Abfrage** durch Skripte, Bots, Crawler o.ae., durch Umgehung der Suchmaske, durch Suchsoftware oder vergleichbare Massnahmen (insbesondere Data Mining, Data Extraction) sind **nicht gestattet**."
- Abgerufene Daten duerfen nicht "zum **Aufbau einer eigenen Datenbank** in jeder medialen Form und/oder fuer eine gewerbliche Datenverwertung oder Auskunftserteilung und/oder fuer eine sonstige gewerbliche Verwertung verwendet" werden.
- "Verlinkung, Integration oder sonstige Verknuepfung der Datenbank oder einzelner Elemente der Datenbank mit anderen Datenbanken oder Meta-Datenbanken ist **unzulaessig**."
- API-Nutzungsbedingungen: Kontaktaufnahme zu Anbietern nur ueber den offiziellen "contact request" API-Webservice erlaubt.
- Sanktionen bei Verstoss: Angebote loeschen, Vertrag fristlos kuendigen, Zugang sofort sperren.
- **Quelle:** [ImmoScout24 Nutzungs-AGB](https://www.immobilienscout24.de/agb/nutzungsagb.html), [ImmoScout24 API Terms](https://api.immobilienscout24.de/terms-of-use/de/)

#### Kleinanzeigen.de
- IP-Sperrung bei "unverhaeltnismaessig vielen Aktionen in kurzer Zeit" — automatische Erkennung, kein menschlicher Eingriff noetig
- Spam-Nachrichten fuehren zur Account-Sperrung
- Akamai Bot Manager als technischer Schutz
- **Quelle:** [Kleinanzeigen IP-Einschraenkungen](https://themen.kleinanzeigen.de/ip-eingeschraenkt/), [Heise: Kontosperre](https://www.heise.de/news/Vorsicht-Kunde-Kontosperre-bei-Kleinanzeigen-10437042.html)

---

### 9.4 DSGVO-Risiken

- **Bussgelder:** Bis zu 20 Mio. EUR oder 4% des weltweiten Jahresumsatzes
- **Persoenliche Haftung:** Geschaeftsfuehrer haftet persoenlich fuer Datenschutzverstoesse
- **Erhebung personenbezogener Daten** (Name, Telefon, E-Mail) von Plattformen ohne Einwilligung = Verstoss gegen Art. 6 DSGVO
- **BGH zum Scraping (2024):** Personen, deren Daten durch Scraping erhoben wurden, koennen unter bestimmten Umstaenden Schadensersatz verlangen — allein der Kontrollverlust ueber eigene Daten kann genuegen
- **Quelle:** [eRecht24](https://www.e-recht24.de/datenschutz/13205-datenschutz-immobilienmakler.html), [noerr.com](https://www.noerr.com/de/insights/bgh-urteil-zum-immateriellen-schadensersatz-der-dsgvo-wegen-scraping)

---

### 9.5 Erlaubte Kontaktwege (ohne vorherige Einwilligung)

| Kanal | Erlaubt? | Bedingung |
|-------|----------|-----------|
| **Briefpost** | JA | Solange kein "keine Werbung"-Aufkleber am Briefkasten |
| **Persoenliches Gespraech** (Tuer-zu-Tuer) | JA | Solange man sich vorstellt und bei Ablehnung geht |
| **Telefonanruf** | NUR WENN Nummer im Inserat + Suchkunde vorhanden | Nicht zum Anbieten eigener Maklerleistungen (OLG Karlsruhe) |
| **E-Mail** | NEIN | Immer Einwilligung noetig (§ 7 Abs. 2 Nr. 3 UWG) |
| **Portal-Nachricht** (Kleinanzeigen, ImmoScout) | NEIN | = elektronische Post, Einwilligung noetig (LG Stuttgart, OLG Hamm) |
| **Social Media DM** (LinkedIn, Instagram, WhatsApp) | NEIN | = elektronische Post (OLG Hamm) |
| **SMS** | NEIN | Einwilligung noetig |

---

### 9.6 Portale gehen aktiv vor

**ImmoScout24:**
- Bietet selbst offizielle Akquise-Produkte an (Akquise Edition, Maklervergleich, Eigentuemercheckbox)
- AGB verbieten ausdruecklich Scraping und automatisierte Abfragen
- API-Nutzung nur mit Genehmigung, Kontaktaufnahme nur ueber offizielle "contact request" Schnittstelle
- Technischer Schutz gegen Bots implementiert
- Sanktionen: Sofortige Account-Sperrung, fristlose Kuendigung

**Kleinanzeigen.de:**
- Akamai Bot Manager schuetzt gegen automatisierte Zugriffe
- Automatische IP-Sperrung bei auffaelligem Verhalten
- Bietet selbst ein Objektakquise-Paket (99 EUR/Monat) als legale Alternative
- Account-Sperrungen bei Spam-Nachrichten

**Immowelt:**
- Anti-Bot-Schutzmassnahmen aktiv
- Phishing-Warnungen fuer Makler (Betrueger nutzen falsche Sperrungsnachrichten)

---

### 9.7 Gescheiterte oder abgemahnte Startups/Tools

| Unternehmen/Tool | Was geschah | Jahr |
|-------------------|-----------|------|
| **KI-Akquisesystem (anonym, LG Augsburg)** | Wettbewerbszentrale klagte erfolgreich. Werbung fuer das System verboten. | 2026 |
| **McMakler** | Massenlayoffs, staatsanwaltliche Ermittlungen wegen Arbeitsrecht. Bewertung stark gesunken. | 2023-2025 |
| **Allmyhomes** | Insolvent trotz ambitionierter Ansaetze. 200 Mitarbeiter arbeitslos. | 2023 |
| **Simplifa** | Insolvenzantrag Jan 2024. Markt falsch eingeschaetzt. F&E eingestellt. | 2024 |

**Branchentrend:** Viele PropTechs die 2019-2021 gegruendet wurden, sind in der Immobilienkrise 2023-2025 gescheitert. Das Geschaeftsmodell "automatisiert Privatinserenten anschreiben" ist aufgrund der Rechtslage besonders riskant.

---

### 9.8 Risikoeinschaetzung fuer unser Vorhaben

**Was wir vorhaben:** Scraping von Kleinanzeigen.de + automatisiertes Anschreiben von Privatinserenten im Auftrag von Maklern.

| Risiko | Schwere | Wahrscheinlichkeit | Begruendung |
|--------|---------|---------------------|-------------|
| **UWG-Abmahnung** (Wettbewerber/Verbaende) | HOCH (50.000 EUR+) | SEHR HOCH | LG Augsburg, LG Stuttgart, OLG Hamm — klare Rechtsprechung gegen automatisiertes Anschreiben |
| **DSGVO-Bussgeld** | SEHR HOCH (bis 20 Mio EUR) | MITTEL | Scraping personenbezogener Daten ohne Rechtsgrundlage |
| **Account-Sperrung** | MITTEL | HOCH | Akamai Bot Manager, automatische Erkennung |
| **Zivilklage von Eigentuemern** | MITTEL | MITTEL | BGH 2024: Kontrollverlust ueber Daten = Schadensersatzanspruch |
| **Unterlassungsklage durch Portal** | HOCH | MITTEL | AGB-Verstoss, potenzielle Schaeden fuer Plattform-Geschaeftsmodell |

**Gesamtrisiko: EXTREM HOCH. Die Rechtslage in Deutschland ist eindeutig: Automatisiertes Anschreiben von Privatinserenten durch Makler ueber elektronische Kanaele ist wettbewerbswidrig und strafbewehrt.**

---

### 9.9 Legale Alternativen

1. **Nur Inserate finden + anzeigen** (wie PropHunter): Rechtlich vertretbar, da nur oeffentlich zugaengliche Daten aggregiert werden
2. **Briefpost-Automatisierung**: Briefe sind der einzige Kanal, der KEINE vorherige Einwilligung erfordert. Man koennte aus gescrapten Inseraten automatisch Briefe generieren (z.B. via lob.com, Postleitzahlverzeichnis, Grundbuch)
3. **Offizielle Portal-Produkte nutzen**: ImmoScout24 Akquise Edition, Kleinanzeigen Objektakquise-Paket
4. **Bewertungs-Leadgenerator**: Wertermittlungstool auf eigener Webseite — Eigentuemer kommen zum Makler (PropValue, IWA Lead, etc.)
5. **Telefonanruf nur mit Suchkunde**: Wenn die Nummer im Inserat steht UND ein konkreter Suchkunde vorliegt (OLG Karlsruhe)

---

## 10. Scaling Considerations

- **Residential proxies needed** — datacenter IPs get blocked immediately
- Budget: ~5-15 EUR/GB for residential proxies (prices dropped 70% in 2 years)
- Providers: Bright Data, Oxylabs, IPRoyal, Evomi
- **Same proxy for browser + HTTP** — Akamai ties _abck cookies to IP
- Account rotation needed for messaging at scale (3-5 accounts = ~100 msgs/day)
- Celery + Redis for distributed task scheduling when scaling beyond single machine

---

## Recommended Architecture

```
Cookie Bootstrap (Patchright):
  Launch browser → visit kleinanzeigen.de → Akamai JS runs → extract _abck cookies

Fast Scraping (curl_cffi + cookies):
  Inject cookies → fetch search pages → extract JSON from <script> tags → store in DB

Messaging (Patchright):
  Login → navigate listing → "Nachricht schreiben" → type → send → wait 3-10 min → next

Critical: same proxy IP for browser cookie generation AND subsequent HTTP requests
```

---

## Sources

- [Akamai Case Study: Kleinanzeigen](https://www.akamai.com/resources/customer-story/kleinanzeigen)
- [Akamai Bot Manager Detection Methods](https://techdocs.akamai.com/cloud-security/docs/detection-methods)
- [Bypass Akamai — ZenRows](https://www.zenrows.com/blog/bypass-akamai)
- [Akamai _abck Cookie Analysis](https://medium.com/@240942649/decoding-akamai-2-0-418e7c7fa0a0)
- [Patchright Python](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright-python)
- [curl_cffi](https://github.com/lexiforest/curl_cffi)
- [kleinanzeigen-bot](https://github.com/Second-Hand-Friends/kleinanzeigen-bot)
- [ebay-kleinanzeigen-api](https://github.com/DanielWTE/ebay-kleinanzeigen-api)
- [BastelPichi API Gist](https://gist.github.com/BastelPichi/43e441f166fcd6a4c76f875dcbb91d5c)
- [hrequests](https://github.com/daijro/hrequests)
- [Kleinanzeigen IP Blocking](https://kleinanzeigen-ratgeber.de/ebay-kleinanzeigen-ip-gesperrt/)
- [Web Scraping Legal Status Germany](https://webscraping.fyi/legal/DE/)
