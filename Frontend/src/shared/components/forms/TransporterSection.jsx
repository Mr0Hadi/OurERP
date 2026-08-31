import { User, Phone } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { MobileNumberInput } from "@/shared/components/ui/mobile-number-input";
import {
  DEFAULT_PLATE_VALUE,
  PlateInput,
} from "@/shared/components/ui/plate-input";

const PLATE_STRING_SEPARATOR = "|";

/** پلاک به‌صورت رشته ذخیره می‌شود (برای فرم و ارسال به سرور)، اما
 * PlateInput مقدارش را به‌صورت آبجکت می‌خواهد. این دو تابع بین آن دو
 * تبدیل می‌کنند؛ برخلاف فرمت قبلی (چهار خانه‌ی همیشه کامل)، اینجا
 * مقادیر نصفه‌کاره هم حفظ می‌شوند تا تایپ کاربر گم نشود. */
function plateValueToString({ twoDigit, letter, threeDigit, serial }) {
  if (!twoDigit && !threeDigit && !serial) return "";
  return [twoDigit, letter, threeDigit, serial].join(PLATE_STRING_SEPARATOR);
}

function plateStringToValue(value) {
  if (!value) return DEFAULT_PLATE_VALUE;
  const [twoDigit = "", letter = "", threeDigit = "", serial = ""] =
    value.split(PLATE_STRING_SEPARATOR);
  return { twoDigit, letter, threeDigit, serial };
}

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
  phoneLabel = "شماره تلفن",
  phone,
  onPhoneChange,
  plateLabel = "شماره پلاک وسیله نقلیه (اختیاری)",
  plate,
  onPlateChange,
  plateHint,
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
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {phoneLabel}
            </Label>
            <MobileNumberInput
              value={phone || ""}
              onValueChange={onPhoneChange}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* پلاک */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{plateLabel}</Label>
          <PlateInput
            value={plateStringToValue(plate)}
            onValueChange={(next) => onPlateChange(plateValueToString(next))}
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
