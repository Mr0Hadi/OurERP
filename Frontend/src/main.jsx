import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { DirectionProvider } from "@/shared/components/ui/direction"
import { purgeLegacyApiCache } from "@/shared/services/sessionCleanup"

// PWA/service worker غیرفعال است: برنامه با هر بازشدن آخرین نسخه‌ی منتشرشده را از سرور می‌گیرد.
// کارگرِ قدیمیِ نصب‌شده را `sw.js`ِ خودنابودشونده (`selfDestroying` در vite.config.js) پاک می‌کند.
// بروزرسانی (appUpdate.js و اعلان/پنجره‌اش) فعلاً به کار گرفته نمی‌شود.

// نسخه‌های قبلی پاسخ‌های API را در Cache Storage نگه می‌داشتند.
purgeLegacyApiCache()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DirectionProvider direction="rtl">
      <App />
    </DirectionProvider>
  </StrictMode>
)