const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const {
  hashOrderRequest,
  isUuid,
  validateOrderPayload,
  verifyYocoWebhook
} = require("../order-utils");

const validRequest = {
  name: "Test Customer",
  phone: "079 710 9191",
  fulfillment: "collection",
  deliveryAddress: "",
  notes: "",
  privacyConsent: true,
  items: [{ productId: "california-veg", variantIndex: 1, quantity: 2 }]
};

test("validates menu items and calculates the server-side total in cents", () => {
  const order = validateOrderPayload(validRequest);
  assert.equal(order.amountCents, 15000);
  assert.deepEqual(order.items[0], {
    productId: "california-veg",
    name: "Vegetarian",
    variant: "8 pieces",
    quantity: 2,
    unitPriceCents: 7500,
    lineTotalCents: 15000
  });
});

test("rejects client prices, invalid menu choices, and duplicate item variants", () => {
  assert.throws(() => validateOrderPayload({
    ...validRequest,
    items: [{ productId: "made-up-item", variantIndex: 0, quantity: 1 }]
  }));
  assert.throws(() => validateOrderPayload({
    ...validRequest,
    items: [{ productId: "california-veg", variantIndex: 0, quantity: 51 }]
  }));
  assert.throws(() => validateOrderPayload({
    ...validRequest,
    items: [
      { productId: "california-veg", variantIndex: 0, quantity: 1 },
      { productId: "california-veg", variantIndex: 0, quantity: 1 }
    ]
  }));
});

test("requires a delivery address and explicit order-data consent", () => {
  assert.throws(() => validateOrderPayload({
    ...validRequest,
    fulfillment: "delivery",
    deliveryAddress: ""
  }));
  assert.throws(() => validateOrderPayload({ ...validRequest, privacyConsent: false }));
});

test("generates deterministic order hashes and accepts only UUID v4 ids", () => {
  const order = validateOrderPayload(validRequest);
  assert.equal(hashOrderRequest(order), hashOrderRequest(order));
  assert.equal(isUuid("e2f5efbd-66d1-4def-9698-37d0f8bf50f0"), true);
  assert.equal(isUuid("not-an-id"), false);
});

test("verifies Yoco signatures over the raw body and rejects replayed or changed requests", () => {
  const now = 1_700_000_000_000;
  const timestamp = String(Math.floor(now / 1000));
  const id = "evt_123";
  const rawBody = Buffer.from('{"type":"payment.succeeded","payload":{"amount":7500}}');
  const secretBytes = Buffer.from("test webhook secret");
  const secret = `whsec_${secretBytes.toString("base64")}`;
  const signature = crypto.createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.`)
    .update(rawBody)
    .digest("base64");
  const headers = { id, timestamp, signature: `v1,${signature}`, rawBody, secret, now };

  assert.equal(verifyYocoWebhook(headers), true);
  assert.equal(verifyYocoWebhook({ ...headers, rawBody: Buffer.from(`${rawBody} `) }), false);
  assert.equal(verifyYocoWebhook({ ...headers, now: now + 181_000 }), false);
  assert.equal(verifyYocoWebhook({ ...headers, signature: "v1,invalid" }), false);
});
