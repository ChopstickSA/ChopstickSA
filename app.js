const ORDER_WHATSAPP = "27797109191";
const MAX_ORDER_LINES = 100;
const MAX_ITEM_QUANTITY = 50;
const menu = Array.isArray(window.CHOPSTICK_MENU) ? window.CHOPSTICK_MENU : [];
const money = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2
});
const cart = new Map();
const productsById = new Map();
let checkoutRequestId = crypto.randomUUID();

const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
  navigation.classList.toggle("is-open", !isExpanded);
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    navigation.classList.remove("is-open");
  }
});

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[character]);

const menuFilters = document.querySelector("#menu-filters");
const catalogGrid = document.querySelector("#catalog-grid");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartCount = document.querySelector("#cart-count");
const cartTotal = document.querySelector("#cart-total");
const orderForm = document.querySelector("#order-form");
const orderStatus = document.querySelector("#order-status");
const deliveryAddressRow = document.querySelector("#delivery-address-row");
const deliveryAddress = document.querySelector("#delivery-address");
const paymentMethod = document.querySelector("#payment-method");
const placeOrder = document.querySelector("#place-order");

function renderMenu() {
  if (!menu.length) {
    catalogGrid.innerHTML = "<p>Our menu is temporarily unavailable. Please contact us on WhatsApp.</p>";
    return;
  }

  menuFilters.innerHTML = [
    '<button class="filter-button is-active" type="button" data-filter="all" aria-pressed="true">All menu</button>',
    ...menu.map((category) => `<button class="filter-button" type="button" data-filter="${escapeHtml(category.id)}" aria-pressed="false">${escapeHtml(category.name)}</button>`)
  ].join("");

  menu.forEach((category) => {
    category.products.forEach((product) => productsById.set(product.id, { ...product, category: category.name }));
  });

  catalogGrid.innerHTML = menu.map((category) => `
    <section class="catalog-category" data-category="${escapeHtml(category.id)}" aria-labelledby="category-${escapeHtml(category.id)}">
      <div class="catalog-category-heading">
        <h3 id="category-${escapeHtml(category.id)}">${escapeHtml(category.name)}</h3>
        ${category.description ? `<p>${escapeHtml(category.description)}</p>` : ""}
      </div>
      <div class="product-grid">
        ${category.products.map((product) => `
          <article class="product-card">
            <div class="product-card-heading">
              <h4>${escapeHtml(product.name)}</h4>
              <span class="product-badges">
                ${product.vegetarian ? '<span class="product-badge">Vegetarian</span>' : ""}
                ${product.spicy ? '<span class="product-badge product-badge-spicy">Spicy</span>' : ""}
              </span>
            </div>
            ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ""}
            <div class="product-controls">
              <label class="visually-hidden" for="variant-${escapeHtml(product.id)}">Portion for ${escapeHtml(product.name)}</label>
              <select id="variant-${escapeHtml(product.id)}" class="product-variant" data-variant="${escapeHtml(product.id)}">
                ${product.variants.map((variant, index) => `<option value="${index}">${escapeHtml(variant.label)} — ${money.format(variant.price)}</option>`).join("")}
              </select>
              <button class="add-to-cart" type="button" data-add="${escapeHtml(product.id)}">Add</button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");

  menuFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    const selectedCategory = button.dataset.filter;
    menuFilters.querySelectorAll(".filter-button").forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle("is-active", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    });
    catalogGrid.querySelectorAll(".catalog-category").forEach((section) => {
      section.hidden = selectedCategory !== "all" && section.dataset.category !== selectedCategory;
    });
  });
}

