const crypto = require("node:crypto");
const menu = require("./menu-data");

const productsById = new Map();
for (const category of menu) {
  for (const product of category.products) productsById.set(product.id, product);
}

function validateOrderPayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid order details.");
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const fulfillment = input.fulfillment;
  const deliveryAddress = typeof input.deliveryAddress === "string" ? input.deliveryAddress.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (name.length < 1 || name.length > 100) throw new Error("Enter a name up to 100 characters.");
  if (!/^[+()\d\s-]{7,20}$/.test(phone) || phone.replace(/\D/g, "").length < 7) {
    throw new Error("Enter a valid phone number.");
  }
  if (fulfillment !== "collection" && fulfillment !== "delivery") {
    throw new Error("Choose collection or delivery.");
  }
  if (fulfillment === "delivery" && (deliveryAddress.length < 5 || deliveryAddress.length > 300)) {
    throw new Error("Enter a delivery address in Mamelodi.");
  }
  if (notes.length > 500) throw new Error("Order notes must be 500 characters or fewer.");
  if (input.privacyConsent !== true) throw new Error("Confirm how your order details will be used.");
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) {
    throw new Error("Choose between 1 and 100 menu item options.");
  }

  const seen = new Set();
  const items = input.items.map((item) => {
    if (!item || typeof item !== "object" || typeof item.productId !== "string") {
      throw new Error("An order item is invalid.");
    }
    const product = productsById.get(item.productId);
    if (!product || !Number.isInteger(item.variantIndex) || !Number.isInteger(item.quantity)) {
      throw new Error("An order item is invalid.");
    }
    const variant = product.variants[item.variantIndex];
    const key = `${item.productId}:${item.variantIndex}`;
    if (!variant || item.quantity < 1 || item.quantity > 50 || seen.has(key)) {
      throw new Error("An order item or quantity is invalid.");
    }
    seen.add(key);
    const unitPriceCents = variant.price * 100;
    const lineTotalCents = unitPriceCents * item.quantity;
    return {
      productId: product.id,
      name: product.name,
      variant: variant.label,
      quantity: item.quantity,
      unitPriceCents,
      lineTotalCents
    };
  });

  const amountCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("The order total is invalid.");
  }

  return {
    name,
    phone,
    fulfillment,
    deliveryAddress: fulfillment === "delivery" ? deliveryAddress : "",
    notes,
    items,
    amountCents
  };
}

function hashOrderRequest(order) {
  return crypto.createHash("sha256").update(JSON.stringify(order)).digest("hex");
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function verifyYocoWebhook({ id, timestamp, signature, rawBody, secret, now = Date.now() }) {
  if (
    typeof id !== "string" || id.length < 1 || id.length > 200 ||
    typeof timestamp !== "string" || !/^\d{1,12}$/.test(timestamp) ||
    typeof signature !== "string" || !Buffer.isBuffer(rawBody) ||
    typeof secret !== "string" || !secret.startsWith("whsec_")
  ) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(now / 1000 - timestampSeconds) > 180) return false;

  const encodedSecret = secret.slice("whsec_".length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedSecret)) return false;
  const secretBytes = Buffer.from(encodedSecret, "base64");
  if (!secretBytes.length) return false;

  const expected = crypto.createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.`)
    .update(rawBody)
    .digest();
  const candidates = signature.trim().split(/\s+/);
  return candidates.some((candidate) => {
    const separator = candidate.indexOf(",");
    if (separator < 1 || candidate.slice(0, separator) !== "v1") return false;
    const signatureValue = candidate.slice(separator + 1);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signatureValue)) return false;
    const supplied = Buffer.from(signatureValue, "base64");
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  });
}

module.exports = {
  hashOrderRequest,
  isUuid,
  validateOrderPayload,
  verifyYocoWebhook
};
