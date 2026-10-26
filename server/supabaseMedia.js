import { createClient } from "@supabase/supabase-js";

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