function renderCart() {
  let quantity = 0;
  let subtotal = 0;
  const lines = [];
  cart.forEach((entry, key) => {
    const product = productsById.get(entry.productId);
    if (!product) return;
    const variant = product.variants[entry.variantIndex];
    if (!variant) return;
    const lineTotal = variant.price * entry.quantity;
    quantity += entry.quantity;
    subtotal += lineTotal;
    lines.push(`
      <li class="cart-item">
        <div class="cart-item-copy">
          <strong>${escapeHtml(product.name)} <span>${escapeHtml(variant.label)}</span></strong>
          <span>${money.format(variant.price)} each · ${money.format(lineTotal)}</span>
        </div>
        <div class="cart-item-actions" aria-label="Quantity controls for ${escapeHtml(product.name)}">
          <button type="button" data-cart-action="decrease" data-cart-key="${escapeHtml(key)}" aria-label="Decrease ${escapeHtml(product.name)} quantity">−</button>
          <span>${entry.quantity}</span>
          <button type="button" data-cart-action="increase" data-cart-key="${escapeHtml(key)}" aria-label="Increase ${escapeHtml(product.name)} quantity"${entry.quantity >= MAX_ITEM_QUANTITY ? " disabled" : ""}>+</button>
          <button class="cart-remove" type="button" data-cart-action="remove" data-cart-key="${escapeHtml(key)}" aria-label="Remove ${escapeHtml(product.name)}">Remove</button>
        </div>
      </li>
    `);
  });

  cartItems.innerHTML = lines.join("");
  cartEmpty.hidden = quantity > 0;
  cartCount.textContent = String(quantity);
  cartCount.setAttribute("aria-label", `${quantity} ${quantity === 1 ? "item" : "items"} in basket`);
  cartTotal.textContent = money.format(subtotal);
  placeOrder.disabled = quantity === 0;
  checkoutRequestId = crypto.randomUUID();
}

catalogGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const productId = button.dataset.add;
  const select = catalogGrid.querySelector(`[data-variant="${CSS.escape(productId)}"]`);
  const variantIndex = Number(select.value);
  const product = productsById.get(productId);
  if (!product || !product.variants[variantIndex]) return;
  const key = `${productId}:${variantIndex}`;
  const existing = cart.get(key);
  if (existing && existing.quantity >= MAX_ITEM_QUANTITY) {
    setOrderStatus(`Maximum quantity for ${product.name} is ${MAX_ITEM_QUANTITY}.`, true);
    return;
  }
  if (!existing && cart.size >= MAX_ORDER_LINES) {
    setOrderStatus(`An order can include up to ${MAX_ORDER_LINES} different menu options.`, true);
    return;
  }
  cart.set(key, {
    productId,
    variantIndex,
    quantity: (existing?.quantity || 0) + 1
  });
  renderCart();
  orderStatus.textContent = `${product.name} added to your basket.`;
  orderStatus.classList.remove("is-error");
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const entry = cart.get(button.dataset.cartKey);
  if (!entry) return;
  if (button.dataset.cartAction === "remove" || (button.dataset.cartAction === "decrease" && entry.quantity === 1)) {
    cart.delete(button.dataset.cartKey);
  } else if (button.dataset.cartAction === "increase" && entry.quantity < MAX_ITEM_QUANTITY) {
    entry.quantity += 1;
  } else if (button.dataset.cartAction === "decrease") {
    entry.quantity -= 1;
  }
  renderCart();
});

function setOrderStatus(message, isError = false) {
  orderStatus.replaceChildren(document.createTextNode(message));
  orderStatus.classList.toggle("is-error", isError);
}

function openWhatsApp(message, statusElement, successMessage) {
  const url = `https://wa.me/${ORDER_WHATSAPP}?text=${encodeURIComponent(message)}`;
  const whatsappWindow = window.open(url, "_blank");
  if (whatsappWindow) {
    whatsappWindow.opener = null;
    statusElement.textContent = successMessage;
    return;
  }
  statusElement.replaceChildren(
    document.createTextNode("Your message is ready. "),
    Object.assign(document.createElement("a"), {
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: "Open WhatsApp"
    }),
    document.createTextNode(" to review and send it.")
  );
}

function updateFulfillmentFields() {
  const fulfillment = orderForm.elements.fulfillment.value;
  const isDelivery = fulfillment === "delivery";
  deliveryAddressRow.hidden = !isDelivery;
  deliveryAddress.required = isDelivery;
  const cashOption = paymentMethod.querySelector('option[value="cash"]');
  cashOption.disabled = isDelivery;
  if (isDelivery && paymentMethod.value === "cash") paymentMethod.value = "yoco";
}

function updateOrderButton() {
  placeOrder.childNodes[0].textContent = paymentMethod.value === "yoco"
    ? "Pay securely with Yoco "
    : "Continue to WhatsApp ";
}

