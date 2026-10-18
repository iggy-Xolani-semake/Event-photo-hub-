import { createServer } from "node:http";

const port = Number(process.env.E2E_BACKEND_PORT ?? 3333);
const eventId = "123e4567-e89b-42d3-a456-426614174000";
const packageId = "123e4567-e89b-42d3-b456-426614174001";
const paymentId = "123e4567-e89b-42d3-b456-426614174002";
const photoId = "123e4567-e89b-42d3-b456-426614174003";
const guestToken = "e2e-guest-session-token";
const eventCode = "SMK4827Q";
const objects = new Map();

const event = {
  id: eventId,
  event_code: eventCode,
  event_name: "E2E Test Event",
  event_date: null,
  client_id: "123e4567-e89b-42d3-a456-426614174004",
  collaborator_id: null,
  status: "active",
  visibility: "shared",
  upload_limit: 500,
  max_file_size_bytes: 15 * 1024 * 1024,
  max_files_per_upload: 10,
  guest_photo_limit: 10,
  photo_count: 0,
  storage_used_bytes: 0,
  brand_logo_url: null,
  brand_company_name: null,
  brand_primary_color: null,
  created_by: "123e4567-e89b-42d3-a456-426614174005",
  created_at: new Date().toISOString(),
  closed_at: null,
  package_id: packageId,
  download_unlocked_at: null,
  uploads_close_at: null,
  gallery_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
};

const packageRow = {
  id: packageId,
  code: "standard",
  name: "Standard",
  photo_limit: 500,
  max_file_size_bytes: 15 * 1024 * 1024,
  max_files_per_upload: 10,
  download_limit: 500,
  guest_photo_limit: 10,
  retention_days: 30,
  price_cents: 5000,
  currency: "ZAR",
  is_active: true,
  sort_order: 1,
  created_at: new Date().toISOString(),
};

const authenticatedUser = {
  id: "123e4567-e89b-42d3-a456-426614174006",
  aud: "authenticated",
  role: "authenticated",
  email: "e2e@example.test",
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
};

function sendJson(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const path = url.pathname;

  if (request.method === "OPTIONS" && path.startsWith("/event-photo-hub/")) {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PUT, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    });
    response.end();
    return;
  }

  if (path === "/health") {
    response.writeHead(200);
    response.end("ok");
    return;
  }

  if (path === "/auth/v1/user") {
    if (request.headers.authorization?.startsWith("Bearer ")) {
      sendJson(response, 200, authenticatedUser);
    } else {
      sendJson(response, 401, { message: "No session" });
    }
    return;
  }

  if (path === "/rest/v1/rpc/get_event_for_upload" && request.method === "POST") {
    const body = JSON.parse((await readBody(request)).toString("utf8") || "{}");
    sendJson(
      response,
      200,
      body.p_event_code === eventCode
        ? [
            {
              event_id: eventId,
              event_name: event.event_name,
              event_date: null,
              status: "active",
              can_upload: true,
              reason: null,
              max_file_size_bytes: event.max_file_size_bytes,
              max_files_per_upload: event.max_files_per_upload,
              brand_logo_url: null,
              brand_company_name: null,
              brand_primary_color: null,
            },
          ]
        : []
    );
    return;
  }

  if (path === "/rest/v1/rpc/register_guest_session" && request.method === "POST") {
    sendJson(response, 200, [{ session_token: guestToken, upload_count: 0, guest_photo_limit: 10 }]);
    return;
  }

  if (path === "/rest/v1/rpc/consume_rate_limit" && request.method === "POST") {
    sendJson(response, 200, [{ allowed: true, remaining: 29 }]);
    return;
  }

  if (path === "/rest/v1/rpc/insert_guest_photo" && request.method === "POST") {
    sendJson(response, 200, [{ photo_id: photoId }]);
    return;
  }

  if (path === "/rest/v1/guest_sessions" && request.method === "GET") {
    sendJson(response, 200, {
      id: "123e4567-e89b-42d3-a456-426614174007",
      upload_count: 0,
      guest_photo_limit: 10,
    });
    return;
  }

  if (path === "/rest/v1/events" && request.method === "GET") {
    const selection = url.searchParams.get("select");
    if (selection?.includes("photo_count")) {
      if (selection.startsWith("event_code")) {
        sendJson(response, 200, [event]);
      } else {
        sendJson(response, 200, {
          photo_count: 0,
          upload_limit: event.upload_limit,
          guest_photo_limit: event.guest_photo_limit,
          gallery_expires_at: event.gallery_expires_at,
        });
      }
    } else if (selection?.includes("visibility")) {
      sendJson(response, 200, {
        id: event.id,
        visibility: event.visibility,
        gallery_expires_at: event.gallery_expires_at,
      });
    } else {
      sendJson(response, 200, event);
    }
    return;
  }

  if (path === "/rest/v1/clients" && request.method === "GET") {
    sendJson(response, 200, { name: "E2E Host" });
    return;
  }

  if (path === "/rest/v1/photos" && request.method === "GET") {
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Range": "*/0",
    });
    response.end("[]");
    return;
  }

  if (path === "/rest/v1/packages" && request.method === "GET") {
    sendJson(response, 200, packageRow);
    return;
  }

  if (path === "/rest/v1/payments" && request.method === "POST") {
    await readBody(request);
    sendJson(response, 201, {
      id: paymentId,
      event_id: eventId,
      package_id: packageId,
      amount_cents: packageRow.price_cents,
      currency: "ZAR",
      provider: "payfast",
      provider_reference: null,
      status: "pending",
      created_at: new Date().toISOString(),
      paid_at: null,
      metadata: {},
    });
    return;
  }

  if (path.startsWith("/event-photo-hub/")) {
    const key = decodeURIComponent(path.slice("/event-photo-hub/".length));
    if (request.method === "PUT") {
      const body = await readBody(request);
      objects.set(key, {
        size: body.length,
        contentType: request.headers["content-type"] ?? null,
      });
      response.writeHead(200, {
        ETag: '"e2e-upload"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "ETag",
      });
      response.end();
      return;
    }
    if (request.method === "HEAD") {
      const metadata = objects.get(key);
      if (!metadata) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, {
        "Content-Length": String(metadata.size),
        "Content-Type": metadata.contentType ?? "application/octet-stream",
      });
      response.end();
      return;
    }
  }

  console.warn(`Unhandled E2E mock request: ${request.method} ${path}`);
  sendJson(response, 404, { message: `Unhandled mock request: ${request.method} ${path}` });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`E2E mock services listening on ${port}`);
});
