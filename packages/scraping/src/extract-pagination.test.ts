import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { extractPagination } from "./extract-pagination";

function parseHTML(html: string): Document {
	const window = new Window();
	window.document.body.innerHTML = html;
	return window.document as unknown as Document;
}

describe("extractPagination", () => {
	test("parses middle page with prev link", () => {
		const doc = parseHTML(`
      <div class="pagination">
        <div class="pagination-nav">
          <a class="pagination-prev" title="Zurück" href="/s-haus-kaufen/berlin/anbieter:privat/seite:7/c208l3331"></a>
        </div>
        <div class="pagination-pages">
          <a href="/s-haus-kaufen/berlin/anbieter:privat/c208l3331" class="pagination-page">1</a>
          <span>...</span>
          <a href="/s-haus-kaufen/berlin/anbieter:privat/seite:3/c208l3331" class="pagination-page">3</a>
          <a href="/s-haus-kaufen/berlin/anbieter:privat/seite:4/c208l3331" class="pagination-page">4</a>
          <a href="/s-haus-kaufen/berlin/anbieter:privat/seite:5/c208l3331" class="pagination-page">5</a>
          <span class="pagination-not-linked pagination-page" data-url="/s-haus-kaufen/berlin/anbieter:privat/seite:6/c208l3331">6</span>
          <span class="pagination-not-linked pagination-page" data-url="/s-haus-kaufen/berlin/anbieter:privat/seite:7/c208l3331">7</span>
          <span class="pagination-current">8</span>
        </div>
      </div>
    `);
		const pagination = extractPagination(doc);
		expect(pagination.currentPage).toBe(8);
		expect(pagination.totalPages).toBe(8);
		expect(pagination.prevUrl).toBe(
			"/s-haus-kaufen/berlin/anbieter:privat/seite:7/c208l3331",
		);
		expect(pagination.nextUrl).toBeNull();
	});

	test("parses page with both prev and next links", () => {
		const doc = parseHTML(`
      <div class="pagination">
        <div class="pagination-nav">
          <a class="pagination-prev" href="/seite:2/c208l3331"></a>
          <a class="pagination-next" href="/seite:4/c208l3331"></a>
        </div>
        <div class="pagination-pages">
          <a href="/c208l3331" class="pagination-page">1</a>
          <a href="/seite:2/c208l3331" class="pagination-page">2</a>
          <span class="pagination-current">3</span>
          <a href="/seite:4/c208l3331" class="pagination-page">4</a>
          <a href="/seite:5/c208l3331" class="pagination-page">5</a>
        </div>
      </div>
    `);
		const pagination = extractPagination(doc);
		expect(pagination.currentPage).toBe(3);
		expect(pagination.totalPages).toBe(5);
		expect(pagination.prevUrl).toBe("/seite:2/c208l3331");
		expect(pagination.nextUrl).toBe("/seite:4/c208l3331");
	});

	test("parses first page (no prev)", () => {
		const doc = parseHTML(`
      <div class="pagination">
        <div class="pagination-nav">
          <a class="pagination-next" href="/seite:2/c208l3331"></a>
        </div>
        <div class="pagination-pages">
          <span class="pagination-current">1</span>
          <a href="/seite:2/c208l3331" class="pagination-page">2</a>
          <a href="/seite:3/c208l3331" class="pagination-page">3</a>
        </div>
      </div>
    `);
		const pagination = extractPagination(doc);
		expect(pagination.currentPage).toBe(1);
		expect(pagination.totalPages).toBe(3);
		expect(pagination.prevUrl).toBeNull();
		expect(pagination.nextUrl).toBe("/seite:2/c208l3331");
	});

	test("parses first page with next link and trailing ellipsis", () => {
		const doc = parseHTML(`
      <div class="pagination">
        <div class="pagination-pages">
          <span class="pagination-current">1</span>
          <a href="/s-haus-kaufen/anbieter:privat/seite:2/c208" class="pagination-page">2</a>
          <a href="/s-haus-kaufen/anbieter:privat/seite:3/c208" class="pagination-page">3</a>
          <a href="/s-haus-kaufen/anbieter:privat/seite:4/c208" class="pagination-page">4</a>
          <a href="/s-haus-kaufen/anbieter:privat/seite:5/c208" class="pagination-page">5</a>
          <span class="pagination-not-linked pagination-page" data-url="/s-haus-kaufen/anbieter:privat/seite:6/c208">6</span>
          <span class="pagination-not-linked pagination-page" data-url="/s-haus-kaufen/anbieter:privat/seite:7/c208">7</span>
          <span class="pagination-not-linked pagination-page" data-url="/s-haus-kaufen/anbieter:privat/seite:8/c208">8</span>
          <span class="pagination-not-linked pagination-page" data-url="/s-haus-kaufen/anbieter:privat/seite:9/c208">9</span>
          <span class="pagination-not-linked pagination-page" data-url="/s-haus-kaufen/anbieter:privat/seite:10/c208">10</span>
          <span>...</span>
        </div>
        <div class="pagination-nav">
          <a class="pagination-next" title="Nächste" href="/s-haus-kaufen/anbieter:privat/seite:2/c208"></a>
        </div>
      </div>
    `);
		const pagination = extractPagination(doc);
		expect(pagination.currentPage).toBe(1);
		expect(pagination.totalPages).toBe(10);
		expect(pagination.prevUrl).toBeNull();
		expect(pagination.nextUrl).toBe(
			"/s-haus-kaufen/anbieter:privat/seite:2/c208",
		);
	});

	test("returns defaults when no pagination exists", () => {
		const doc = parseHTML("<div>no pagination here</div>");
		const pagination = extractPagination(doc);
		expect(pagination.currentPage).toBe(1);
		expect(pagination.totalPages).toBe(1);
		expect(pagination.prevUrl).toBeNull();
		expect(pagination.nextUrl).toBeNull();
	});
});
