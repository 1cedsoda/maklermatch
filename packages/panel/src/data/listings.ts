export interface Listing {
	id: string;
	title: string;
	price: string;
	location: string;
	sellerName: string;
	rawText: string;
}

export const TEST_LISTINGS: Listing[] = [
	{
		id: "efh-muenchen-pasing",
		title: "Charmantes Einfamilienhaus mit Wintergarten",
		price: "850.000\u20ac VB",
		location: "M\u00fcnchen-Pasing",
		sellerName: "Stefan K.",
		rawText: `Charmantes Einfamilienhaus mit Wintergarten und gro\u00dfem Garten

12345 Bayern \u2013 M\u00fcnchen-Pasing

Preis: 850.000\u20ac VB

Wohnfl\u00e4che: 180m\u00b2
Grundst\u00fcck: 620m\u00b2
Zimmer: 6
Baujahr: 1985

Gepflegtes Einfamilienhaus in ruhiger Seitenstra\u00dfe von M\u00fcnchen-Pasing. 2019 umfassend saniert: neue Fenster, neue Heizung (W\u00e4rmepumpe), Fu\u00dfbodenheizung im gesamten EG.

Der Wintergarten mit Kaminofen ist das Herzst\u00fcck des Hauses \u2014 perfekt f\u00fcr gem\u00fctliche Abende. Gro\u00dfe Einbauk\u00fcche, zwei B\u00e4der (eins davon mit Regendusche).

Sonniger S\u00fcdwest-Garten mit altem Obstbaumbestand. Doppelgarage und Carport. Ruhige Lage, trotzdem S-Bahn Pasing in 8 Min zu Fu\u00df.

Wir verkaufen privat, da wir beruflich nach Hamburg ziehen. Besichtigung ab sofort m\u00f6glich.`,
	},
	{
		id: "mfh-freiburg-mehrgenerationen",
		title: "10-Zimmer Mehrgenerationenhaus - 2x DHH - gro\u00dfer Garten",
		price: "2.780.000 \u20ac VB",
		location: "Freiburg im Breisgau",
		sellerName: "Familie Weber",
		rawText: `10-Zimmer Mehrgenerationenhaus - 2x DHH - gro\u00dfer Garten

2.780.000 \u20ac VB
79111 Baden-W\u00fcrttemberg - Freiburg im Breisgau
06.02.2026

Wohnfl\u00e4che: 230 m\u00b2
Zimmer: 10
Schlafzimmer: 8
Badezimmer: 2
Grundst\u00fccksfl\u00e4che: 1.140 m\u00b2
Etagen: 2
Provision: Keine zus\u00e4tzliche K\u00e4uferprovision

Ausstattung: M\u00f6bliert/Teilm\u00f6bliert, Balkon, Terrasse, Einbauk\u00fcche, Badewanne, G\u00e4ste-WC, Keller, Dachboden, Garage/Stellplatz, Garten/-mitnutzung

Das Geb\u00e4ude liegt in begehrter Randlage von Freiburg St. Georgen und besteht aus 2 Doppelhaush\u00e4lften. Mit insgesamt ca. 230 qm Wohnfl\u00e4che und einem gro\u00dfen Garten bietet es viel Platz f\u00fcr die gro\u00dfe Familie oder zwei Familien.

Die Grundst\u00fccksgrö\u00dfe betr\u00e4gt 1140 qm und ist relativ eben, auch wenn das Grundst\u00fcck in leichter Hanglage liegt und damit einen sch\u00f6nen Blick \u00fcber Teile von Freiburg bietet.

Das Anwesen verf\u00fcgt \u00fcber 10 Zimmer, 2 Badezimmer, 2 K\u00fcchen und 2 G\u00e4ste-WC verteilt auf 2 Geschosse. Durch die Aufstockung des Dachstuhls kann ein drittes Geschoss angebaut werden.

Die Immobilie ist vollunterkellert und bietet 2 Doppelgaragen - genug Platz f\u00fcr Stauraum und Fahrzeuge.

Die beiden DHH haben bisher jeweils eine eigene Wasser- und Energieversorgung. Hierdurch ergeben sich vielf\u00e4ltige Nutzungskonzepte. Als weiterhin voneinander getrennte Einheiten kann das eine Haus selbstgenutzt, das andere z.B. als Ferienhaus vermietet werden.
Verbunden zu einer einzigen Wohneinheit findet auch die Gro\u00dffamilie viel Platz und Raum zur Entfaltung.

Haus Nr. 1 wurde vor 10 Jahren umfassend saniert. Es wurden hierbei die Fassade ged\u00e4mmt, 3-fach verglaste Fenster und neue T\u00fcren eingebaut.
Haus Nr. 2 verf\u00fcgt \u00fcber 2-fach verglaste Fenster und ist teilweise renovierungsbed\u00fcrftig.

Beide H\u00e4user verf\u00fcgen jeweils \u00fcber eine Zentralheizung (\u00d6l).

Die Ortsrandlage an einer sehr ruhigen Sackgasse in Freiburg St. Georgen bietet herrliche Ruhe vom Trubel der Stadt. Dennoch ist man mit dem Fahrrad in nur 10min am Freiburger Hauptbahnhof.

In Laufn\u00e4he gibt es mehrere Restaurants, \u00c4rzte, B\u00e4ckereien und Caf\u00e9s.

Am Fu\u00dfe des Sch\u00f6nbergs gelegen ist es der beste Ausgangspunkt f\u00fcr ausgiebige Wandertouren, zum Biken oder Spazierg\u00e4nge durch die Weinberge.

F\u00fcr eine Besichtigung ist es erforderlich, dass Sie uns vorab eine Finanzierungsbest\u00e4tigung Ihrer Bank oder einen entsprechenden Kapitalnachweis vorlegen.

Anfragen von Maklern zwecks Vermittlung sind unerw\u00fcnscht und werden nicht ber\u00fccksichtigt.

Privater Nutzer, aktiv seit 05.08.2025`,
	},
	{
		id: "dg-maisonette-freiburg-wiehre",
		title: "Sehr charmante DG-Maisonette-Wohnung in Freiburg Wiehre",
		price: "540.000 \u20ac VB",
		location: "Freiburg im Breisgau",
		sellerName: "Ingrid M.",
		rawText: `Sehr charmante DG-Maisonette-Wohnung in Freiburg Wiehre

540.000 \u20ac VB
79111 Baden-W\u00fcrttemberg - Freiburg im Breisgau
01.02.2026

Wohnfl\u00e4che: 80,05 m\u00b2
Zimmer: 3
Schlafzimmer: 1
Badezimmer: 2
Verf\u00fcgbar ab: Februar 2026
Haustyp: Mehrfamilienhaus
Etagen: 10
Baujahr: 1900
Provision: Mit Provision
Online-Besichtigung: Nicht m\u00f6glich

Ausstattung: Terrasse, Einbauk\u00fcche, Badewanne, Keller, Garage/Stellplatz

Sehr sch\u00f6ne 3 Zi-Maisonette-Whg., zu verkaufen aus Altersgr\u00fcnden. In eine Top Lage in der Wiehre, sehr zentral sowohl was die Verbindungen betrifft aber auch einkaufen, Schulen, Kitas usw. Der ZO ist ca. nur 5-10 Minuten Fu\u00dfweg entfernt. Auch sind viele Cafes, Restaurants, B\u00e4ckereien sehr nah, also alles was das Herz begehrt.

Privater Nutzer, aktiv seit 17.02.2017`,
	},
	{
		id: "mfh-freiburg-werkstatt",
		title: "Mehrfamilienhaus mit Werkstatt mitten in Freiburg",
		price: "660.000 \u20ac VB",
		location: "Freiburg im Breisgau",
		sellerName: "J\u00fcrgen Hartmann",
		rawText: `Mehrfamilienhaus mit Werkstatt mitten in Freiburg

660.000 \u20ac VB (vorher 730.000 \u20ac)
79110 Baden-W\u00fcrttemberg - Freiburg im Breisgau
22.09.2025

Wohnfl\u00e4che: 225 m\u00b2
Zimmer: 9,5
Grundst\u00fccksfl\u00e4che: 500 m\u00b2
Etagen: 3
Baujahr: 1966
Provision: Keine zus\u00e4tzliche K\u00e4uferprovision

Ausstattung: Keller, Garage/Stellplatz, Aktuell vermietet

Gut vermietetes Mehrfamilienhaus mit Werkstatt/Halle zentral gelegen und vielseitig nutzbar in Freiburg mit 4 Wohnungen und einer Werkhalle/B\u00fcro zu verkaufen. Telefonisch Beratung direkt vom Verk\u00e4ufer unter 0160-97336970.

Das Haus ist ideal f\u00fcr Kapitalanleger und auf vielf\u00e4ltige Art nutzbar.
Im Haus befinden sich 4 Wohnungen.
Im UG eine 1,5 Zimmer-Wohnung und im Erd- und Obergeschoss befinden sich baugleich jeweils 2 gut geschnittene 3-Zimmer-Wohnungen mit Balkon.
Im Dachgeschoss befindet sich eine 2-Zimmer-Wohnung mit Zugang zum Speicher.
Das Haus ist unterkellert. Hier befinden sich mehrere Kellerr\u00e4ume sowie eine weitere 1,5 Zimmer-Wohnung.
Das Wohnhaus hat eine Wohnfl\u00e4che von insgesamt ca. 225 m2 und die Werkstatt verf\u00fcgt \u00fcber ca. 200 m2.
Das gesamte Haus inkl. Werkstatt ist seit 01.03.2019 an einen zuverl\u00e4ssigen Mieter vermietet. Die Gesamt-Jahres-Kaltmiete betr\u00e4gt derzeit 48.000,00 EUR.
Der Erbbauzins betr\u00e4gt 10.170,00 EUR. Lukrative Anlage - trotz Erbbaupacht. Bei Fragen zur Erbaupacht k\u00f6nnen wir sie gerne beraten.
Der Mieter tr\u00e4gt alle Nebenkosten au\u00dfer dem Erbbauzins.

Das Haus befindet sich in der N\u00e4he Mooswald mit sehr guter fu\u00dfl\u00e4ufiger Verkehrsanbindung an Bus und S-Bahn sowie Einkaufsm\u00f6glichkeiten. Die Naherholungsgebiete Seepark und Westbad sind ebenfalls gut zu erreichen sowie zahlreiche Restaurants.

BITTE KEINE MAKLERANFRAGEN!

Privater Nutzer, aktiv seit 11.02.2023`,
	},
];
