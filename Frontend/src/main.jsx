import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "leaflet/dist/leaflet.css";
import { registerSW } from 'virtual:pwa-register'
import toast from 'react-hot-toast'

import { DirectionProvider } from "@/shared/components/ui/direction"

// ثبت service worker + مدیریت آپدیت نسخه جدید
const updateSW = registerSW({
  onNeedRefresh() {
    toast.custom(
      (t) => (
        <div
          dir="rtl"
          style={{
            background: '#363636',
            color: '#fff',
            borderRadius: '0.5rem',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontFamily: 'inherit',
            minWidth: '280px',
          }}
        >
          <span style={{ flex: 1 }}>نسخه جدید OurERP موجوده</span>
          <button
            onClick={() => {
              updateSW(true)
              toast.dismiss(t.id)
            }}
            style={{
              background: '#4F46E5',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '6px 14px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            بروزرسانی
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              background: 'transparent',
              color: '#9ca3af',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            بعداً
          </button>
        </div>
      ),
      { duration: Infinity, id: 'sw-update' }
    )
  },
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