const SB_URL = "https://tjkrgnznsspbpzgaskpk.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

const sbH = {
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

// ── Token validation ──────────────────────────────────────────────────────────

async function validateToken(token) {
  if (!token) return false;

  const r = await fetch(
    `${SB_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=expires_at`,
    { headers: sbH }
  );
  if (!r.ok) return false;

  const rows = await r.json();
  if (!rows.length) return false;

  const expiresAt = new Date(rows[0].expires_at);
  if (expiresAt < new Date()) {
    // Clean up expired token
    await fetch(`${SB_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}`, {
      method: "DELETE", headers: sbH,
    });
    return false;
  }

  return true;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function sbInsert(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST", headers: sbH, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbUpdate(table, id, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH", headers: sbH, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbDelete(table, id) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE", headers: sbH,
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbDeleteWhere(table, field, value) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${field}=eq.${value}`, {
    method: "DELETE", headers: sbH,
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbUpload(path, base64Data, mimeType) {
  const buffer = Buffer.from(base64Data, "base64");
  const r = await fetch(`${SB_URL}/storage/v1/object/vinyl-images/${path}`, {
    method: "POST",
    headers: {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": mimeType || "image/jpeg",
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!r.ok) throw new Error(await r.text());
  return `${SB_URL}/storage/v1/object/public/vinyl-images/${path}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!SB_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server misconfigured — SUPABASE_SERVICE_KEY missing" }),
    };
  }

  // Validate session token from Authorization header
  const authHeader = event.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const authorized = await validateToken(token);

  if (!authorized) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized — invalid or expired session" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { action } = payload;

  try {
    // ── INSERT new record ───────────────────────────────────────────────────
    if (action === "insert") {
      const { record, images } = payload;
      const [rec] = await sbInsert("records", record);

      if (images?.length && rec?.id) {
        for (const img of images) {
          const url = await sbUpload(
            `${rec.id}/${img.storageType}.${img.ext}`,
            img.base64,
            img.mimeType
          );
          await sbInsert("images", { record_id: rec.id, type: img.storageType, url });
        }
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: rec }),
      };
    }

    // ── UPDATE existing record ──────────────────────────────────────────────
    if (action === "update") {
      const { id, record, images, existingImages } = payload;
      await sbUpdate("records", id, record);

      if (images?.length) {
        for (const img of images) {
          const url = await sbUpload(
            `${id}/${img.storageType}.${img.ext}`,
            img.base64,
            img.mimeType
          );
          const existing = existingImages?.find(i => i.type === img.storageType);
          if (existing) {
            await sbUpdate("images", existing.id, { url });
          } else {
            await sbInsert("images", { record_id: id, type: img.storageType, url });
          }
        }
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true }),
      };
    }

    // ── DELETE record ───────────────────────────────────────────────────────
    if (action === "delete") {
      const { id } = payload;
      await sbDeleteWhere("images", "record_id", id);
      await sbDelete("records", id);

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true }),
      };
    }

    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Unknown action: ${action}` }),
    };

  } catch (err) {
    console.error("record-write error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
