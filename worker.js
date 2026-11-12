const ALLOWED_ORIGIN = "https://kingalikid00-sketch.github.io";
const PRICE_MINOR = 9900;
const CURRENCY = "USD";

function response(data, status = 200, origin = ALLOWED_ORIGIN) {
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin === ALLOWED_ORIGIN ? origin : "null",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400"
        }
      });
    }

    if (origin && origin !== ALLOWED_ORIGIN) {
      return response({ error: "Origin not allowed." }, 403, "null");
    }

    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return response({
        ok: true,
        service: "walker-family-orders",
        databaseConfigured: Boolean(env.DB),
        paymentProvider: "not connected",
        currency: CURRENCY
      });
    }

    // Save a customer's unpaid song request. Payment is added separately
    // after the chosen payment provider has been configured.
    if (url.pathname === "/api/orders" && request.method === "POST") {
      if (!env.DB) {
        return response({ error: "The order database is not available right now. Please try again later." }, 503);
      }

      let input;
      try {
        input = await request.json();
      } catch {
        return response({ error: "Please check the form and try again." }, 400);
      }

      const customer = clean(input.customer, 100);
      const email = clean(input.email, 254).toLowerCase();
      const occasion = clean(input.occasion, 60);
      const style = clean(input.style, 60);
      const story = clean(input.story, 3000);

      if (!customer || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          !occasion || !style || story.length < 20) {
        return response({
          error: "Please complete every field and tell us at least 20 characters about the story."
        }, 400);
      }

      const reference = "WALKER-" + crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();

      try {
        await env.DB.prepare(
          "INSERT INTO orders (reference, customer_name, email, occasion, musical_style, story, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))"
        ).bind(reference, customer, email, occasion, style, story, PRICE_MINOR, CURRENCY).run();
      } catch {
        return response({ error: "We could not save your request securely. Please try again." }, 500);
      }

      return response({
        ok: true,
        reference,
        status: "pending",
        paymentRequired: true,
        message: "Your song request has been saved. Payment is not connected yet, so your order is not confirmed."
      }, 201);
    }

    return response({ error: "Not found." }, 404);
  }
};
