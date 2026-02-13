import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { extractListings } from "./extract-listings";

function parseHTML(html: string): Document {
	const window = new Window();
	window.document.body.innerHTML = html;
	return window.document as unknown as Document;
}

const FIXTURE = `
<ul id="srchrslt-adtable" class="itemlist ad-list it3">
  <li class="ad-listitem fully-clickable-card badge-topad is-topad">
    <article class="aditem" data-adid="3300238605" data-href="/s-anzeige/berlin-mitte-perfekte-2-ziwo-verkauf-top-lage-sofort-verfuegbar/3300238605-196-3519">
      <div class="aditem-image">
        <a href="/s-anzeige/berlin-mitte-perfekte-2-ziwo-verkauf-top-lage-sofort-verfuegbar/3300238605-196-3519">
          <div class="imagebox srpimagebox">
            <img src="https://img.kleinanzeigen.de/thumb.jpg" srcset="https://img.kleinanzeigen.de/full.jpg" alt="Berlin Mitte">
            <div class="galleryimage--counter">10</div>
            <div class="galleryimage--private">Von Privat</div>
          </div>
        </a>
      </div>
      <div class="aditem-main">
        <div class="aditem-main--top">
          <div class="aditem-main--top--left">10119 Mitte</div>
          <div class="aditem-main--top--right"></div>
        </div>
        <div class="aditem-main--middle">
          <h2 class="text-module-begin">
            <a class="ellipsis" href="/s-anzeige/berlin-mitte-perfekte-2-ziwo-verkauf-top-lage-sofort-verfuegbar/3300238605-196-3519">Berlin Mitte perfekte 2 ZiWo VERKAUF Top Lage - Sofort verfügbar</a>
          </h2>
          <p class="aditem-main--middle--description">Top Lage - Sofort verfügbar Die Wohnung liegt im Herzen von Berlin-Mitte!</p>
          <div class="aditem-main--middle--price-shipping">
            <p class="aditem-main--middle--price-shipping--price">310.000 € VB</p>
          </div>
        </div>
        <div class="aditem-main--bottom">
          <p class="text-module-end">
            <span class="simpletag">39 m²</span>
            <span class="simpletag">2 Zi.</span>
          </p>
        </div>
      </div>
    </article>
  </li>

  <li class="ad-listitem fully-clickable-card">
    <article class="aditem" data-adid="3324922975" data-href="/s-anzeige/ikea-sofa-weiss-mit-dunklen-kissen/3324922975-88-3519">
      <div class="aditem-image">
        <a href="/s-anzeige/ikea-sofa-weiss-mit-dunklen-kissen/3324922975-88-3519">
          <div class="imagebox srpimagebox">
            <img src="https://img.kleinanzeigen.de/sofa-thumb.jpg" srcset="https://img.kleinanzeigen.de/sofa-full.jpg" alt="IKEA Sofa">
            <div class="galleryimage--counter">4</div>
          </div>
        </a>
      </div>
      <div class="aditem-main">
        <div class="aditem-main--top">
          <div class="aditem-main--top--left">10119 Mitte</div>
          <div class="aditem-main--top--right">Heute, 00:04</div>
        </div>
        <div class="aditem-main--middle">
          <h2 class="text-module-begin">
            <a class="ellipsis" href="/s-anzeige/ikea-sofa-weiss-mit-dunklen-kissen/3324922975-88-3519">IKEA Sofa weiß mit dunklen Kissen</a>
          </h2>
          <p class="aditem-main--middle--description">Verkaufe mein IKEA Sofa in hellem Weiß/Creme (ohne Kissen)</p>
          <div class="aditem-main--middle--price-shipping">
            <p class="aditem-main--middle--price-shipping--price">30 €</p>
          </div>
        </div>
        <div class="aditem-main--bottom">
          <p class="text-module-end">
            <span class="simpletag tag-with-icon">Direkt kaufen</span>
          </p>
        </div>
      </div>
    </article>
  </li>

  <li class="ad-listitem fully-clickable-card">
    <article class="aditem" data-adid="3324850037" data-href="/s-anzeige/neewer-5-in-1-light-reflector-60-90cm/3324850037-245-3519">
      <div class="aditem-image">
        <a href="/s-anzeige/neewer-5-in-1-light-reflector-60-90cm/3324850037-245-3519">
          <div class="imagebox srpimagebox">
            <img src="https://img.kleinanzeigen.de/neewer-thumb.jpg" alt="NEEWER Reflector">
          </div>
        </a>
      </div>
      <div class="aditem-main">
        <div class="aditem-main--top">
          <div class="aditem-main--top--left">10119 Mitte</div>
          <div class="aditem-main--top--right">Gestern, 20:59</div>
        </div>
        <div class="aditem-main--middle">
          <h2 class="text-module-begin">
            <span class="ellipsis ref-not-linked" data-url="/s-anzeige/neewer-5-in-1-light-reflector-60-90cm/3324850037-245-3519">NEEWER 5-in-1 Light Reflector 60*90cm</span>
          </h2>
          <p class="aditem-main--middle--description">Nur einmal verwenden.</p>
          <div class="aditem-main--middle--price-shipping">
            <p class="aditem-main--middle--price-shipping--price">25 €</p>
          </div>
        </div>
        <div class="aditem-main--bottom">
          <p class="text-module-end"></p>
        </div>
      </div>
    </article>
  </li>
</ul>
`;

