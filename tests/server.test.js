const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { once } = require("node:events");
const test = require("node:test");
const { createApp } = require("../server");

function makePool() {
  const orders = new Map();
  const idempotencyKeys = new Map();
  const events = new Set();

  async function query(statement, values = []) {
    const sql = statement.replace(/\s+/g, " ").trim();
    if (sql.startsWith("INSERT INTO orders")) {
      const [id, key, requestHash, name, phone, fulfillment, address, notes, items, amount] = values;
      if (idempotencyKeys.has(key)) return { rowCount: 0, rows: [] };
      orders.set(id, {
        id,
        idempotency_key: key,
        request_hash: requestHash,
        status: "creating_checkout",
        amount_cents: amount,
        customer_name: name,
        customer_phone: phone,
        fulfillment,
        delivery_address: address,
        notes,
        items: JSON.parse(items),
        created_at: new Date()
      });
      idempotencyKeys.set(key, id);
      return { rowCount: 1, rows: [{ id }] };
    }
    if (sql.startsWith("SELECT id, request_hash")) {
      const order = orders.get(idempotencyKeys.get(values[0]));
      return { rowCount: order ? 1 : 0, rows: order ? [order] : [] };
    }
    if (sql.startsWith("UPDATE orders SET status = 'pending_payment'")) {
      const order = orders.get(values[0]);
      if (!order) return { rowCount: 0, rows: [] };
      order.status = "pending_payment";
      order.checkout_id = values[1];
      order.checkout_url = values[2];
      return { rowCount: 1, rows: [] };
    }
    if (sql.startsWith("UPDATE orders SET status = 'checkout_failed'")) {
      const order = orders.get(values[0]);
      if (order) order.status = "checkout_failed";
      return { rowCount: order ? 1 : 0, rows: [] };
    }
    if (sql.startsWith("SELECT id, status, amount_cents FROM orders WHERE id = $1 AND checkout_id = $2")) {
      const order = orders.get(values[0]);
      const match = order && order.checkout_id === values[1];
      return { rowCount: match ? 1 : 0, rows: match ? [order] : [] };
    }
    if (sql.startsWith("SELECT id, status, amount_cents FROM orders WHERE id = $1")) {
      const order = orders.get(values[0]);
      return { rowCount: order ? 1 : 0, rows: order ? [order] : [] };
    }
    if (sql.startsWith("SELECT id, status, customer_name, customer_phone")) {
      const rows = [...orders.values()].slice(values[0], values[0] + 50);
      return {
        rowCount: rows.length,
        rows
      };
    }
    if (sql.startsWith("INSERT INTO yoco_webhook_events")) {
      if (events.has(values[0])) return { rowCount: 0, rows: [] };
      events.add(values[0]);
      return { rowCount: 1, rows: [{ event_id: values[0] }] };
    }
    if (sql.startsWith("UPDATE orders SET status = 'paid'")) {
      const order = orders.get(values[0]);
      if (order && order.status !== "paid") {
        order.status = "paid";
        order.payment_id = values[1];
      }
      return { rowCount: order ? 1 : 0, rows: [] };
    }
    if (sql.startsWith("UPDATE orders SET status = 'payment_failed'")) {
      const order = orders.get(values[0]);
      if (order && !["paid", "review_required"].includes(order.status)) order.status = "payment_failed";
      return { rowCount: order ? 1 : 0, rows: [] };
    }
    if (sql.startsWith("UPDATE orders SET status = 'review_required'")) {
      const order = orders.get(values[0]);
      if (order && order.status !== "paid") order.status = "review_required";
      return { rowCount: order ? 1 : 0, rows: [] };
    }
    if (sql === "SELECT 1") return { rowCount: 1, rows: [{ "?column?": 1 }] };
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rowCount: null, rows: [] };
    throw new Error(`Unexpected test SQL: ${sql}`);
  }

  return {
    orders,
    async query(...args) {
      return query(...args);
    },
    async connect() {
      return { query, release() {} };
    }
  };
}

