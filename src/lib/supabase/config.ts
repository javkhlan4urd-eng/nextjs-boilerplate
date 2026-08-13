// Публик Supabase тохиргоо. NEXT_PUBLIC_SUPABASE_* орчны хувьсагч зөв HTTP(S) URL
// байвал түүнийг ашиглана, эс бол (хоосон, тодорхойгүй, эсвэл буруу URL үед) доорх
// утгыг ашиглана — эдгээр нь зөвхөн публик "anon"/"publishable" түлхүүр тул
// клиент код дотор байх нь аюулгүй.
const FALLBACK_URL = "https://pyjjhfloputlysvlcsth.supabase.co";
const FALLBACK_ANON_KEY = "sb_publishable_qpjkY0JIVQVsl2DHU06QJQ_tF1DL76I";

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const SUPABASE_URL = isValidHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  ? process.env.NEXT_PUBLIC_SUPABASE_URL
  : FALLBACK_URL;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 10
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : FALLBACK_ANON_KEY;
