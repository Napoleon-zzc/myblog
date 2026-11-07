+++
title = "私密文章"
date = 2026-01-01T00:00:00+08:00
# 这一节整体不进任何公开列表、RSS、sitemap，但页面本身照常生成，
# 访问时由 functions/_middleware.js 按 IP / 密码拦截。
build = { list = "never", render = "always" }
cascade = { build = { list = "never", render = "always" } }
+++

这里的文章只对指定 IP（或持有密码的人）开放。