async function startTestServer(t, options = {}) {
  const pool = makePool();
  const app = createApp({
    pool,
    siteUrl: "https://chopstick.example",
    yocoSecretKey: "test-secret",
    webhookSecret: options.webhookSecret,
    adminUsername: "owner",
    adminPassword: "test dashboard password",
    yocoFetch: options.yocoFetch || (async () => new Response(JSON.stringify({
      id: "checkout_test_123",
      status: "created",
      redirectUrl: "https://c.yoco.com/checkout/test",
      amount: 15000,
      currency: "ZAR"
    }), { status: 201, headers: { "Content-Type": "application/json" } }))
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  return { pool, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

const requestBody = {
  name: "Test Customer",
  phone: "079 710 9191",
  fulfillment: "collection",
  deliveryAddress: "",
  notes: "",
  privacyConsent: true,
  items: [{ productId: "california-veg", variantIndex: 1, quantity: 2 }],
  amount: 1
};

test("creates Yoco checkout with server-calculated prices and hides its secret", async (t) => {
  let yocoRequest;
  const { pool, baseUrl } = await startTestServer(t, {
    yocoFetch: async (url, options) => {
      yocoRequest = { url, ...options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        id: "checkout_test_123",
        status: "created",
        redirectUrl: "https://c.yoco.com/checkout/test",
        amount: 15000,
        currency: "ZAR"
      }), { status: 201, headers: { "Content-Type": "application/json" } });
    }
  });
  const idempotencyKey = "e2f5efbd-66d1-4def-9698-37d0f8bf50f0";
  const response = await fetch(`${baseUrl}/api/create-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(requestBody)
  });
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.redirectUrl, "https://c.yoco.com/checkout/test");
  assert.equal(yocoRequest.url, "https://payments.yoco.com/api/checkouts");
  assert.equal(yocoRequest.headers.Authorization, "Bearer test-secret");
  assert.equal(yocoRequest.body.amount, 15000);
  assert.deepEqual(yocoRequest.body.lineItems[0].pricingDetails, { price: 7500 });
  assert.equal(yocoRequest.body.externalId, result.orderId);
  assert.equal(JSON.stringify(result).includes("test-secret"), false);
  assert.equal(pool.orders.get(result.orderId).status, "pending_payment");
});

test("rejects Yoco redirect URLs outside the trusted checkout host", async (t) => {
  const { baseUrl, pool } = await startTestServer(t, {
    yocoFetch: async () => new Response(JSON.stringify({
      id: "checkout_test_123",
      status: "created",
      redirectUrl: "https://checkout-attacker.example/pay",
      amount: 15000,
      currency: "ZAR"
    }), { status: 201, headers: { "Content-Type": "application/json" } })
  });
  const response = await fetch(`${baseUrl}/api/create-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "e2f5efbd-66d1-4def-9698-37d0f8bf50f0"
    },
    body: JSON.stringify(requestBody)
  });
  const result = await response.json();
  assert.equal(response.status, 502);
  assert.equal(result.redirectUrl, undefined);
  assert.equal([...pool.orders.values()][0].status, "checkout_failed");
});

test("marks an order paid only after a signed Yoco success webhook", async (t) => {
  const signingBytes = Buffer.from("test webhook secret");
  const webhookSecret = `whsec_${signingBytes.toString("base64")}`;
  const { pool, baseUrl } = await startTestServer(t, { webhookSecret });
  const checkoutResponse = await fetch(`${baseUrl}/api/create-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "e2f5efbd-66d1-4def-9698-37d0f8bf50f0"
    },
    body: JSON.stringify(requestBody)
  });
  const { orderId } = await checkoutResponse.json();
  const eventId = "evt_payment_123";
  const webhookId = "wh_delivery_123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = Buffer.from(JSON.stringify({
    id: eventId,
    type: "payment.succeeded",
    payload: {
      id: "payment_123",
      type: "payment",
      status: "succeeded",
      amount: 15000,
      currency: "ZAR",
      metadata: { orderId, checkoutId: "checkout_test_123" }
    }
  }));
  const signature = crypto.createHmac("sha256", signingBytes)
    .update(`${webhookId}.${timestamp}.`)
    .update(rawBody)
    .digest("base64");
  const webhookResponse = await fetch(`${baseUrl}/api/yoco/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": webhookId,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`
    },
    body: rawBody
  });
  assert.equal(webhookResponse.status, 200);

  const statusResponse = await fetch(`${baseUrl}/api/orders/${orderId}`);
  const status = await statusResponse.json();
  assert.equal(status.status, "paid");
  assert.equal(status.amountCents, 15000);
  assert.equal(status.customer_name, undefined);
});

test("does not accept unsigned or stale Yoco webhook events", async (t) => {
  const signingBytes = Buffer.from("test webhook secret");
  const webhookSecret = `whsec_${signingBytes.toString("base64")}`;
  const { baseUrl } = await startTestServer(t, { webhookSecret });
  const response = await fetch(`${baseUrl}/api/yoco/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": "wh_invalid",
      "webhook-timestamp": String(Math.floor(Date.now() / 1000) - 181),
      "webhook-signature": "v1,invalid"
    },
    body: JSON.stringify({ id: "evt_invalid", type: "payment.succeeded", payload: {} })
  });
  assert.equal(response.status, 401);
});

test("protects merchant order records and the dashboard with authentication", async (t) => {
  const { baseUrl, pool } = await startTestServer(t);
  const checkoutResponse = await fetch(`${baseUrl}/api/create-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "e2f5efbd-66d1-4def-9698-37d0f8bf50f0"
    },
    body: JSON.stringify(requestBody)
  });
  assert.equal(checkoutResponse.status, 201);
  assert.equal([...pool.orders.values()][0].customer_name, "Test Customer");

  const unauthorizedPage = await fetch(`${baseUrl}/admin`);
  const unauthorizedApi = await fetch(`${baseUrl}/api/admin/orders`);
  assert.equal(unauthorizedPage.status, 401);
  assert.equal(unauthorizedApi.status, 401);

  const authorization = `Basic ${Buffer.from("owner:test dashboard password").toString("base64")}`;
  const authorizedPage = await fetch(`${baseUrl}/admin`, { headers: { Authorization: authorization } });
  const authorizedApi = await fetch(`${baseUrl}/api/admin/orders`, { headers: { Authorization: authorization } });
  const orders = await authorizedApi.json();
  assert.equal(authorizedPage.status, 200);
  assert.match(await authorizedPage.text(), /Private merchant dashboard/);
  assert.equal(authorizedApi.status, 200);
  assert.equal(orders.orders[0].customer_name, "Test Customer");
  assert.equal((await fetch(`${baseUrl}/server.js`)).status, 404);
});
