---
title: 'Service Worker Explained'
excerpt: 'Websites are by default fragile and brittle, as they are always failing because of slow connections, server downtime and simply going offline. However, service workers might be a good way to help the web have an intuitive and empathetic experience for the user.'
date: '2022-03-23'
---

## Web Worker

A web worker is a JS file running in a background thread independent from the web page thread.

The worker thread and the web page thread can send data to each other with the `postMessage` api. The data is copied when being sent. Even objects and json are copied using the structured clone algorithm.

Usage:

```js
const worker = new Worker('/js/worker.js') // initialization
worker.addEventListener('message', onMessage) // listen to message event
worker.postMessage({start: true}) // send message to main thread
worker.terminate() // shutdown
```

## Service Worker

A service worker is a special type of web worker. It works like a proxy in browsers, and once it starts listening for outbound network requests, every single request that you send out will go through it and it will make requests and receive responses on behalf of the page. There is no way to tell a service worker to leave some requests out. So you have to make sure they get routed correctly.

One thing good to know is that your service worker is still bound by the rules of CORS(cross-origin resources sharing), which means the `<img>` tag loading some image off some CDN somewhere, which works completely normally on a normal page, won't work with a service worker setup unless the CDN publishes CORS headers.

But why?

Some use cases of service workers:

- Caching and background sync for offline (main use case)
- Rewriting a CDN that's down to another location and requesting from there without having to update the HTML.
- Programmatically creating artificial response data or using the cached response for offline requests.
- Programmatically preloading extra resources for a request for certain ones.
- Pushing + notifications (with permissions)

Usage:

To initialize a service worker:

```js
async function initServiceWorker() {
  // URL rewrite might be needed for sw scoping
  // register method is async
  swRegistration =
    await navigator.serviceWorker.register(
      '/sw.js',
      {
        updateViaCache: 'none',
      }
    )

  // default sw lifecycle: installed => waiting (optional) => active
  // only one sw can be active at the time
  // a sw is active until the user navigates to a new page or refreshes
  serviceWorker =
    swRegistration.installing ||
    swRegistration.waiting ||
    swRegistration.active

  // when a new worker takes control of the page
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    function onControllerChange() {
      serviceWorker =
        navigator.serviceWorker.controller
    }
  )
}
```

Note: To manually reinstall a service worker, first stop the worker if it's still running, unregister it, and fire a navigate event to load a new one.

To make a service worker listen to its lifecycle events:

```js
// won't run on restart
self.addEventListener('install', onInstall)
self.addEventListener('activate', onActivate)

// will run on restart
main().catch(console.error)

async function main() {
  console.log(
    `Service Worker (${version}) is starting...`
  )
}

async function onInstall() {
  console.log(
    `Service Worker (${version}) installed.`
  )
  // skip the waiting phase
  self.skipWaiting()
}

async function onActivate(event) {
  // if shutdown is necessary, don't do it until activation is handled
  event.waitUntil(handleActivation())
}

async function handleActivation() {
  // to fire the `controllerchange` event
  await clients.claim()
  console.log(
    `Service Worker (${version}) activated.`
  )
}
```

And you can send messages to your service worker as it's basically a web worker. You can send the message to the message channel port it's listening on, or let the service worker controlling the current page send the message. Here is an example of sending messages from the page to the service workers based on the the page status changes.

```js
var isOnline =
  'onLine' in navigator
    ? navigator.onLine
    : true
var isLoggedIn = /isLoggedIn=1/.test(
  document.cookie.toString() || ''
)

function sendStatusUpdate(target) {
  sendSWMessage(
    {statusUpdate: {isOnline, isLoggedIn}},
    target
  )
}

function onSWMessage(event) {
  var {data} = event
  // let the sw ask the page for request status change
  if (data.statusUpdate) {
    console.log(
      `Received status update request from service worker, responding...`
    )
    // send to the message channel port that the service worker is listening on
    sendStatusUpdate(
      event.ports && event.ports[0]
    )
  }
}

function sendSWMessage(message, target) {
  if (target) {
    target.postMessage(message)
  } else if (serviceWorker) {
    serviceWorker.postMessage(message)
  } else {
    navigator.serviceWorker.controller.postMessage(
      message
    )
  }
}

function ready() {
  // ...
  window.addEventListener(
    'online',
    function online() {
      offlineIcon.classList.add('hidden')
      isOnline = true
      sendStatusUpdate()
    }
  )

  window.addEventListener(
    'offline',
    function offline() {
      offlineIcon.classList.remove('hidden')
      isOnline = false
      sendStatusUpdate()
    }
  )

  async function initServiceWorker() {
    // ...
    serviceWorker =
      swRegistration.installing ||
      swRegistration.waiting ||
      swRegistration.active
    sendStatusUpdate(serviceWorker)

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      function onControllerChange() {
        serviceWorker =
          navigator.serviceWorker.controller
        sendStatusUpdate(serviceWorker)
      }
    )
  }
}
```

For the service workers side, they need to listen to the message event fired by all clients, listen on their message channel port for the client message and send messages through the channel to the clients on the other port of the channel, which looks like this:

