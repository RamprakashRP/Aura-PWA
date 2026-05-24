import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Offline Service Worker core on load
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Programmatically unregister any active service worker in development
    // to prevent caching/HMR loops from serving stale assets.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Unregistered active service worker in development mode to prevent caching loops.');
            // Clear caches to be fully pristine
            caches.keys().then((keys) => {
              keys.forEach((key) => caches.delete(key));
            });
            // Force a single clean reload to get fresh network files
            window.location.reload();
          }
        });
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Aura Service Worker registered successfully:', reg.scope))
        .catch((err) => console.error('Aura Service Worker registration failed:', err));
    });
  }
}
