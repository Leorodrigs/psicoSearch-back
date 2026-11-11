import assert from "node:assert/strict";
import test from "node:test";
import { PlacesApiError, PlacesClient, PlacesClientConfigurationError } from "./places-client.js";

test("reports Google quota failures without losing the upstream status", async () => {
  const fetcher = (async () => new Response(JSON.stringify({
    error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded" }
  }), { status: 429, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  const client = new PlacesClient("test-key", fetcher);

  await assert.rejects(
    () => client.searchText("clínica de psicologia em Porto Alegre, RS, Brasil"),
    (error: unknown) => {
      assert.ok(error instanceof PlacesApiError);
      assert.equal(error.httpStatus, 429);
      assert.equal(error.googleStatus, "RESOURCE_EXHAUSTED");
      return true;
    }
  );
});

test("refuses to call Google when the API key is missing", async () => {
  let called = false;
  const fetcher = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  const client = new PlacesClient(undefined, fetcher);

  await assert.rejects(() => client.searchText("clínica de psicologia"), PlacesClientConfigurationError);
  assert.equal(called, false);
});