orderForm.addEventListener("change", (event) => {
  if (event.target.name === "fulfillment") updateFulfillmentFields();
  updateOrderButton();
  checkoutRequestId = crypto.randomUUID();
  setOrderStatus("");
});
orderForm.addEventListener("input", () => {
  checkoutRequestId = crypto.randomUUID();
  setOrderStatus("");
});
orderForm.addEventListener("invalid", () => {
  setOrderStatus("Please complete the required fields with valid details.", true);
}, true);

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!cart.size) {
    setOrderStatus("Add at least one menu item before continuing.", true);
    return;
  }
  const formData = new FormData(orderForm);
  const fulfillment = formData.get("fulfillment");
  const delivery = fulfillment === "delivery";
  if (delivery && !String(formData.get("deliveryAddress") || "").trim()) {
    setOrderStatus("Please enter your delivery address in Mamelodi.", true);
    deliveryAddress.focus();
    return;
  }
  const phone = String(formData.get("phone") || "").trim();
  if (!/^[+()\d\s-]{7,20}$/.test(phone)) {
    setOrderStatus("Please enter a valid phone number so we can confirm your order.", true);
    document.querySelector("#order-phone").focus();
    return;
  }

  if (formData.get("paymentMethod") === "yoco") {
    setOrderStatus("Preparing your secure Yoco checkout…");
    placeOrder.disabled = true;
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": checkoutRequestId
        },
        body: JSON.stringify({
          name: String(formData.get("name")).trim(),
          phone,
          fulfillment,
          deliveryAddress: String(formData.get("deliveryAddress") || "").trim(),
          notes: String(formData.get("notes") || "").trim(),
          privacyConsent: formData.get("privacyConsent") === "yes",
          items: [...cart.values()].map(({ productId, variantIndex, quantity }) => ({
            productId,
            variantIndex,
            quantity
          }))
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Secure checkout could not be started. Please try again or contact us.");
      }
      const redirectUrl = new URL(result.redirectUrl);
      if (redirectUrl.protocol !== "https:" || redirectUrl.hostname !== "c.yoco.com") {
        throw new Error("The payment provider returned an unexpected checkout address. Please contact us.");
      }
      window.location.assign(redirectUrl.href);
    } catch (error) {
      setOrderStatus(error.message || "Secure checkout could not be started. Please try again or contact us.", true);
      placeOrder.disabled = cart.size === 0;
    }
    return;
  }

  const orderLines = [];
  let subtotal = 0;
  cart.forEach((entry) => {
    const product = productsById.get(entry.productId);
    const variant = product.variants[entry.variantIndex];
    const total = variant.price * entry.quantity;
    subtotal += total;
    orderLines.push(`• ${product.name} (${variant.label}) × ${entry.quantity} — ${money.format(total)}`);
  });
  const paymentLabels = {
    eft: "EFT (bank details to be confirmed after order confirmation)",
    cash: "Cash on collection"
  };
  const message = [
    "Hello Chopstick SA! I would like to request an order:",
    "",
    ...orderLines,
    "",
    `Food subtotal: ${money.format(subtotal)}`,
    `Name: ${formData.get("name")}`,
    `Phone: ${phone}`,
    `Fulfilment: ${delivery ? "Uber Courier delivery" : "Collection"}`,
    ...(delivery ? [`Delivery address: ${String(formData.get("deliveryAddress")).trim()}`, "Courier is arranged and paid separately by me."] : ["Collection: 103 Phedisana Street, Mamelodi"]),
    `Payment preference: ${paymentLabels[formData.get("paymentMethod")] || "Please confirm with me"}`,
    `Notes: ${String(formData.get("notes") || "").trim() || "None"}`,
    "",
    "Please confirm availability, total, and next steps. I understand this is a request, not a confirmed or paid order."
  ].join("\n");
  openWhatsApp(message, orderStatus, "WhatsApp opened with your order draft. Review it and press Send to contact Chopstick SA.");
});

const enquiryForm = document.querySelector("#enquiry-form");
const formStatus = document.querySelector("#form-status");

enquiryForm.addEventListener("invalid", () => {
  formStatus.textContent = "Please complete the required fields with a valid email address.";
  formStatus.classList.add("is-error");
}, true);
enquiryForm.addEventListener("input", () => {
  formStatus.textContent = "";
  formStatus.classList.remove("is-error");
});
enquiryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(enquiryForm);
  const message = [
    "Hello Chopstick SA! I would like to enquire about an event.",
    "",
    `Name: ${formData.get("name")}`,
    `Email: ${formData.get("email")}`,
    `Enquiry type: ${enquiryForm.querySelector("#event-type").selectedOptions[0].textContent}`,
    `Details: ${String(formData.get("message")).trim()}`
  ].join("\n");
  openWhatsApp(message, formStatus, "WhatsApp opened with your event enquiry draft. Review it and press Send to contact Chopstick SA.");
  formStatus.classList.remove("is-error");
});

renderMenu();
renderCart();
updateFulfillmentFields();
updateOrderButton();
document.querySelector("#current-year").textContent = new Date().getFullYear();
