import { useState } from "react";
import { RotateCcw, ScanLine } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Spinner } from "@/shared/components/ui/spinner";
import AmountInWords from "@/shared/components/forms/AmountInWords";
import { usePosTerminalsQuery } from "@/shared/services/pos/queries";
import { formatRial } from "@/shared/lib/numberFormat";
import OptionSelect from "@/shared/components/forms/OptionSelect";

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
        <OptionSelect
          value={terminal ? String(terminal.id) : ""}
          onChange={choose}
          isLoading={isLoading}
          disabled={noTerminal}
          placeholder={noTerminal ? "دستگاهی تعریف نشده" : "دستگاه را انتخاب کنید"}
          aria-label="دستگاه کارتخوان"
          className="h-9! w-full"
          options={items.map((item) => ({ value: item.id, label: item.name }))}
        />
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

