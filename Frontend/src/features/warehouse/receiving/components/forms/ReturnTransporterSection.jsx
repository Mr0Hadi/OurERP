// src/features/warehouse/receiving/components/forms/ReturnTransporterSection.jsx
import { useRef, useState } from "react";
import { User, IdCard, Undo2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";

const PLATE_LETTERS = [
  "الف", "ب", "پ", "ت", "ث", "ج", "د", "ز", "س", "ش", "ص", "ط",
  "ع", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی",
];

const EMPTY_PLATE = { regionA: "", letter: "", number: "", regionB: "" };
const PLATE_PATTERN = /^(\d{2}) (\S+) (\d{3}) - (\d{2})$/;

function parsePlate(value) {
  const match = PLATE_PATTERN.exec(value || "");
  if (!match) return { ...EMPTY_PLATE };
  const [, regionA, letter, number, regionB] = match;
  return { regionA, letter, number, regionB };
}

function formatPlate({ regionA, letter, number, regionB }) {
  if (!regionA && !letter && !number && !regionB) return "";
  return `${regionA} ${letter} ${number} - ${regionB}`;
}

const onlyDigits = (value, maxLen) => value.replace(/\D/g, "").slice(0, maxLen);

/**
 * دقیقاً معادل ReceivingTransporterSection (خرید) است، فقط با برچسب
 * عمومی‌تر «تحویل‌دهنده» (چون این کالا می‌تواند با پیک، وسیله‌ی شخصی
 * مشتری، یا حضوری خودِ مشتری برگردد) و یک نشان «نوع دریافت: مرجوعی
 * فروش» تا برای انباردار همیشه روشن باشد این دریافت از چه نوعی است.
 */
export default function ReturnTransporterSection({
  formData,
  onFormChange,
  error,
}) {
  const [plate, setPlate] = useState(() => parsePlate(formData.vehiclePlate));
  const [prevReturnId, setPrevReturnId] = useState(formData.returnId);

  if (formData.returnId !== prevReturnId) {
    setPrevReturnId(formData.returnId);
    setPlate(parsePlate(formData.vehiclePlate));
  }

  const regionARef = useRef(null);
  const letterRef = useRef(null);
  const numberRef = useRef(null);
  const regionBRef = useRef(null);

  const updatePlate = (patch, nextRef) => {
    const next = { ...plate, ...patch };
    setPlate(next);
    onFormChange({ vehiclePlate: formatPlate(next) });
    if (nextRef) nextRef.current?.focus();
  };

  return (
    <Card className={error ? "border-destructive" : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          اطلاعات تحویل‌دهنده
        </CardTitle>
        <Badge
          variant="secondary"
          className="gap-1.5 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          نوع دریافت: مرجوعی فروش
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              نام و نام خانوادگی تحویل‌دهنده
            </Label>
            <Input
              placeholder="مثلاً: علی رضایی (پیک) یا خودِ مشتری"
              value={formData.transporterName || ""}
              onChange={(e) => onFormChange({ transporterName: e.target.value })}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
              کد ملی
            </Label>
            <Input
              placeholder="۱۰ رقم"
              inputMode="numeric"
              value={formData.transporterNationalId || ""}
              onChange={(e) =>
                onFormChange({ transporterNationalId: onlyDigits(e.target.value, 10) })
              }
              className="h-9 text-sm tabular-nums tracking-widest"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            شماره پلاک وسیله نقلیه (اختیاری)
          </Label>
          <div
            className="flex items-stretch h-14 rounded-lg overflow-hidden border-2 border-input bg-card w-fit"
            dir="ltr"
          >
            <input
              ref={regionARef}
              value={plate.regionA}
              onChange={(e) => {
                const v = onlyDigits(e.target.value, 2);
                updatePlate({ regionA: v }, v.length === 2 ? letterRef : null);
              }}
              maxLength={2}
              placeholder="۱۲"
              className="w-12 text-center text-lg font-bold bg-transparent outline-none tabular-nums focus:bg-accent transition-colors"
            />

            <div className="w-px bg-border" />

            <select
              ref={letterRef}
              value={plate.letter}
              onChange={(e) => updatePlate({ letter: e.target.value }, numberRef)}
              className="w-16 text-center text-base bg-transparent outline-none focus:bg-accent transition-colors"
            >
              <option value="" />
              {PLATE_LETTERS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <div className="w-px bg-border" />

            <input
              ref={numberRef}
              value={plate.number}
              onChange={(e) => {
                const v = onlyDigits(e.target.value, 3);
                updatePlate({ number: v }, v.length === 3 ? regionBRef : null);
              }}
              maxLength={3}
              placeholder="۳۴۵"
              className="w-16 text-center text-lg font-bold bg-transparent outline-none tabular-nums focus:bg-accent transition-colors"
            />

            <div className="flex flex-col items-center justify-center px-1.5 bg-primary text-primary-foreground text-[10px] leading-tight shrink-0 gap-0.5">
              <span>ایران</span>
            </div>

            <input
              ref={regionBRef}
              value={plate.regionB}
              onChange={(e) => updatePlate({ regionB: onlyDigits(e.target.value, 2) })}
              maxLength={2}
              placeholder="۶۷"
              className="w-12 text-center text-lg font-bold bg-transparent outline-none tabular-nums focus:bg-accent transition-colors"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            اگر کالا حضوری یا بدون خودرو تحویل داده شده، این بخش را خالی بگذارید.
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
