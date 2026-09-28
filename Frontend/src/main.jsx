import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "leaflet/dist/leaflet.css";
import toast from 'react-hot-toast'

import { DirectionProvider } from "@/shared/components/ui/direction"
import { initAppUpdates, onUpdateAvailable } from "@/shared/services/appUpdate"
import UpdateAvailableToast from "@/shared/components/app-update/UpdateAvailableToast"

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DirectionProvider direction="rtl">
      <App />
    </DirectionProvider>
  </StrictMode>
)