// 本地自测：node tests/private-gate.test.mjs
// 用 data: URL 动态导入 functions/_middleware.js（Node 默认把无 type 的 .js 当 CJS，
// 而 Cloudflare Pages 把它当 ESM，所以这里绕一下，避免为测试去改部署配置）。

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "functions", "_middleware.js"), "utf8");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(source, "utf8").toString("base64");
const { onRequest } = await import(moduleUrl);

function makeContext({ path = "/", ip = "", auth = "", env = {} } = {}) {
  const headers = new Headers();
  if (ip) headers.set("cf-connecting-ip", ip);
  if (auth) headers.set("authorization", auth);
  const request = new Request("https://blog.example.com" + path, { headers });
  let nextCalled = false;
  return {
    context: {
      request,
      env,
      next: () => {
        nextCalled = true;
        return new Response("STATIC-OK", { status: 200, headers: { "content-type": "text/html" } });
      },
    },
    wasNextCalled: () => nextCalled,
  };
}

const basic = (user, pass) => "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");

const cases = [];
function test(name, fn) {
  cases.push({ name, fn });
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const envIps = { PRIVATE_ALLOW_IPS: "203.0.113.7, 198.51.100.0/24, 2408:8207:abcd::/32" };

test("允许的 IP 命中单一地址 → 放行且加 no-store", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/posts/private/hello/", ip: "203.0.113.7", env: envIps });
  const res = await onRequest(context);
  assert(wasNextCalled(), "next() 应被调用");
  assert(res.status === 200, "状态应为 200");
  assert(res.headers.get("cache-control").includes("no-store"), "应设置 no-store");
  assert(res.headers.get("x-robots-tag").includes("noindex"), "应设置 noindex");
});

test("CIDR 命中的 IPv4 → 放行", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/posts/private/a/", ip: "198.51.100.42", env: envIps });
  await onRequest(context);
  assert(wasNextCalled(), "next() 应被调用");
});

test("CIDR 命中的 IPv6 → 放行", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/posts/private/b/", ip: "2408:8207:abcd:1:2:3:4:5", env: envIps });
  await onRequest(context);
  assert(wasNextCalled(), "next() 应被调用");
});

test("IPv4-mapped IPv6 能匹配 IPv4 规则", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/posts/private/c/", ip: "::ffff:203.0.113.7", env: envIps });
  await onRequest(context);
  assert(wasNextCalled(), "next() 应被调用");
});

test("未授权 IP 访问私密路径 → 404 且不碰静态资源", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/posts/private/hello/", ip: "1.2.3.4", env: envIps });
  const res = await onRequest(context);
  assert(!wasNextCalled(), "不应调用 next()");
  assert(res.status === 404, "状态应为 404");
});

test("未授权 IP 访问公开路径 → 正常放行", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/posts/hello/", ip: "1.2.3.4", env: envIps });
  const res = await onRequest(context);
  assert(wasNextCalled(), "next() 应被调用");
  assert(res.status === 200, "状态应为 200");
});

test("前缀边界：/posts/privateevil 不算私密", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/posts/privateevil/", ip: "1.2.3.4", env: envIps });
  await onRequest(context);
  assert(wasNextCalled(), "next() 应被调用（不是私密前缀）");
});

test("大小写混写仍按私密处理", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/Posts/PRIVATE/x/", ip: "1.2.3.4", env: envIps });
  const res = await onRequest(context);
  assert(!wasNextCalled(), "不应调用 next()");
  assert(res.status === 404, "状态应为 404");
});

test("未配置任何白名单 → 一律 404（失败即关闭）", async () => {
  const { context, wasNextCalled } = makeContext({ path: "/posts/private/hello/", ip: "203.0.113.7", env: {} });
  const res = await onRequest(context);
  assert(!wasNextCalled(), "不应调用 next()");
  assert(res.status === 404, "状态应为 404");
});

test("密码兜底：正确凭据放行，错误凭据 404", async () => {
  const env = { PRIVATE_ALLOW_IPS: "203.0.113.7", PRIVATE_USER: "zzc", PRIVATE_PASSWORD: "s3cret" };

  const good = makeContext({ path: "/posts/private/x/", ip: "1.2.3.4", auth: basic("zzc", "s3cret"), env });
  assert((await onRequest(good.context)).status === 200, "正确凭据应放行");

  const bad = makeContext({ path: "/posts/private/x/", ip: "1.2.3.4", auth: basic("zzc", "wrong"), env });
  assert((await onRequest(bad.context)).status === 404, "错误凭据应 404");
});

test("自定义 PRIVATE_PATHS 生效", async () => {
  const env = { PRIVATE_ALLOW_IPS: "203.0.113.7", PRIVATE_PATHS: "/notes/secret, /drafts" };
  const blocked = makeContext({ path: "/drafts/post-1/", ip: "1.2.3.4", env });
  assert((await onRequest(blocked.context)).status === 404, "/drafts 应被保护");

  const allowed = makeContext({ path: "/drafts/post-1/", ip: "203.0.113.7", env });
  assert((await onRequest(allowed.context)).status === 200, "白名单 IP 应放行");
});

test("编码/重复斜杠等变体不能绕过", async () => {
  for (const variant of ["/posts/%70rivate/x/", "/posts//private/x/", "/posts/private%2Fx/", "/posts\\private\\x/"]) {
    const { context, wasNextCalled } = makeContext({ path: variant, ip: "1.2.3.4", env: envIps });
    const res = await onRequest(context);
    assert(!wasNextCalled(), `${variant} 不应调用 next()`);
    assert(res.status === 404, `${variant} 应 404`);
  }
});

let failed = 0;
for (const { name, fn } of cases) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${name}\n      ${error.message}`);
  }
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed === 0 ? 0 : 1);
