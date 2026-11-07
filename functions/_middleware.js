// Cloudflare Pages Functions 中间件：给「私密文章」做 IP 白名单 + 密码兜底。
//
// 运行位置：Cloudflare 边缘。Pages 在返回静态文件（public/）之前先跑这个函数，
// 因此私密页面的 HTML、图片、RSS 都在这里被拦下，不会被直接拿走。
//
// 两个环境变量（Cloudflare Pages → Settings → Environment variables，Production 与 Preview 都加）：
//   PRIVATE_ALLOW_IPS   允许访问的 IP/CIDR，逗号分隔。例：203.0.113.7,198.51.100.0/24,2408:8207::/32
//   PRIVATE_PATHS       受保护路径前缀，逗号分隔，默认 /posts/private
//   PRIVATE_USER        基本认证用户名（可选，默认 admin）
//   PRIVATE_PASSWORD    基本认证密码（可选）。设了它，IP 不在白名单时还能凭密码进入。
//
// 安全默认：没配 PRIVATE_ALLOW_IPS 也没配 PRIVATE_PASSWORD 时，私密路径一律 404（失败即关闭）。

const DEFAULT_PRIVATE_PREFIXES = ["/posts/private"];

// ---------- 小工具 ----------

function toList(value) {
  return String(value == null ? "" : value)
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function withTrailingSlash(path) {
  return path.endsWith("/") ? path : path + "/";
}

// 归一化路径：解码百分号编码、反斜杠改斜杠、折叠重复斜杠、转小写，
// 避免 /posts/%70rivate/ 或 /posts//private/ 这类写法绕过前缀判断。
function normalizePath(pathname) {
  let path = String(pathname == null ? "/" : pathname);
  for (let round = 0; round < 2; round += 1) {
    try {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    } catch {
      break;
    }
  }
  return path.replace(/\\/g, "/").replace(/\/{2,}/g, "/").toLowerCase();
}

function isPrivatePath(pathname, prefixes) {
  const path = normalizePath(pathname);
  for (const raw of prefixes) {
    const prefix = raw.trim().toLowerCase();
    if (!prefix.startsWith("/")) continue;
    const base = prefix.replace(/\/+$/, "") || "/";
    if (path === base || path.startsWith(withTrailingSlash(base))) return true;
  }
  return false;
}

// ---------- IP / CIDR 解析（IPv4 + IPv6，BigInt 比较）----------

function parseIPv4(text) {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = (value << 8n) | BigInt(n);
  }
  return value;
}

function parseIPv6(text) {
  let s = text.toLowerCase();
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);

  // 末尾内嵌 IPv4（::ffff:192.0.2.1）先转成两组十六进制
  if (s.includes(".")) {
    const lastColon = s.lastIndexOf(":");
    if (lastColon === -1) return null;
    const v4 = parseIPv4(s.slice(lastColon + 1));
    if (v4 === null) return null;
    s =
      s.slice(0, lastColon + 1) +
      ((v4 >> 16n) & 0xffffn).toString(16) +
      ":" +
      (v4 & 0xffffn).toString(16);
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];

  const toGroup = (g) => {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    return parseInt(g, 16);
  };
  const headGroups = head.map(toGroup);
  const tailGroups = tail.map(toGroup);
  if (headGroups.includes(null) || tailGroups.includes(null)) return null;

  const missing = 8 - headGroups.length - tailGroups.length;
  if (halves.length === 2) {
    if (missing < 0) return null;
  } else if (missing !== 0) {
    return null;
  }
  const groups = [...headGroups, ...new Array(missing).fill(0), ...tailGroups];
  if (groups.length !== 8) return null;

  let value = 0n;
  for (const g of groups) value = (value << 16n) | BigInt(g);
  return value;
}

