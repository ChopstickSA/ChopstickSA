const orderList = document.querySelector("#admin-order-list");
const statusMessage = document.querySelector("#admin-status");
const previousButton = document.querySelector("#previous-orders");
const nextButton = document.querySelector("#next-orders");
const pageLabel = document.querySelector("#page-label");
let offset = 0;

const money = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
document.querySelector("#refresh-orders").addEventListener("click", () => loadOrders());
previousButton.addEventListener("click", () => {
  offset = Math.max(0, offset - 50);
  loadOrders();
});
nextButton.addEventListener("click", () => {
  offset += 50;
  loadOrders();
});

function addField(parent, label, value) {
  const field = document.createElement("p");
  field.className = "admin-field";
  const heading = document.createElement("strong");
  heading.textContent = `${label}: `;
  field.append(heading, document.createTextNode(value || "—"));
  parent.append(field);
}

function makeOrderCard(order) {
  const card = document.createElement("article");
  card.className = "admin-order-card";
  const heading = document.createElement("div");
  heading.className = "admin-order-card-heading";
  const title = document.createElement("h2");
  title.textContent = `Order ${String(order.id).slice(0, 8).toUpperCase()}`;
  const state = document.createElement("span");
  state.className = "order-state";
  state.textContent = String(order.status).replaceAll("_", " ");
  heading.append(title, state);
  card.append(heading);

  addField(card, "Placed", new Date(order.created_at).toLocaleString("en-ZA"));
  addField(card, "Customer", order.customer_name);
  addField(card, "Phone", order.customer_phone);
  addField(card, "Fulfilment", order.fulfillment === "delivery" ? "Uber Courier delivery" : "Collection");
  if (order.fulfillment === "delivery") addField(card, "Delivery address", order.delivery_address);
  addField(card, "Notes", order.notes);

  const itemsTitle = document.createElement("h3");
  itemsTitle.textContent = "Items";
  const items = document.createElement("ul");
  items.className = "admin-order-items";
  for (const item of Array.isArray(order.items) ? order.items : []) {
    const line = document.createElement("li");
    const total = Number(item.lineTotalCents);
    line.textContent = `${item.name} (${item.variant}) × ${item.quantity} — ${Number.isSafeInteger(total) ? money.format(total / 100) : "Total unavailable"}`;
    items.append(line);
  }
  card.append(itemsTitle, items);

  const total = Number(order.amount_cents);
  const amount = document.createElement("p");
  amount.className = "admin-order-total";
  amount.textContent = `Food subtotal: ${Number.isSafeInteger(total) ? money.format(total / 100) : "Unavailable"}`;
  card.append(amount);
  return card;
}

async function loadOrders() {
  statusMessage.textContent = "Loading orders…";
  previousButton.disabled = true;
  nextButton.disabled = true;
  try {
    const response = await fetch(`/api/admin/orders?offset=${offset}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Could not retrieve orders.");
    orderList.replaceChildren(...result.orders.map(makeOrderCard));
    statusMessage.textContent = result.orders.length ? `${result.orders.length} order(s) shown.` : "No orders on this page.";
    previousButton.disabled = offset === 0;
    nextButton.disabled = !result.hasMore;
    pageLabel.textContent = `Page ${Math.floor(offset / 50) + 1}`;
  } catch (error) {
    statusMessage.textContent = `${error.message} Refresh the page or contact your site administrator.`;
  }
}

loadOrders();
