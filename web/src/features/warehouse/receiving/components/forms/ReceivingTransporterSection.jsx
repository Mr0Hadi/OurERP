// src/features/warehouse/receiving/components/forms/ReceivingTransporterSection.jsx
import { useEffect, useRef, useState } from "react";
import { User, IdCard } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

const PLATE_LETTERS = [
  "الف",
  "ب",
  "پ",
  "ت",
  "ث",
  "ج",
  "د",
  "ز",
  "س",
  "ش",
  "ص",
  "ط",
  "ع",
  "ف",
  "ق",
  "ک",
  "گ",
  "ل",
  "م",
  "ن",
  "و",
  "ه",
  "ی",
];

const EMPTY_PLATE = { regionA: "", letter: "", number: "", regionB: "" };

// فرمت ذخیره‌سازی همیشه ثابت است: "12 الف 345 - 67"
// چون خودمان این رشته را تولید می‌کنیم، پارس کردنش هم قطعی و بدون خطاست.
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

export default function ReceivingTransporterSection({
  formData,
  onFormChange,
  error,
}) {
  const [plate, setPlate] = useState(() => parsePlate(formData.vehiclePlate));
  const [prevPurchaseId, setPrevPurchaseId] = useState(formData.purchaseId);

    if (formData.purchaseId !== prevPurchaseId) {
    setPrevPurchaseId(formData.purchaseId);
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          اطلاعات تحویل‌دهنده
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* دو فیلد اول در کنار هم */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              نام و نام خانوادگی راننده / تحویل‌دهنده
            </Label>
            <Input
              placeholder="مثلاً: علی رضایی"
              value={formData.transporterName || ""}
              onChange={(e) =>
                onFormChange({ transporterName: e.target.value })
              }
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
                onFormChange({
                  transporterNationalId: onlyDigits(e.target.value, 10),
                })
              }
              className="h-9 text-sm tabular-nums tracking-widest"
            />
          </div>
        </div>

        {/* فیلد پلاک به صورت کامل */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            شماره پلاک وسیله نقلیه (اختیاری)
          </Label>
          <div
            className="flex items-stretch h-14 rounded-lg overflow-hidden border-2 border-input bg-card w-fit"
            dir="ltr"
          >
            {/* دو رقم سمت راست پلاک */}
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

            {/* حرف پلاک */}
            <select
              ref={letterRef}
              value={plate.letter}
              onChange={(e) =>
                updatePlate({ letter: e.target.value }, numberRef)
              }
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

            {/* سه رقم اصلی */}
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

            {/* نوار ایران */}
            <div className="flex flex-col items-center justify-center px-1.5 bg-primary text-primary-foreground text-[10px] leading-tight shrink-0 gap-0.5">
              <span>ایران</span>
            </div>

            {/* دو رقم کد شهر */}
            <input
              ref={regionBRef}
              value={plate.regionB}
              onChange={(e) =>
                updatePlate({ regionB: onlyDigits(e.target.value, 2) })
              }
              maxLength={2}
              placeholder="۶۷"
              className="w-12 text-center text-lg font-bold bg-transparent outline-none tabular-nums focus:bg-accent transition-colors"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            اگر کالا با پیک یا حضوری تحویل داده شده و پلاکی در کار نیست، این بخش
            را خالی بگذارید.
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
