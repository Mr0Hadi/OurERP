import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * ورودیِ رمز با دکمه‌ی نمایش/پنهان. چپ‌به‌راست و تک‌فاصله، چون رمز فقط نویسه‌ی
 * انگلیسی است. بقیه‌ی propها (و `ref`ِ `register`) به `Input` می‌رسند.
 *
 * دکمه با `inset-y-0 my-auto` وسط می‌نشیند، نه `-translate-y-1/2`: `active:translate-y-px`ِ
 * `Button` آن translate را هنگامِ فشردن جایگزین می‌کرد، دکمه زیرِ اشاره‌گر پایین می‌پرید
 * و کلیک به دکمه نمی‌رسید. placeholderِ «••••» هم نیست تا نمایشِ فیلدِ خالی رمز به نظر نرسد.
 */
export default function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        dir="ltr"
        type={visible ? "text" : "password"}
        className={cn("h-11 rounded-lg pl-11 font-mono sm:h-10", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
        className="absolute inset-y-0 left-1 my-auto size-9 sm:size-8"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}
