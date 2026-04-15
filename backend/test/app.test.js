const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const pool = require("../src/db/mysql");
const { createApp } = require("../src/app");

test("health endpoint returns ok when database query works", async () => {
  const originalQuery = pool.query;
  pool.query = async () => [[{ ok: 1 }]];

  const app = createApp();
  const response = await request(app).get("/api/health");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "ok");

  pool.query = originalQuery;
});

test("properties endpoint validates invalid price ranges", async () => {
  const app = createApp();
  const response = await request(app).get(
    "/api/properties?minPrice=900000&maxPrice=100000"
  );

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /minPrice cannot be greater than maxPrice/i);
});

test("compare endpoint requires at least two ids", async () => {
  const app = createApp();
  const response = await request(app).get("/api/properties/compare?ids=123");

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /2 and 4|between 2 and 4/i);
});

test("properties endpoint rejects invalid sort field", async () => {
  const app = createApp();
  const response = await request(app).get("/api/properties?sortBy=DROP_TABLE");

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /invalid sortby field/i);
});

test("properties endpoint rejects overly long query text", async () => {
  const app = createApp();
  const response = await request(app).get(`/api/properties?q=${"a".repeat(121)}`);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /q is too long/i);
});

test("seller estimate requires a city", async () => {
  const app = createApp();
  const response = await request(app).get("/api/seller/estimate");

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /city is required/i);
});

test("assistant endpoint requires a message", async () => {
  const app = createApp();
  const response = await request(app)
    .post("/api/experience/assistant")
    .set("x-user-email", "demo@example.com")
    .send({});

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /message is required/i);
});
