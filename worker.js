const ALLOWED_ORIGIN = "https://kingalikid00-sketch.github.io";
const PRICE_KOBO = 9900;
const CURRENCY = "USD";

function response(data, status=200, origin=ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store"
    }
  });
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

async function paystackRequest(path, secret, body) {
  const result = await fetch("https://api.paystack.co" + path, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: "Bearer " + secret,
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await result.json();
  return { ok: result.ok && data.status === true, data };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        "access-control-allow-origin": origin === ALLOWED_ORIGIN ? origin : "null",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400"
      }});
    }
    if (origin && origin !== ALLOWED_ORIGIN) return response({ error: "Origin not allowed." }, 403, "null");
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return response({ ok: true, service: "walker-family-orders", paymentsConfigured: Boolean(env.PAYSTACK_SECRET_KEY), currency: CURRENCY });
    }

    if (url.pathname === "/api/orders" && request.method === "POST") {
      if (!env.DB || !env.PAYSTACK_SECRET_KEY || !env.SITE_URL) {
        return response({ error: "Secure checkout is not configured yet. No order or payment was created." }, 503);
      }
      let input;
      try { input = await request.json(); } catch { return response({ error: "Please check the form and try again." }, 400); }
      const customer = clean(input.customer, 100);
      const email = clean(input.email, 254).toLowerCase();
      const occasion = clean(input.occasion, 60);
      const style = clean(input.style, 60);
      const story = clean(input.story, 3000);
      if (!customer || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !occasion || !style || story.length < 20) {
        return response({ error: "Please complete every field and tell us a little more about the story." }, 400);
      }
      const reference = "WALKER-" + crypto.randomUUID().replaceAll("-", "").toUpperCase();
      const callbackUrl = env.SITE_URL.replace(/\/$/, "") + "/?payment=return";
      try {
        await env.DB.prepare("INSERT INTO orders (reference, customer_name, email, occasion, musical_style, story, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))")
          .bind(reference, customer, email, occasion, style, story, PRICE_KOBO, CURRENCY).run();
      } catch {
        return response({ error: "We could not save your order securely. No checkout was opened." }, 500);
      }
      const init = await paystackRequest("/transaction/initialize", env.PAYSTACK_SECRET_KEY, {
        email,
        amount: PRICE_KOBO,
        currency: CURRENCY,
        reference,
        callback_url: callbackUrl,
        metadata: {
          order_reference: reference,
          customer_name: customer,
          occasion,
          musical_style: style,
          custom_fields: [{ display_name: "Order reference", variable_name: "order_reference", value: reference }]
        }
      });
      if (!init.ok || !init.data.data?.authorization_url) {
        await env.DB.prepare("UPDATE orders SET status='cancelled' WHERE reference=? AND status='pending'").bind(reference).run();
        return response({ error: "Paystack could not start checkout. Please try again later." }, 502);
      }
      return response({ ok: true, reference, checkoutUrl: init.data.data.authorization_url });
    }

    if (url.pathname === "/api/verify" && request.method === "GET") {
      if (!env.DB || !env.PAYSTACK_SECRET_KEY) return response({ error: "Payment verification is not configured." }, 503);
      const reference = clean(url.searchParams.get("reference"), 100);
      if (!reference) return response({ error: "Missing payment reference." }, 400);
      const existing = await env.DB.prepare("SELECT reference, status, email FROM orders WHERE reference=?").bind(reference).first();
      if (!existing) return response({ error: "We could not match this payment reference to an order." }, 404);
      if (existing.status === "paid" || existing.status === "in_progress" || existing.status === "delivered") {
        return response({ ok: true, reference, status: existing.status });
      }
      const verified = await paystackRequest("/transaction/verify/" + encodeURIComponent(reference), env.PAYSTACK_SECRET_KEY);
      if (!verified.ok || verified.data.data?.status !== "success" || verified.data.data?.currency !== CURRENCY || verified.data.data?.amount !== PRICE_KOBO || verified.data.data?.customer?.email?.toLowerCase() !== existing.email) {
        return response({ ok: false, status: "pending", message: "Payment is not confirmed yet. Please do not pay again until you check your receipt." }, 202);
      }
      await env.DB.prepare("UPDATE orders SET status='paid', paid_at=datetime('now') WHERE reference=? AND status='pending'").bind(reference).run();
      const order = await env.DB.prepare("SELECT reference, status FROM orders WHERE reference=?").bind(reference).first();
      return response({ ok: true, reference, status: order.status });
    }

    return response({ error: "Not found." }, 404);
  }
};
