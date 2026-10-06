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

    // پاک کردن همه کلاس‌های تم
    root.classList.remove(...THEME_CLASSES)

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    root.classList.add(...resolveThemeClasses(theme, prefersDark))
    syncThemeColor()
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
