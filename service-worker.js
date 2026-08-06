const CACHE="wordbook-pwa-push-v1";
const ASSETS=["./","./index.html","./manifest.webmanifest","./vocab_data.js","./firebase-config.js","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-180.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))))});

try{
 importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
 importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");
 importScripts("./firebase-config.js");
 if(self.FIREBASE_CONFIG&&!String(self.FIREBASE_CONFIG.apiKey||"").startsWith("PASTE_")){
  firebase.initializeApp(self.FIREBASE_CONFIG);
  firebase.messaging().onBackgroundMessage(payload=>{
   const n=payload.notification||{};
   self.registration.showNotification(n.title||"단어장 복습 시간",{body:n.body||"오늘 복습할 단어가 있습니다.",icon:"./icons/icon-192.png",badge:"./icons/icon-192.png",data:{url:"./"}});
  });
 }
}catch(err){console.warn("Firebase messaging unavailable",err)}
self.addEventListener("notificationclick",event=>{event.notification.close();event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const c of list)if("focus" in c)return c.focus();return clients.openWindow("./")}))});
