import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import toast from 'react-hot-toast'

import { DirectionProvider } from "@/shared/components/ui/direction"
import { initAppUpdates, onUpdateAvailable } from "@/shared/services/appUpdate"
import UpdateAvailableToast from "@/shared/components/app-update/UpdateAvailableToast"
import { purgeLegacyApiCache } from "@/shared/services/sessionCleanup"

// ثبت service worker و بررسیِ نسخه‌ی تازه — جزئیات در `shared/services/appUpdate.js`.
// شناسه‌ی ثابت: اعلانِ تکراری روی هم انباشته نمی‌شود.
onUpdateAvailable(() =>
  toast.custom((t) => <UpdateAvailableToast id={t.id} />, { id: 'app-update', duration: Infinity }),
)
initAppUpdates({
  onOfflineReady() {
    toast.success('برنامه برای استفاده آفلاین آماده‌ست', { duration: 3000 })
  },
})

// نسخه‌های قبلی پاسخ‌های API را در Cache Storage نگه می‌داشتند.
purgeLegacyApiCache()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DirectionProvider direction="rtl">
      <App />
    </DirectionProvider>
  </StrictMode>
)