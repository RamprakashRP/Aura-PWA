import { vaultApi as api } from '../../lib/vaultApi';

export async function isPushNotificationSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushSubscriptionState(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function registerPushNotifications(): Promise<boolean> {
  try {
    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported in this browser');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission was not granted:', permission);
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const publicKey = await api.getVapidPublicKey();
    if (!publicKey) {
      console.warn('VAPID public key not configured on backend');
      return false;
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });

    // Send subscription to backend
    await api.subscribeToPush(subscription, getDeviceName());

    console.log('Push notifications registered successfully');
    return true;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api.unsubscribeFromPush(subscription.endpoint);
      await subscription.unsubscribe();
      console.log('Push notifications unregistered');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to unregister push notifications:', error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Device';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Browser Client';
}
