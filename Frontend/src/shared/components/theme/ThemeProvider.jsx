import { useEffect, useState } from "react"
import { syncThemeColor } from "@/shared/lib/syncThemeColor"
import { ThemeProviderContext } from "@/shared/components/theme/themeContext"
import { THEME_CLASSES, resolveThemeClasses } from "@/shared/components/theme/themeClasses"

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}) {
  const [theme, setTheme] = useState(
    () => (localStorage.getItem(storageKey)) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = () => {
      // پاک کردن همه کلاس‌های تم
      root.classList.remove(...THEME_CLASSES)
      root.classList.add(...resolveThemeClasses(theme, media.matches))
      syncThemeColor()
    }

    apply()
    // تمِ «سیستم» باید با عوض‌شدنِ تمِ سیستم‌عامل همان لحظه عوض شود، نه فقط بعد از بارگذاریِ دوباره.
    if (theme !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
