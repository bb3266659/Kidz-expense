"use strict";

// เปลี่ยนค่านี้ทุกครั้งที่อัปเดตไฟล์แอป
const VERSION = "v3-activity-details";

const CACHE_PREFIX =
  "kids-expense:" + encodeURIComponent(self.registration.scope) + ":";

const CACHE_NAME = CACHE_PREFIX + VERSION;

const absoluteURL = path =>
  new URL(path, self.registration.scope).href;

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
].map(absoluteURL);

const APP_FILE_SET = new Set(APP_FILES);
const INDEX_URL = absoluteURL("./index.html");

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // ทุกไฟล์ต้องโหลดสำเร็จ จึงจะติดตั้งเวอร์ชันใหม่
    await cache.addAll(
      APP_FILES.map(url => new Request(url, { cache: "reload" }))
    );

    // ไม่ใช้ skipWaiting เพื่อไม่เปลี่ยนเวอร์ชันกลางการใช้งาน
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();

    await Promise.all(
      names
        .filter(name =>
          name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
        )
        .map(name => caches.delete(name))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  if (
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  ) {
    return;
  }

  // เปิดหน้าแอปจากแคช เพื่อให้ใช้งานออฟไลน์ได้
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(INDEX_URL);

      if (cached) return cached;

      return fetch(request);
    })());

    return;
  }

  url.search = "";
  url.hash = "";

  if (!APP_FILE_SET.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url.href);

    if (cached) return cached;

    return fetch(request);
  })());
});
