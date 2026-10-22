const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { Pool } = require("pg");
const {
  hashOrderRequest,
  isUuid,
  validateOrderPayload,
  verifyYocoWebhook
} = require("./order-utils");

const ROOT = __dirname;
const YOCO_CHECKOUT_URL = "https://payments.yoco.com/api/checkouts";
const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
  ["/menu-data.js", "menu-data.js"],
  ["/payment-result.html", "payment-result.html"],
  ["/payment-result.js", "payment-result.js"],
  ["/admin-orders.js", "admin-orders.js"]
]);

function getRequiredConfig() {
  const required = [
    "DATABASE_URL",
    "YOCO_SECRET_KEY",
    "YOCO_WEBHOOK_SECRET",
    "PUBLIC_SITE_URL",
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD"
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required environment settings: ${missing.join(", ")}`);

  const siteUrl = new URL(process.env.PUBLIC_SITE_URL);
  if (siteUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("PUBLIC_SITE_URL must use HTTPS in production.");
  }
  if (siteUrl.username || siteUrl.password || siteUrl.search || siteUrl.hash) {
    throw new Error("PUBLIC_SITE_URL must be a base URL without credentials, query, or fragment.");
  }
  if (!process.env.YOCO_WEBHOOK_SECRET.startsWith("whsec_")) {
    throw new Error("YOCO_WEBHOOK_SECRET must be the signing secret for the Checkout API webhook.");
  }
  if (process.env.ADMIN_PASSWORD.length < 16) {
    throw new Error("ADMIN_PASSWORD must be at least 16 characters long.");
  }

  return { siteUrl: siteUrl.origin };
}

async function initializeDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id uuid PRIMARY KEY,
      idempotency_key uuid NOT NULL UNIQUE,
      request_hash text NOT NULL,
      status text NOT NULL CHECK (status IN (
        'creating_checkout', 'pending_payment', 'paid', 'payment_failed',
        'checkout_failed', 'review_required'
      )),
      customer_name varchar(100) NOT NULL,
      customer_phone varchar(20) NOT NULL,
      fulfillment varchar(20) NOT NULL CHECK (fulfillment IN ('collection', 'delivery')),
      delivery_address varchar(300) NOT NULL DEFAULT '',
      notes varchar(500) NOT NULL DEFAULT '',
      items jsonb NOT NULL,
      amount_cents integer NOT NULL CHECK (amount_cents > 0),
      checkout_id text UNIQUE,
      checkout_url text,
      payment_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS yoco_webhook_events (
      event_id varchar(200) PRIMARY KEY,
      event_type varchar(100) NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

function createApp({
  pool,
  siteUrl,
  yocoSecretKey = process.env.YOCO_SECRET_KEY,
  webhookSecret = process.env.YOCO_WEBHOOK_SECRET,
  adminUsername = process.env.ADMIN_USERNAME,
  adminPassword = process.env.ADMIN_PASSWORD,
  yocoFetch = global.fetch
}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  const checkoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many checkout attempts. Please wait a minute and try again." }
  });
  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many order dashboard requests. Please wait and try again."
  });
  const adminHashes = [
    crypto.createHash("sha256").update(String(adminUsername || "")).digest(),
    crypto.createHash("sha256").update(String(adminPassword || "")).digest()
  ];
  const requireAdmin = (req, res, next) => {
    const authorization = req.get("Authorization") || "";
    const match = authorization.match(/^Basic ([A-Za-z0-9+/=]+)$/);
    if (match && match[1].length <= 4096) {
      const decoded = Buffer.from(match[1], "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator >= 0) {
        const usernameHash = crypto.createHash("sha256").update(decoded.slice(0, separator)).digest();
        const passwordHash = crypto.createHash("sha256").update(decoded.slice(separator + 1)).digest();
        const usernameMatches = crypto.timingSafeEqual(usernameHash, adminHashes[0]);
        const passwordMatches = crypto.timingSafeEqual(passwordHash, adminHashes[1]);
        if (usernameMatches && passwordMatches && adminUsername && adminPassword) return next();
      }
    }
    res.set("WWW-Authenticate", 'Basic realm="Chopstick SA orders", charset="UTF-8"');
    res.set("Cache-Control", "no-store");
    return res.status(401).send("Authentication required.");
  };

  app.get("/healthz", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch (error) {
      console.error("Health check database query failed:", error.message);
      res.status(503).json({ ok: false });
    }
  });

  app.post(
    "/api/create-checkout",
    checkoutLimiter,
    express.json({ limit: "16kb", strict: true }),
    async (req, res) => {
      const idempotencyKey = req.get("Idempotency-Key");
      if (!isUuid(idempotencyKey)) {
        return res.status(400).json({ error: "Refresh the page and try your checkout again." });
      }

      let order;
      try {
        order = validateOrderPayload(req.body);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      const requestHash = hashOrderRequest(order);
      let orderId = crypto.randomUUID();
      try {
        const inserted = await pool.query(
          `INSERT INTO orders (
             id, idempotency_key, request_hash, status, customer_name, customer_phone,
             fulfillment, delivery_address, notes, items, amount_cents
           ) VALUES ($1, $2, $3, 'creating_checkout', $4, $5, $6, $7, $8, $9::jsonb, $10)
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING id`,
          [
            orderId,
            idempotencyKey,
            requestHash,
            order.name,
            order.phone,
            order.fulfillment,
            order.deliveryAddress,
            order.notes,
            JSON.stringify(order.items),
            order.amountCents
          ]
        );

        if (!inserted.rowCount) {
          const existingResult = await pool.query(
            `SELECT id, request_hash, status, checkout_url
             FROM orders WHERE idempotency_key = $1`,
            [idempotencyKey]
          );
          const existing = existingResult.rows[0];
          if (!existing || existing.request_hash !== requestHash) {
            return res.status(409).json({ error: "This checkout request has changed. Refresh the page and try again." });
          }
          if (existing.status === "pending_payment" && existing.checkout_url) {
            return res.json({ orderId: existing.id, redirectUrl: existing.checkout_url });
          }
          if (existing.status === "checkout_failed") {
            const retry = await pool.query(
              `UPDATE orders SET status = 'creating_checkout', updated_at = now()
               WHERE id = $1 AND status = 'checkout_failed'`,
              [existing.id]
            );
            if (!retry.rowCount) {
              return res.status(409).json({ error: "This checkout is already being processed. Please wait a moment." });
            }
          } else {
            return res.status(409).json({ error: "This order has already been processed or is still being prepared." });
          }
          orderId = existing.id;
        }
      } catch (error) {
        console.error("Could not save checkout order:", error.message);
        return res.status(503).json({ error: "Orders are temporarily unavailable. Please try again shortly." });
      }

      const resultUrl = new URL("/payment-result.html", siteUrl);
      resultUrl.searchParams.set("orderId", orderId);
      const cancelUrl = new URL(resultUrl);
      cancelUrl.searchParams.set("result", "cancelled");
      const failureUrl = new URL(resultUrl);
      failureUrl.searchParams.set("result", "failed");

      const checkoutRequest = {
        amount: order.amountCents,
        currency: "ZAR",
        clientReferenceId: orderId,
        externalId: orderId,
        successUrl: resultUrl.href,
        cancelUrl: cancelUrl.href,
        failureUrl: failureUrl.href,
        metadata: { orderId },
        lineItems: order.items.map((item) => ({
          displayName: `${item.name} (${item.variant})`,
          quantity: item.quantity,
          pricingDetails: { price: item.unitPriceCents }
        }))
      };

      let checkout;
      try {
        const yocoResponse = await yocoFetch(YOCO_CHECKOUT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${yocoSecretKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": orderId
          },
          body: JSON.stringify(checkoutRequest),
          signal: AbortSignal.timeout(15000)
        });
        if (!yocoResponse.ok) {
          console.error("Yoco checkout request failed with status:", yocoResponse.status);
          throw new Error("The payment provider could not create a checkout.");
        }
        checkout = await yocoResponse.json();
        const redirectUrl = new URL(checkout.redirectUrl);
        if (
          typeof checkout.id !== "string" ||
          checkout.status !== "created" ||
          redirectUrl.protocol !== "https:" ||
          redirectUrl.hostname !== "c.yoco.com" ||
          checkout.amount !== order.amountCents ||
          checkout.currency !== "ZAR"
        ) {
          throw new Error("The payment provider returned an invalid checkout response.");
        }
      } catch (error) {
        console.error("Could not prepare Yoco checkout:", error.message);
        try {
          await pool.query(
            `UPDATE orders SET status = 'checkout_failed', updated_at = now()
             WHERE id = $1 AND status = 'creating_checkout'`,
            [orderId]
          );
        } catch (databaseError) {
          console.error("Could not update failed checkout status:", databaseError.message);
        }
        return res.status(502).json({ error: "Secure checkout could not be started. Please try again or contact Chopstick SA." });
      }

      try {
        await pool.query(
          `UPDATE orders
           SET status = 'pending_payment', checkout_id = $2, checkout_url = $3, updated_at = now()
           WHERE id = $1 AND status = 'creating_checkout'`,
          [orderId, checkout.id, checkout.redirectUrl]
        );
      } catch (error) {
        console.error("Could not save Yoco checkout reference:", error.message);
        return res.status(503).json({ error: "The checkout was prepared but could not be saved. Please contact Chopstick SA before trying again." });
      }

      return res.status(201).json({ orderId, redirectUrl: checkout.redirectUrl });
    }
  );

  app.get("/api/orders/:id", async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: "Order not found." });
    try {
      const result = await pool.query(
        "SELECT id, status, amount_cents FROM orders WHERE id = $1",
        [req.params.id]
      );
      const order = result.rows[0];
      if (!order) return res.status(404).json({ error: "Order not found." });
      return res.json({
        orderId: order.id,
        status: order.status,
        amountCents: order.amount_cents
      });
    } catch (error) {
      console.error("Could not retrieve payment status:", error.message);
      return res.status(503).json({ error: "Payment status is temporarily unavailable." });
    }
  });

  app.get("/admin", adminLimiter, requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Robots-Tag", "noindex, nofollow");
    res.sendFile(path.join(ROOT, "admin-orders.html"), (error) => {
      if (error && !res.headersSent) res.sendStatus(404);
    });
  });

  app.get("/api/admin/orders", adminLimiter, requireAdmin, async (req, res) => {
    const offset = Number(req.query.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
      return res.status(400).json({ error: "Invalid order page." });
    }
    try {
      const result = await pool.query(
        `SELECT id, status, customer_name, customer_phone, fulfillment, delivery_address,
                notes, items, amount_cents, created_at
         FROM orders ORDER BY created_at DESC LIMIT 50 OFFSET $1`,
        [offset]
      );
      return res.json({
        orders: result.rows,
        offset,
        hasMore: result.rows.length === 50
      });
    } catch (error) {
      console.error("Could not retrieve merchant orders:", error.message);
      return res.status(503).json({ error: "Orders are temporarily unavailable." });
    }
  });

  app.post(
    "/api/yoco/webhook",
    express.raw({ type: "application/json", limit: "64kb" }),
    async (req, res) => {
      const rawBody = req.body;
      const verified = verifyYocoWebhook({
        id: req.get("webhook-id"),
        timestamp: req.get("webhook-timestamp"),
        signature: req.get("webhook-signature"),
        rawBody,
        secret: webhookSecret
      });
      if (!verified) return res.status(401).send("Invalid webhook signature.");

      let event;
      try {
        event = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return res.status(400).send("Invalid webhook JSON.");
      }
      if (
        !event ||
        typeof event.id !== "string" ||
        event.id.length > 200 ||
        typeof event.type !== "string" ||
        event.type.length > 100 ||
        !event.payload ||
        typeof event.payload !== "object" ||
        Array.isArray(event.payload)
      ) {
        return res.status(400).send("Invalid webhook event.");
      }

      let databaseClient;
      let transactionStarted = false;
      try {
        databaseClient = await pool.connect();
        await databaseClient.query("BEGIN");
        transactionStarted = true;
        const insertedEvent = await databaseClient.query(
          `INSERT INTO yoco_webhook_events (event_id, event_type)
           VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
          [event.id, event.type]
        );
        if (!insertedEvent.rowCount) {
          await databaseClient.query("COMMIT");
          transactionStarted = false;
          return res.sendStatus(200);
        }

        if (event.type === "payment.succeeded" || event.type === "payment.failed") {
          const payload = event.payload;
          const metadata = payload.metadata || {};
          const checkoutId = typeof metadata.checkoutId === "string" ? metadata.checkoutId : "";
          const orderId = isUuid(metadata.orderId) ? metadata.orderId : "";
          const orderResult = orderId
            ? await databaseClient.query(
              "SELECT id, status, amount_cents FROM orders WHERE id = $1 AND checkout_id = $2 FOR UPDATE",
              [orderId, checkoutId]
            )
            : await databaseClient.query(
              "SELECT id, status, amount_cents FROM orders WHERE checkout_id = $1 FOR UPDATE",
              [checkoutId]
            );
          const order = orderResult.rows[0];

          if (order) {
            const expectedStatus = event.type === "payment.succeeded" ? "succeeded" : "failed";
            const validPayment = payload.type === "payment" &&
              payload.status === expectedStatus &&
              payload.currency === "ZAR" &&
              Number.isSafeInteger(payload.amount) &&
              payload.amount === order.amount_cents &&
              typeof payload.id === "string" &&
              payload.id.length > 0;
            if (!validPayment) {
              await databaseClient.query(
                `UPDATE orders SET status = 'review_required', updated_at = now()
                 WHERE id = $1 AND status <> 'paid'`,
                [order.id]
              );
              console.error("Yoco payment details did not match the order; order requires review:", order.id);
            } else if (event.type === "payment.succeeded" && payload.status === "succeeded") {
              await databaseClient.query(
                `UPDATE orders SET status = 'paid', payment_id = $2, updated_at = now()
                 WHERE id = $1 AND status <> 'paid'`,
                [order.id, typeof payload.id === "string" ? payload.id : null]
              );
            } else if (event.type === "payment.failed" && payload.status === "failed") {
              await databaseClient.query(
                `UPDATE orders SET status = 'payment_failed', updated_at = now()
                 WHERE id = $1 AND status NOT IN ('paid', 'review_required')`,
                [order.id]
              );
            }
          }
        }

        await databaseClient.query("COMMIT");
        transactionStarted = false;
        return res.sendStatus(200);
      } catch (error) {
        if (transactionStarted) {
          try {
            await databaseClient.query("ROLLBACK");
          } catch (rollbackError) {
            console.error("Could not roll back Yoco webhook transaction:", rollbackError.message);
          }
        }
        console.error("Could not process Yoco webhook:", error.message);
        return res.status(503).send("Webhook processing failed.");
      } finally {
        if (databaseClient) databaseClient.release();
      }
    }
  );

  for (const [route, fileName] of PUBLIC_FILES) {
    app.get(route, (req, res) => {
      res.sendFile(path.join(ROOT, fileName), (error) => {
        if (error && !res.headersSent) res.sendStatus(404);
      });
    });
  }
  app.use("/assets", express.static(path.join(ROOT, "assets"), {
    dotfiles: "deny",
    fallthrough: false,
    index: false,
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
  }));
  app.use("/api", (req, res) => res.status(404).json({ error: "API route not found." }));
  app.use((req, res) => res.sendStatus(404));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error("Unhandled request error:", error.message);
    if (req.path.startsWith("/api/")) return res.status(400).json({ error: "The request could not be processed." });
    return res.sendStatus(400);
  });

  return app;
}

async function start() {
  const { siteUrl } = getRequiredConfig();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await initializeDatabase(pool);
  const app = createApp({ pool, siteUrl });
  const server = app.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () => {
    console.log("Chopstick SA web service is ready.");
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    });
  }
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Chopstick SA server could not start:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { createApp, getRequiredConfig, initializeDatabase };