```js
// ...
self.addEventListener('message', onMessage)

// ...

async function main() {
  await sendMessage({
    requestStatusUpdate: true,
  })
}

// ...

async function sendMessage(message) {
  var allClients = await clients.matchAll({
    includeUncontrolled: true,
  })
  return Promise.all(
    allClients.map(function clientMessage(
      client
    ) {
      var channel = new MessageChannel()
      channel.port1.onmessage = onMessage
      return client.postMessage(message, [
        channel.port2,
      ])
    })
  )
}

function onMessage({data}) {
  if (data.statusUpdate) {
    ;({isOnline, isLoggedIn} =
      data.statusUpdate)
    console.log(
      `Service Worker (${version}) status update... isOnline:${isOnline}, isLoggedIn:${isLoggedIn}`
    )
  }
}
```

That's basically how the clients and service workers talk to each other.

Next up, you can cache resources with service worker.

We are going to do it in a brutal-force way. First, get an id for each version of cached resources and list out the urls of all resources that need to be cached.

```js
var cacheName = `ramblings-${version}`

var urlsToCache = {
  // resources urls that need to be cached
  loggedOut: [
    // pages urls get rewrited by the server
    '/',
    '/about',
    '/contact',
    '/login',
    '/404',
    '/offline',

    // other static files
    '/js/blog.js',
    '/js/home.js',
    '/js/login.js',
    '/js/add-post.js',
    '/css/style.css',
    '/images/logo.gif',
    '/images/offline.png',
  ],
}
```

And then define the function that put those resources into cache.

```js
async function cacheLoggedOutFiles(
  {forceReload} = {forceReload: false}
) {
  var cache = await caches.open(cacheName)

  return Promise.all(
    urlsToCache.loggedOut.map(
      function requestFile(url) {
        try {
          let res

          if (!forceReload) {
            res = await cache.match(url)
            if (res) {
              return res
            }
          }

          let fetchOptions = {
            method: 'GET',
            cache: 'no-cache', // cache must be validated by server
            credentials: 'omit',
          }
          res = await fetch(url, fetchOptions)
          if (res.ok) {
            await cache.put(url, res.clone())
          }
        } catch (error) {}
      }
    )
  )
}
```

Then call the caching function when necessary:

```js
async function main() {
  await sendMessage({
    requestStatusUpdate: true,
  })
  // no force reload on startup: cache everything missing and ignore everything already in the cache
  await cacheLoggedOutFiles()
}

// ...
async function handleActivation() {
  // recache everything on activation
  await cacheLoggedOutFiles({
    forceReload: true,
  })
  // fire `controllerchange` event
  await clients.claim()
  console.log(
    `Service Worker (${version}) activated.`
  )
}
```

This way the service worker will cache everything you need when it's time.

But it would be better if we clear any old caches before cache new resources. The activation time suits well for this operation as we can be sure that the old service worker has been deleted and the new one has been installed and ready to roll. If we do this during the installation, the old worker might be still lingering around and could mess things up.

```js
async function handleActivation() {
  await clearCaches()
  // ...
}

async function clearCaches() {
  var cacheNames = await caches.keys()
  var oldCacheNames = cacheNames.filter(
    function matchOldCache(cacheName) {
      if (/^ramblings-\d+$/.test(cacheName)) {
        let [, cacheVersion] =
          cacheName.match(/^ramblings-(\d+)$/)
        cacheVersion =
          cacheVersion !== null
            ? Number(cacheVersion)
            : cacheVersion
        return (
          cacheVersion > 0 &&
          cacheVersion !== version
        )
      }
    }
  )
  return Promise.all(
    oldCacheNames.map(function deleteCache(
      cacheName
    ) {
      return caches.delete(cacheName)
    })
  )
}
```

Now that we are done with caching, we can move onto the part where we use service worker to actually intercept network requests for offline use cases. To do that, we are basically going to build a router. First we need to listen to the fetch event, and the callback should return the response back.

```js
self.addEventListener('fetch', onFetch)

function onFetch(event) {
  event.respondWith(router(event.request))
}
```

For the router, we have to deal with requests to our own server. We can check the origin of the request url, try fetching the response and cache it. If the fetching fails, we will need to look into our caches and populate the response with the cache.

```js
async function router(request) {
  var url = URL(request.url)
  var requestUrl = url.pathname
  var cache = await caches.open(cacheName)

  if (url.origin === location.origin) {
    var res
    try {
      let fetchOptions = {
        method: request.method,
        headers: request.headers,
        credentials: 'omit',
        cache: 'no-store',
      }

      res = await fetch(
        request.url,
        fetchOptions
      )
      if (res && res.ok) {
        await cache.put(
          requestUrl,
          res.clone()
        )
        return res
      }
    } catch (error) {}

    res = await cache.match(requestUrl)
    if (res) {
      return res.clone()
    }
  }
}
```

This way, even if you are online but the server is down, the service worker will still keep your experience nice and sweet with your cached data.

In fact you don't have to write all these logic yourself, check out Google's [workbox](https://developer.chrome.com/docs/workbox/) library, which is a production-ready service worker library and provides you with better and easier service worker integration with your app.

For more info on service worker, check out these links.

## Reference

https://frontendmasters.com/courses/service-workers/

https://serviceworke.rs/

https://developers.google.com/web/fundamentals/primers/service-workers/

https://developers.google.com/web/ilt/pwa/introduction-to-service-worker

https://developers.google.com/web/tools/workbox/

https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

https://abookapart.com/products/going-offline

https://adactio.com/journal/15122
