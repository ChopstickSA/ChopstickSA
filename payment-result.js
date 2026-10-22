const paymentTitle = document.querySelector("#payment-title");
const paymentMessage = document.querySelector("#payment-message");
const paymentOrder = document.querySelector("#payment-order");
const paymentId = new URLSearchParams(window.location.search).get("orderId");
const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

document.querySelector("#current-year").textContent = new Date().getFullYear();

if (!paymentId || !orderIdPattern.test(paymentId)) {
  paymentTitle.textContent = "We couldn’t find that order.";
  paymentMessage.textContent = "No payment status is available for this link. Please contact Chopstick SA if you completed a payment.";
} else {
  paymentOrder.textContent = `Order reference: ${paymentId.slice(0, 8).toUpperCase()}`;
  checkPaymentStatus();
}

async function checkPaymentStatus() {
  const returnResult = new URLSearchParams(window.location.search).get("result");
  if (returnResult === "cancelled" || returnResult === "failed") {
    paymentTitle.textContent = "Checking your order status…";
    paymentMessage.textContent = "The checkout did not return a success confirmation. We’ll check the signed payment notification before showing a final status.";
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(paymentId)}`, {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("Order status is temporarily unavailable.");
      const order = await response.json();
      if (order.status === "paid") {
        paymentTitle.textContent = "Payment confirmed. Thank you!";
        paymentMessage.textContent = "Yoco has confirmed your payment with Chopstick SA. We’ll use the details you provided to coordinate your order. Delivery courier charges are arranged and paid separately.";
        return;
      }
      if (order.status === "payment_failed") {
        paymentTitle.textContent = "Payment was not confirmed.";
        paymentMessage.textContent = "If your account shows a debit, contact us before trying another payment so we can check it for you.";
        return;
      }
      if (order.status === "review_required") {
        paymentTitle.textContent = "We’re checking this payment.";
        paymentMessage.textContent = "Please don’t make another payment. Contact Chopstick SA with your order reference so we can review it.";
        return;
      }
      if (order.status === "checkout_failed") {
        paymentTitle.textContent = "Checkout could not be completed.";
        paymentMessage.textContent = "Please contact Chopstick SA with your order reference before trying again.";
        return;
      }
      paymentTitle.textContent = "Waiting for payment confirmation…";
      paymentMessage.textContent = `The payment status is still pending${Number.isSafeInteger(order.amountCents) ? ` for ${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(order.amountCents / 100)}` : ""}. Please don’t pay a second time.`;
    } catch (error) {
      paymentTitle.textContent = "We couldn’t check the payment yet.";
      paymentMessage.textContent = `${error.message} Please try refreshing this page in a moment, or contact us if your account shows a debit.`;
      return;
    }
    if (attempt < 9) await new Promise((resolve) => window.setTimeout(resolve, 3000));
  }
}
