import { createContext, useContext } from "react";

/**
 * قرارداد تم، جدا از کامپوننتِ Provider.
 *
 * کنار `ThemeProvider` بود و باعث می‌شد آن فایل هم کامپوننت صادر کند هم
 * غیرکامپوننت — چیزی که Fast Refresh را برای کلِ درختِ زیرِ Provider از
 * کار می‌اندازد (هر ویرایش، به‌جای رفرشِ موضعی، کلِ برنامه را ریست
 * می‌کرد).
 */
export const ThemeProviderContext = createContext(undefined);

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
