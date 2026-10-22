# Chopstick SA

Static site assets are served by the Node web service. The online checkout uses Yoco-hosted payment pages; card details never pass through this application. Orders are marked paid only after a valid Yoco webhook is verified.

## Run locally

Requirements: Node.js 20 or later and PostgreSQL.

1. Create a local PostgreSQL database and copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the local database connection string.
3. Set `YOCO_SECRET_KEY` to a Yoco **test** secret key and `YOCO_WEBHOOK_SECRET` to the test webhook signing secret. Set `ADMIN_USERNAME` and a unique random `ADMIN_PASSWORD` of at least 16 characters. Keep all of these private; never add them to browser code, Git, or chat.
4. Set `PUBLIC_SITE_URL=http://localhost:3000`.
5. Run `npm ci`, `npm test`, then `npm start`.

The service creates its order and webhook tables on startup. Configure a Yoco test webhook to call `https://<public-host>/api/yoco/webhook` and subscribe to `payment.succeeded` and `payment.failed`. Use a public HTTPS tunnel when testing against localhost.

## Render deployment

`render.yaml` describes a new Node web service named `chopstick-sa-web`, not a static site. It does not replace or remove the existing static service. Before the web service can start:

1. Create a Render PostgreSQL database and keep its connection URL private.
2. Create the Render web service from this repository. Set `DATABASE_URL` to the database's internal connection URL. Keep the existing static site until the new service is tested; connect a custom domain only after verifying the new service.
3. Set `YOCO_SECRET_KEY` and `YOCO_WEBHOOK_SECRET` in the Render service's private Environment settings. Use test credentials first.
4. Set `ADMIN_USERNAME` and a unique, randomly generated `ADMIN_PASSWORD` (at least 16 characters) in the private Environment settings. The password protects `/admin`.
5. Set `PUBLIC_SITE_URL` to the exact public HTTPS URL of the web service.
6. In Yoco, configure the webhook URL as `https://<public-host>/api/yoco/webhook`, subscribe to `payment.succeeded` and `payment.failed`, and copy its signing secret into Render's `YOCO_WEBHOOK_SECRET` setting.
7. Complete test payments and confirm the order status changes only after the webhook is received. Check the authenticated `/admin` dashboard. Replace test credentials with live credentials only after testing and business approval.

The Render blueprint does not create a database or provision paid resources. A PostgreSQL database must be arranged separately. Do not deploy checkout until every required environment setting is configured. Yoco documentation: [Create checkout](https://yoco.docs.buildwithfern.com/api-reference/checkout-api/checkout/create-checkout.md) and [verify webhook events](https://yoco.docs.buildwithfern.com/guides/online-payments/webhooks/verifying-the-events.md).

## Order data

The database stores the customer's name, phone number, delivery address (if supplied), notes, item details, total, checkout reference, and payment state. The checkout form discloses this storage and use. The `/admin` dashboard uses HTTP Basic authentication over HTTPS; give its credentials only to authorised staff. Restrict database access, enable provider backups, and establish a retention/deletion policy before going live. Payment status returned by the browser is never treated as proof of payment.
