import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";

let clientState;

export function getSupabaseMediaClient() {
  if (clientState !== undefined) return clientState;

  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SECRET_KEY || "").trim();
  clientState = url && key
    ? createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null;

  return clientState;
}

export function getSupabaseMediaBucket() {
  return String(process.env.SUPABASE_BUCKET || "app-images").trim() || "app-images";
}

// Cada campo multimedia conserva su fila y su archivo, también en los reintentos.
export async function replaceMediaAsset(client, bucket, { entityType, entityId, fieldName, buffer, contentType, originalName, createdBy }) {
  const fail = (code, message) => Object.assign(new Error(message), { status: 502, code });
  const found = await client.from("media_assets").select("*")
    .eq("entity_type", entityType).eq("entity_id", entityId).eq("field_name", fieldName)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (found.error) throw fail("MEDIA_RELATION_FAILED", found.error.message);
  const existing = found.data;
  // Un ID determinista evita dos filas si las primeras subidas son simultáneas.
  const hash = createHash("sha256").update(JSON.stringify([entityType, entityId, fieldName])).digest("hex");
  const id = existing?.id || `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const storageBucket = existing?.storage_bucket || bucket;
  const storagePath = existing?.storage_path || `${entityType.toLowerCase()}/${encodeURIComponent(entityId)}/${id}.${mediaFileExtension(contentType)}`;
  const upload = await client.storage.from(storageBucket).upload(storagePath, buffer, {
    contentType,
    cacheControl: "0",
    upsert: true,
  });
  if (upload.error) throw fail("MEDIA_UPLOAD_FAILED", upload.error.message);
  const url = client.storage.from(storageBucket).getPublicUrl(storagePath).data.publicUrl;
  const relation = await client.from("media_assets").upsert({
    id,
    entity_type: entityType,
    entity_id: entityId,
    field_name: fieldName,
    storage_bucket: storageBucket,
    storage_path: storagePath,
    // Cambia la URL visible para que el navegador solicite la imagen nueva.
    public_url: `${url}?v=${randomUUID()}`,
    mime_type: contentType,
    byte_size: buffer.length,
    original_name: originalName || existing?.original_name || null,
    created_by: existing?.created_by || createdBy || null,
    ...(existing?.created_at ? { created_at: existing.created_at } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" }).select("*").single();
  // No se borra el archivo al fallar la relación: puede ser la foto existente.
  if (relation.error) throw fail("MEDIA_RELATION_FAILED", relation.error.message);
  return relation.data;
}

export function parseDataUrl(value) {
  const match = String(value || "").match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) return null;

  return {
    contentType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64"),
  };
}

export function mediaFileExtension(contentType) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  return extensions[contentType] || "bin";
}
