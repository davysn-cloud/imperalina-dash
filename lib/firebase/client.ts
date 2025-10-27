import { initializeApp, getApps, getApp } from "firebase/app"
import { getAnalytics, isSupported } from "firebase/analytics"
import { firebaseConfig } from "./config"

export function initFirebase() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

  if (typeof window !== "undefined") {
    // Initialize Analytics only in the browser
    isSupported()
      .then((supported) => {
        if (supported) {
          getAnalytics(app)
        }
      })
      .catch(() => {
        // ignore analytics initialization errors silently
      })
  }

  return app
}