describe("extractListings", () => {
	const doc = parseHTML(FIXTURE);
	const listings = extractListings(doc);

	test("extracts all listings (skips ad slots)", () => {
		expect(listings).toHaveLength(3);
	});

	test("extracts ad ID and URL", () => {
		expect(listings[0].id).toBe("3300238605");
		expect(listings[0].url).toBe(
			"/s-anzeige/berlin-mitte-perfekte-2-ziwo-verkauf-top-lage-sofort-verfuegbar/3300238605-196-3519",
		);
	});

	test("extracts title from <a> element", () => {
		expect(listings[0].title).toBe(
			"Berlin Mitte perfekte 2 ZiWo VERKAUF Top Lage - Sofort verfügbar",
		);
	});

	test("extracts title from <span> fallback", () => {
		expect(listings[2].title).toBe("NEEWER 5-in-1 Light Reflector 60*90cm");
	});

	test("extracts description", () => {
		expect(listings[0].description).toContain("Top Lage");
	});

	test("extracts price", () => {
		expect(listings[0].price).toBe("310.000 € VB");
		expect(listings[1].price).toBe("30 €");
	});

	test("extracts location", () => {
		expect(listings[0].location).toBe("10119 Mitte");
	});

	test("extracts date when present", () => {
		expect(listings[0].date).toBeNull();
		expect(listings[1].date).toBe("Heute, 00:04");
		expect(listings[2].date).toBe("Gestern, 20:59");
	});

	test("extracts image URL (prefers srcset)", () => {
		expect(listings[0].imageUrl).toBe("https://img.kleinanzeigen.de/full.jpg");
	});

	test("falls back to src when no srcset", () => {
		expect(listings[2].imageUrl).toBe(
			"https://img.kleinanzeigen.de/neewer-thumb.jpg",
		);
	});

	test("extracts image count", () => {
		expect(listings[0].imageCount).toBe(10);
		expect(listings[1].imageCount).toBe(4);
		expect(listings[2].imageCount).toBe(0);
	});

	test("detects private seller", () => {
		expect(listings[0].isPrivate).toBe(true);
		expect(listings[1].isPrivate).toBe(false);
	});

	test("extracts tags", () => {
		expect(listings[0].tags).toEqual(["39 m²", "2 Zi."]);
		expect(listings[1].tags).toEqual(["Direkt kaufen"]);
		expect(listings[2].tags).toEqual([]);
	});
});
