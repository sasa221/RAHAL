globalThis.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = typeof payload.title === "string" ? payload.title : "RAHAL";
  const body = typeof payload.body === "string" ? payload.body : "";
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/";
  event.waitUntil(
    globalThis.registration.showNotification(title, {
      body,
      icon: "/images/rahal-logo.png",
      badge: "/images/rahal-logo.png",
      data: { url },
      tag: `rahal-${url}`,
    }),
  );
});

globalThis.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", globalThis.location.origin).href;
  event.waitUntil(
    globalThis.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === target);
      return existing ? existing.focus() : globalThis.clients.openWindow(target);
    }),
  );
});
