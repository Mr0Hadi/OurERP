import { User, IdCard } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { onlyDigits } from "@/shared/utils/inputUtils";
import LicensePlateInput from "./LicensePlateInput";

/**
 * کارت اطلاعات فرد تحویل‌دهنده/تحویل‌گیرنده به‌همراه پلاک خودرو.
 *
 * نام فیلدها در هر ماژول فرق دارد (transporterName در انبار دریافت،
 * driverName در ارسال)، بنابراین مقدار و هندلر هر فیلد صریح پاس داده
 * می‌شود و نگاشت به فرم بر عهده‌ی خودِ ماژول است.
 */
export default function TransporterSection({
  title,
  headerBadge,
  nameLabel,
  namePlaceholder,
  name,
  onNameChange,
  nationalIdLabel = "کد ملی",
  nationalId,
  onNationalIdChange,
  plateLabel = "شماره پلاک وسیله نقلیه (اختیاری)",
  plate,
  onPlateChange,
  plateHint,
  resetKey,
  error,
}) {
  return (
    <Card className={error ? "border-destructive" : ""}>
      <CardHeader
        className={
          headerBadge
            ? "pb-2 flex flex-row items-center justify-between"
            : "pb-2"
        }
      >
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {headerBadge}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* دو فیلد اول در کنار هم */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {nameLabel}
            </Label>
            <Input
              placeholder={namePlaceholder}
              value={name || ""}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
              {nationalIdLabel}
            </Label>
            <Input
              placeholder="۱۰ رقم"
              inputMode="numeric"
              value={nationalId || ""}
              onChange={(e) =>
                onNationalIdChange(onlyDigits(e.target.value, 10))
              }
              className="h-9 text-sm tabular-nums tracking-widest"
            />
          </div>
        </div>

        {/* پلاک */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{plateLabel}</Label>
          <LicensePlateInput
            value={plate}
            onChange={onPlateChange}
            resetKey={resetKey}
          />
          {plateHint && (
            <p className="text-xs text-muted-foreground">{plateHint}</p>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
