"use client";

import { useEffect, useState } from "react";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }

    // Check notification permission
    if ("Notification" in window) {
      setHasNotificationPermission(Notification.permission === "granted");
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Handle online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      setHasNotificationPermission(true);
      return true;
    }

    if (Notification.permission !== "denied") {
      try {
        const permission = await Notification.requestPermission();
        setHasNotificationPermission(permission === "granted");
        return permission === "granted";
      } catch (error) {
        console.error("Error requesting notification permission:", error);
        return false;
      }
    }

    return false;
  };

  const sendNotification = async (options: NotificationOptions) => {
    if ("serviceWorker" in navigator && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          await navigator.serviceWorker.ready;
          await navigator.serviceWorker.controller?.postMessage({
            type: "SHOW_NOTIFICATION",
            notification: options,
          });

          // Fallback to direct notification if service worker doesn't handle it
          new Notification(options.title, {
            body: options.body,
            icon: options.icon || "/icon-192.png",
            tag: options.tag,
          });
        } catch (error) {
          console.error("Error sending notification:", error);
        }
      }
    }
  };

  const subscribeToSignalNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        // In a real app, you would subscribe to push notifications here
        // This requires a public/private key pair and backend support
        console.log("Push notifications enabled");
        setHasNotificationPermission(true);
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
    }
  };

  const enableBackgroundSync = async () => {
    if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
      console.log("Background sync not supported");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register("sync-signals");
      console.log("Background sync enabled");
    } catch (error) {
      console.error("Error enabling background sync:", error);
    }
  };

  return {
    isInstallable,
    installApp,
    isOnline,
    hasNotificationPermission,
    requestNotificationPermission,
    sendNotification,
    subscribeToSignalNotifications,
    enableBackgroundSync,
  };
}
