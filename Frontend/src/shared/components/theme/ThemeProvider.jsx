import { useEffect, useState } from "react"
import { syncThemeColor } from "@/shared/lib/syncThemeColor"
import { ThemeProviderContext } from "@/shared/components/theme/themeContext"

// کلاس‌هایی که باید هنگام تغییر تم پاک بشن
const THEME_CLASSES = [
  "light",
  "dark",
  "theme-accessible",
  "theme-rose",
  "theme-forest",
]

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

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      syncThemeColor()
      return
    }

    root.classList.add(theme)
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