// 返回 { family, value }；IPv4-mapped IPv6（::ffff:a.b.c.d）归一化成 IPv4
function parseAddress(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  if (raw.includes(":")) {
    const value = parseIPv6(raw);
    if (value === null) return null;
    // ::ffff:a.b.c.d 的前 96 位是 0…0ffff，后 32 位才是真正的 IPv4
    if ((value >> 32n) === 0xffffn) {
      return { family: 4, value: value & 0xffffffffn };
    }
    return { family: 6, value };
  }
  const value = parseIPv4(raw);
  return value === null ? null : { family: 4, value };
}

function parseRule(entry) {
  const [ipPart, bitsPart] = String(entry).split("/");
  const address = parseAddress(ipPart);
  if (!address) return null;
  const totalBits = address.family === 4 ? 32 : 128;
  const bits = bitsPart === undefined || bitsPart === "" ? totalBits : Number(bitsPart);
  if (!Number.isInteger(bits) || bits < 0 || bits > totalBits) return null;
  const shift = BigInt(totalBits - bits);
  const mask = shift === 0n ? (1n << BigInt(totalBits)) - 1n : ((1n << BigInt(totalBits)) - 1n) ^ ((1n << shift) - 1n);
  return { family: address.family, base: address.value & mask, mask };
}

function isIpAllowed(request, env) {
  const rules = toList(env && env.PRIVATE_ALLOW_IPS)
    .map(parseRule)
    .filter(Boolean);
  if (rules.length === 0) return false;

  // 在 Cloudflare 网络上，cf-connecting-ip 由边缘写入并覆盖客户端自带值，不可伪造。
  const address = parseAddress(request.headers.get("cf-connecting-ip"));
  if (!address) return false;
  return rules.some((rule) => rule.family === address.family && (address.value & rule.mask) === rule.base);
}

// ---------- 可选的基本认证（给动态 IP / 临时分享用）----------

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function hasValidBasicAuth(request, env) {
  const password = env && env.PRIVATE_PASSWORD;
  if (!password) return false;
  const expectedUser = (env && env.PRIVATE_USER) || "admin";

  const header = request.headers.get("authorization") || "";
  if (!/^basic\s/i.test(header)) return false;
  let decoded = "";
  try {
    decoded = atob(header.replace(/^basic\s+/i, "").trim());
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const user = decoded.slice(0, separator);
  const pass = decoded.slice(separator + 1);
  return constantTimeEqual(user, expectedUser) && constantTimeEqual(pass, password);
}

// ---------- 响应处理 ----------

function sealResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const NOT_FOUND_PAGE = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>404 页面不存在</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
       display:flex;min-height:100vh;align-items:center;justify-content:center;
       margin:0;background:#f6f7f9;color:#333}
  .box{max-width:32rem;padding:2rem;text-align:center;line-height:1.7}
  h1{font-size:3rem;margin:0 0 .5rem;color:#888}
  p{margin:.4rem 0;color:#666}
</style></head>
<body><div class="box">
  <h1>404</h1>
  <p>页面不存在。</p>
  <p>部分内容仅对指定网络开放，若你认为这是误判，请联系博主。</p>
  <p><a href="/">返回首页</a></p>
</div></body></html>`;

function notFoundResponse() {
  return new Response(NOT_FOUND_PAGE, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// ---------- 入口 ----------

export async function onRequest(context) {
  const { request, env, next } = context;

  let pathname = "/";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    pathname = "/";
  }

  const prefixes = toList(env && env.PRIVATE_PATHS);
  const effectivePrefixes = prefixes.length > 0 ? prefixes : DEFAULT_PRIVATE_PREFIXES;

  if (!isPrivatePath(pathname, effectivePrefixes)) return next();

  try {
    if (isIpAllowed(request, env) || hasValidBasicAuth(request, env)) {
      return sealResponse(await next());
    }
  } catch (error) {
    console.error("private gate error:", error && error.message);
  }

  console.warn("blocked private path", pathname, request.headers.get("cf-connecting-ip"));
  return notFoundResponse();
}
