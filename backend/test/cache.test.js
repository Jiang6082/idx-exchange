const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const pool = require("../src/db/mysql");
const { createApp } = require("../src/app");
const { getCacheKey } = require("../src/utils/cache");
const { searchCacheKey } = require("../src/utils/searchCacheKey");

const page = { limit: 20, offset: 0 };

test("cache keys ignore object key order", () => {
  assert.equal(
    getCacheKey("x", { city: "Portland", beds: "3" }),
    getCacheKey("x", { beds: "3", city: "Portland" })
  );
  assert.equal(
    getCacheKey("x", { a: { c: 1, b: 2 } }),
    getCacheKey("x", { a: { b: 2, c: 1 } })
  );
});

test("equivalent property searches share a cache key", () => {
  const key = searchCacheKey({ city: "Portland", beds: "3" }, page);

  assert.equal(searchCacheKey({ beds: "3", city: "Portland" }, page), key);
  assert.equal(searchCacheKey({ city: " portland ", beds: "3" }, page), key);
  assert.equal(searchCacheKey({ city: "Portland", beds: "3", minPrice: "" }, page), key);
  assert.equal(searchCacheKey({ city: "Portland", beds: "3", _: "1712345" }, page), key);
  assert.equal(
    searchCacheKey({ sortBy: "L_SystemPrice", sortOrder: "desc" }, page),
    searchCacheKey({ sortOrder: "DESC", sortBy: "L_SystemPrice" }, page)
  );
  assert.equal(
    searchCacheKey({ north: "45.6", south: "45.4", east: "-122.5", west: "-122.8" }, page),
    searchCacheKey({ west: "-122.8", east: "-122.5", south: "45.4", north: "45.6" }, page)
  );
});

test("different searches keep separate cache keys", () => {
  const key = searchCacheKey({ city: "Portland", beds: "3" }, page);

  assert.notEqual(searchCacheKey({ city: "Portland", beds: "4" }, page), key);
  assert.notEqual(searchCacheKey({ city: "Seattle", beds: "3" }, page), key);
  assert.notEqual(searchCacheKey({ city: "Portland", beds: "3" }, { limit: 20, offset: 20 }), key);
  assert.notEqual(searchCacheKey({ city: "Portland", beds: "3" }, { limit: 50, offset: 0 }), key);
  assert.notEqual(searchCacheKey({ city: "Portland", beds: "3", mapOnly: "true" }, page), key);
  assert.notEqual(
    searchCacheKey({ sortBy: "L_SystemPrice", sortOrder: "DESC" }, page),
    searchCacheKey({ sortBy: "L_SystemPrice", sortOrder: "ASC" }, page)
  );
  assert.notEqual(
    searchCacheKey({ q: "main st" }, page),
    searchCacheKey({ q: " main st" }, page),
    "free text is not trimmed in SQL, so the key must not trim it either"
  );
});

test("reordered search parameters are served from the cache", async () => {
  const originalQuery = pool.query;
  let queries = 0;
  pool.query = async (sql) => {
    queries += 1;
    return String(sql).includes("COUNT(*)") ? [[{ total: 0 }]] : [[]];
  };

  try {
    const app = createApp();
    const first = await request(app).get(
      "/api/properties?city=Cachetown&beds=3&sortBy=L_SystemPrice&sortOrder=desc"
    );
    const afterFirst = queries;
    const second = await request(app).get(
      "/api/properties?sortOrder=DESC&beds=3&city=cachetown&sortBy=L_SystemPrice&limit=20&offset=0"
    );

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(afterFirst, 2, "first search runs the count and page queries");
    assert.equal(queries, afterFirst, "equivalent second search hits the cache");
    assert.deepEqual(second.body, first.body);
  } finally {
    pool.query = originalQuery;
  }
});
