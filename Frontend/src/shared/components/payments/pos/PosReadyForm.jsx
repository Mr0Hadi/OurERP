import { useState } from "react";
import { RotateCcw, ScanLine } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import AmountInWords from "@/shared/components/forms/AmountInWords";
import { usePosTerminalsQuery } from "@/shared/services/pos/queries";
import { formatRial } from "@/shared/lib/numberFormat";

const TERMINAL_KEY = "pos.terminalId";

/**
 * دستگاهِ این کاربر روی این مرورگر: دستگاه‌ها مشترک‌اند و هر کاربر خودش انتخاب می‌کند؛
 * آخرین انتخاب یادآوری می‌شود و اگر فقط یک دستگاه فعال هست همان انتخاب است.
 */
function useTerminalChoice(terminals) {
  const [chosen, setChosen] = useState(() => {
    try {
      return localStorage.getItem(TERMINAL_KEY);
    } catch {
      return null;
    }
  });
  const terminal =
    terminals.find((candidate) => String(candidate.id) === chosen) ??
    (terminals.length === 1 ? terminals[0] : undefined);

  const choose = (id) => {
    setChosen(id);
    try {
      localStorage.setItem(TERMINAL_KEY, id);
    } catch {
      // حالتِ خصوصی/مسدود: فقط برای همین بار.
    }
  };
  return [terminal, choose];
}

/**
 * پنلِ کارتخوان پیش از ارسال: انتخابِ دستگاه، مبلغی که روی دستگاه می‌آید و دکمه‌ی
 * «ارسال به کارتخوان» (یا «تلاشِ دوباره» بعد از یک تلاشِ ناموفق).
 */
export default function PosReadyForm({ retry, amount, blockedReason, hint, preparing, onStart }) {
  const { data: items = [], isLoading } = usePosTerminalsQuery();
  const [terminal, choose] = useTerminalChoice(items);
  const noTerminal = !isLoading && items.length === 0;
  const disabled = !terminal || !(amount > 0) || Boolean(blockedReason) || preparing;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">دستگاه کارتخوان</Label>
        <Select value={terminal ? String(terminal.id) : ""} onValueChange={choose} disabled={isLoading || noTerminal}>
          <SelectTrigger className="h-9! w-full" aria-label="دستگاه کارتخوان">
            <SelectValue
              placeholder={isLoading ? "در حال بارگذاری…" : noTerminal ? "دستگاهی تعریف نشده" : "دستگاه را انتخاب کنید"}
            />
          </SelectTrigger>
          <SelectContent>
            {items.map((terminal) => (
              <SelectItem key={terminal.id} value={String(terminal.id)}>
                {terminal.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
        <p className="text-[11px] text-muted-foreground">مبلغی که روی دستگاه می‌آید</p>
        <p className="text-lg font-semibold tabular-nums">{formatRial(amount)}</p>
        <AmountInWords rial={amount} />
      </div>

      {blockedReason && <p className="text-xs leading-5 text-destructive">{blockedReason}</p>}
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}

      <Button type="button" className="w-full gap-1.5" disabled={disabled} onClick={() => onStart(terminal)}>
        {preparing ? <Spinner /> : retry ? <RotateCcw className="size-4" /> : <ScanLine className="size-4" />}
        {retry ? "تلاشِ دوباره" : "ارسال به کارتخوان"}
      </Button>
    </div>
  );
}

