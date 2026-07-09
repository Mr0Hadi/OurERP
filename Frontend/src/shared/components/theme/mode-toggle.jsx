import { Eye, Leaf, Moon, Palette, Sun } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { useTheme } from "@/shared/components/theme/theme-provider"

// آیکون داینامیک بر اساس تم فعلی
function ThemeIcon({ theme }) {
  if (theme === "dark") return <Moon className="h-[1.2rem] w-[1.2rem]" />
  if (theme === "theme-accessible") return <Eye className="h-[1.2rem] w-[1.2rem] text-blue-600" />
  if (theme === "theme-rose") return <Palette className="h-[1.2rem] w-[1.2rem] text-rose-500" />
  if (theme === "theme-forest") return <Leaf className="h-[1.2rem] w-[1.2rem] text-green-600" />
  // light / system
  return <Sun className="h-[1.2rem] w-[1.2rem]" />
}

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <ThemeIcon theme={theme} />
          <span className="sr-only">تغییر تم</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuLabel>تم پایه</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          روشن
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          تاریک
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Palette className="mr-2 h-4 w-4" />
          مطابق سیستم
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>تم‌های رنگی</DropdownMenuLabel>

        <DropdownMenuItem onClick={() => setTheme("theme-accessible")}>
          <Eye className="mr-2 h-4 w-4 text-blue-600" />
          دسترس‌پذیر
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("theme-rose")}>
          <Palette className="mr-2 h-4 w-4 text-rose-500" />
          گل‌بهی
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("theme-forest")}>
          <Leaf className="mr-2 h-4 w-4 text-green-600" />
          جنگلی
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
