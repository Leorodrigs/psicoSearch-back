import assert from "node:assert/strict";
import test from "node:test";
import { SearchInputError, SearchService } from "./search-service.js";
import type { GoogleTextSearchResponse } from "../types/places.js";

function place(id: string, name = id, businessStatus?: string) {
  return { id, displayName: { text: name }, businessStatus };
}

test("accepts multiple categories and removes duplicate and permanently closed places", async () => {
  const calls: string[] = [];
  const service = new SearchService(async (query) => {
    calls.push(query);
    if (query.startsWith("clínica de psicologia")) {
      return { places: [place("shared", "Lugar compartilhado"), place("closed", "Fechado", "CLOSED_PERMANENTLY")] };
    }
    return { places: [place("shared", "Duplicado"), place("unique", "Lugar único")] };
  }, "Porto Alegre, RS, Brasil");

  try {
    const result = await service.startSearch(["psychology-clinic", "psychiatric-clinic"]);
    assert.deepEqual(result.items.map((item) => item.id), ["shared", "unique"]);
    assert.equal(result.hasMore, false);
    assert.deepEqual(calls, [
      "clínica de psicologia em Porto Alegre, RS, Brasil",
      "clínica psiquiátrica em Porto Alegre, RS, Brasil"
    ]);
  } finally {
    service.dispose();
  }
});

test("paginates only when requested and serves a repeated cursor without another Places call", async () => {
  const calls: Array<string | undefined> = [];
  let page = 0;
  const service = new SearchService(async (_query, pageToken) => {
    calls.push(pageToken);
    page += 1;
    if (page === 1) {
      return {
        places: Array.from({ length: 20 }, (_, index) => place(`place-${index}`)),
        nextPageToken: "next-google-page"
      };
    }
    return { places: [place("place-20")] };
  });

  try {
    const first = await service.startSearch(["psychology-clinic"]);
    assert.equal(first.items.length, 20);
    assert.equal(first.hasMore, true);
    assert.equal(page, 1);

    const next = await service.nextPage(first.cursor);
    assert.deepEqual(next.items.map((item) => item.id), ["place-20"]);
    assert.equal(next.hasMore, false);

    const replay = await service.nextPage(first.cursor);
    assert.deepEqual(replay, next);
    assert.deepEqual(calls, [undefined, "next-google-page"]);
  } finally {
    service.dispose();
  }
});

test("stops each text query after Google's 60-result limit", async () => {
  const tokens: Array<string | undefined> = [];
  let pageNumber = 0;
  const service = new SearchService(async (_query, pageToken) => {
    tokens.push(pageToken);
    pageNumber += 1;
    return {
      places: Array.from({ length: 20 }, (_, index) => place(`page-${pageNumber}-place-${index}`)),
      nextPageToken: `token-${pageNumber}`
    };
  });

  try {
    const first = await service.startSearch(["psychology-clinic"]);
    const second = await service.nextPage(first.cursor);
    const third = await service.nextPage(second.cursor);
    assert.equal(first.items.length, 20);
    assert.equal(second.items.length, 20);
    assert.equal(third.items.length, 20);
    assert.equal(third.hasMore, false);
    assert.deepEqual(tokens, [undefined, "token-1", "token-2"]);
  } finally {
    service.dispose();
  }
});

test("rejects an empty or unknown category selection before calling Google", async () => {
  let called = false;
  const service = new SearchService(async (): Promise<GoogleTextSearchResponse> => {
    called = true;
    return { places: [] };
  });

  try {
    await assert.rejects(() => service.startSearch([]), SearchInputError);
    await assert.rejects(() => service.startSearch(["not-a-category"]), SearchInputError);
    assert.equal(called, false);
  } finally {
    service.dispose();
  }
});

test("coalesces concurrent requests for the same cursor", async () => {
  let calls = 0;
  const service = new SearchService(async (_query, pageToken) => {
    calls += 1;
    if (!pageToken) return { places: Array.from({ length: 20 }, (_, index) => place(`id-${index}`)), nextPageToken: "next" };
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { places: [place("last")] };
  });

  try {
    const first = await service.startSearch(["psychology-clinic"]);
    const [left, right] = await Promise.all([
      service.nextPage(first.cursor),
      service.nextPage(first.cursor)
    ]);
    assert.deepEqual(left, right);
    assert.equal(calls, 2);
  } finally {
    service.dispose();
  }
});
