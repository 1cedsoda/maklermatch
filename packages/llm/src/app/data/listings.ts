export interface Listing {
	id: string;
	title: string;
	price: string;
	location: string;
	rawText: string;
}

export const TEST_LISTINGS: Listing[] = [
	{
		id: "efh-muenchen-pasing",
		title: "Charmantes Einfamilienhaus mit Wintergarten",
		price: "850.000€ VB",
		location: "München-Pasing",
		rawText: `Charmantes Einfamilienhaus mit Wintergarten und großem Garten

12345 Bayern – München-Pasing

Preis: 850.000€ VB

Wohnfläche: 180m²
Grundstück: 620m²
Zimmer: 6
Baujahr: 1985

Gepflegtes Einfamilienhaus in ruhiger Seitenstraße von München-Pasing. 2019 umfassend saniert: neue Fenster, neue Heizung (Wärmepumpe), Fußbodenheizung im gesamten EG.

Der Wintergarten mit Kaminofen ist das Herzstück des Hauses — perfekt für gemütliche Abende. Große Einbauküche, zwei Bäder (eins davon mit Regendusche).

Sonniger Südwest-Garten mit altem Obstbaumbestand. Doppelgarage und Carport. Ruhige Lage, trotzdem S-Bahn Pasing in 8 Min zu Fuß.

Wir verkaufen privat, da wir beruflich nach Hamburg ziehen. Besichtigung ab sofort möglich.`,
	},
	{
		id: "mfh-freiburg-mehrgenerationen",
		title: "10-Zimmer Mehrgenerationenhaus - 2x DHH - großer Garten",
		price: "2.780.000 € VB",
		location: "Freiburg im Breisgau",
		rawText: `10-Zimmer Mehrgenerationenhaus - 2x DHH - großer Garten

2.780.000 € VB
79111 Baden-Württemberg - Freiburg im Breisgau
06.02.2026

Wohnfläche: 230 m²
Zimmer: 10
Schlafzimmer: 8
Badezimmer: 2
Grundstücksfläche: 1.140 m²
Etagen: 2
Provision: Keine zusätzliche Käuferprovision

Ausstattung: Möbliert/Teilmöbliert, Balkon, Terrasse, Einbauküche, Badewanne, Gäste-WC, Keller, Dachboden, Garage/Stellplatz, Garten/-mitnutzung

Das Gebäude liegt in begehrter Randlage von Freiburg St. Georgen und besteht aus 2 Doppelhaushälften. Mit insgesamt ca. 230 qm Wohnfläche und einem großen Garten bietet es viel Platz für die große Familie oder zwei Familien.

Die Grundstücksgröße beträgt 1140 qm und ist relativ eben, auch wenn das Grundstück in leichter Hanglage liegt und damit einen schönen Blick über Teile von Freiburg bietet.

Das Anwesen verfügt über 10 Zimmer, 2 Badezimmer, 2 Küchen und 2 Gäste-WC verteilt auf 2 Geschosse. Durch die Aufstockung des Dachstuhls kann ein drittes Geschoss angebaut werden.

Die Immobilie ist vollunterkellert und bietet 2 Doppelgaragen - genug Platz für Stauraum und Fahrzeuge.

Die beiden DHH haben bisher jeweils eine eigene Wasser- und Energieversorgung. Hierdurch ergeben sich vielfältige Nutzungskonzepte. Als weiterhin voneinander getrennte Einheiten kann das eine Haus selbstgenutzt, das andere z.B. als Ferienhaus vermietet werden.
Verbunden zu einer einzigen Wohneinheit findet auch die Großfamilie viel Platz und Raum zur Entfaltung.

Haus Nr. 1 wurde vor 10 Jahren umfassend saniert. Es wurden hierbei die Fassade gedämmt, 3-fach verglaste Fenster und neue Türen eingebaut.
Haus Nr. 2 verfügt über 2-fach verglaste Fenster und ist teilweise renovierungsbedürftig.

Beide Häuser verfügen jeweils über eine Zentralheizung (Öl).

Die Ortsrandlage an einer sehr ruhigen Sackgasse in Freiburg St. Georgen bietet herrliche Ruhe vom Trubel der Stadt. Dennoch ist man mit dem Fahrrad in nur 10min am Freiburger Hauptbahnhof.

In Laufnähe gibt es mehrere Restaurants, Ärzte, Bäckereien und Cafés.

Am Fuße des Schönbergs gelegen ist es der beste Ausgangspunkt für ausgiebige Wandertouren, zum Biken oder Spaziergänge durch die Weinberge.

Für eine Besichtigung ist es erforderlich, dass Sie uns vorab eine Finanzierungsbestätigung Ihrer Bank oder einen entsprechenden Kapitalnachweis vorlegen.

Anfragen von Maklern zwecks Vermittlung sind unerwünscht und werden nicht berücksichtigt.

Privater Nutzer, aktiv seit 05.08.2025`,
	},
	{
		id: "dg-maisonette-freiburg-wiehre",
		title: "Sehr charmante DG-Maisonette-Wohnung in Freiburg Wiehre",
		price: "540.000 € VB",
		location: "Freiburg im Breisgau",
		rawText: `Sehr charmante DG-Maisonette-Wohnung in Freiburg Wiehre

540.000 € VB
79111 Baden-Württemberg - Freiburg im Breisgau
01.02.2026

Wohnfläche: 80,05 m²
Zimmer: 3
Schlafzimmer: 1
Badezimmer: 2
Verfügbar ab: Februar 2026
Haustyp: Mehrfamilienhaus
Etagen: 10
Baujahr: 1900
Provision: Mit Provision
Online-Besichtigung: Nicht möglich

Ausstattung: Terrasse, Einbauküche, Badewanne, Keller, Garage/Stellplatz

Sehr schöne 3 Zi-Maisonette-Whg., zu verkaufen aus Altersgründen. In eine Top Lage in der Wiehre, sehr zentral sowohl was die Verbindungen betrifft aber auch einkaufen, Schulen, Kitas usw. Der ZO ist ca. nur 5-10 Minuten Fußweg entfernt. Auch sind viele Cafes, Restaurants, Bäckereien sehr nah, also alles was das Herz begehrt.

Privater Nutzer, aktiv seit 17.02.2017`,
	},
	{
		id: "mfh-freiburg-werkstatt",
		title: "Mehrfamilienhaus mit Werkstatt mitten in Freiburg",
		price: "660.000 € VB",
		location: "Freiburg im Breisgau",
		rawText: `Mehrfamilienhaus mit Werkstatt mitten in Freiburg

660.000 € VB (vorher 730.000 €)
79110 Baden-Württemberg - Freiburg im Breisgau
22.09.2025

Wohnfläche: 225 m²
Zimmer: 9,5
Grundstücksfläche: 500 m²
Etagen: 3
Baujahr: 1966
Provision: Keine zusätzliche Käuferprovision

Ausstattung: Keller, Garage/Stellplatz, Aktuell vermietet

Gut vermietetes Mehrfamilienhaus mit Werkstatt/Halle zentral gelegen und vielseitig nutzbar in Freiburg mit 4 Wohnungen und einer Werkhalle/Büro zu verkaufen. Telefonisch Beratung direkt vom Verkäufer unter 0160-97336970.

Das Haus ist ideal für Kapitalanleger und auf vielfältige Art nutzbar.
Im Haus befinden sich 4 Wohnungen.
Im UG eine 1,5 Zimmer-Wohnung und im Erd- und Obergeschoss befinden sich baugleich jeweils 2 gut geschnittene 3-Zimmer-Wohnungen mit Balkon.
Im Dachgeschoss befindet sich eine 2-Zimmer-Wohnung mit Zugang zum Speicher.
Das Haus ist unterkellert. Hier befinden sich mehrere Kellerräume sowie eine weitere 1,5 Zimmer-Wohnung.
Das Wohnhaus hat eine Wohnfläche von insgesamt ca. 225 m2 und die Werkstatt verfügt über ca. 200 m2.
Das gesamte Haus inkl. Werkstatt ist seit 01.03.2019 an einen zuverlässigen Mieter vermietet. Die Gesamt-Jahres-Kaltmiete beträgt derzeit 48.000,00 EUR.
Der Erbbauzins beträgt 10.170,00 EUR. Lukrative Anlage - trotz Erbbaupacht. Bei Fragen zur Erbaupacht können wir sie gerne beraten.
Der Mieter trägt alle Nebenkosten außer dem Erbbauzins.

Das Haus befindet sich in der Nähe Mooswald mit sehr guter fußläufiger Verkehrsanbindung an Bus und S-Bahn sowie Einkaufsmöglichkeiten. Die Naherholungsgebiete Seepark und Westbad sind ebenfalls gut zu erreichen sowie zahlreiche Restaurants.

BITTE KEINE MAKLERANFRAGEN!

Privater Nutzer, aktiv seit 11.02.2023`,
	},
];
