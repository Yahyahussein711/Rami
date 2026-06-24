const CACHE_NAME = 'rami-v2-editorial';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/story.js'
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(() => {
        // Some files might fail - that's ok
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      return fetch(event.request).then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Return cached version if fetch fails
        return caches.match(event.request);
      });
    })
  );
});

// Background sync for periodic checks
self.addEventListener('sync', event => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndNotify());
  }
});

// Periodic sync (for browsers that support it)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndNotify());
  }
});

// Check stored data and send notifications
async function checkAndNotify() {
  try {
    const db = await openDatabase();
    const notifications = await getScheduledNotifications(db);

    const now = Date.now();
    for (const notif of notifications) {
      if (notif.scheduledTime <= now && !notif.sent) {
        // Send notification
        await self.registration.showNotification(notif.title, {
          body: notif.body,
          icon: notif.icon,
          badge: notif.badge,
          tag: notif.tag,
          requireInteraction: true
        });

        // Mark as sent
        await markNotificationSent(db, notif.id);
      }
    }
  } catch (error) {
    console.error('Error in checkAndNotify:', error);
  }
}

// IndexedDB helpers
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RamiDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      // Create store if needed
      if (!db.objectStoreNames.contains('notifications')) {
        try {
          db.createObjectStore('notifications', { keyPath: 'id' });
        } catch (e) {
          // Store might already exist
        }
      }
      resolve(db);
    };

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id' });
      }
    };
  });
}

function getScheduledNotifications(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notifications'], 'readonly');
    const store = transaction.objectStore('notifications');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

function markNotificationSent(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    const request = store.get(id);

    request.onsuccess = () => {
      const notif = request.result;
      if (notif) {
        notif.sent = true;
        store.put(notif);
      }
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    scheduleNotification(event.data);
  } else if (event.data.type === 'UNREGISTER') {
    self.registration.unregister();
  }
});

async function scheduleNotification(data) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');

    const notification = {
      id: Date.now() + Math.random(),
      title: data.title,
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag || 'rami-notif',
      scheduledTime: data.scheduledTime,
      sent: false
    };

    store.add(notification);

    // Request periodic sync
    if (self.registration.periodicSync) {
      try {
        await self.registration.periodicSync.register('check-notifications', {
          minInterval: 15 * 60 * 1000 // 15 minutes
        });
      } catch (error) {
        console.log('Periodic sync not available:', error);
      }
    }
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window if open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
