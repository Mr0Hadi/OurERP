import { Phone, User } from "lucide-react";
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
 * فردی که کالا را تحویل می‌دهد یا تحویل می‌گیرد — `PartyName`،
 * `PartyPhoneNumber` و `VehiclePlate` روی `ExecuteGoodsRoundCommand`.
 *
 * شماره‌ی تماس، مثلِ راننده‌ی خرید و فروش (`TransporterSection`)، نه کدِ ملی:
 * برای پیگیریِ کالای مرجوعی باید بشود با تحویل‌دهنده/تحویل‌گیرنده تماس
 * گرفت. تا بکند `PartyNationalId` را به `PartyPhoneNumber` تغییر دهد
 * (سندِ `frontend-requests.fa.md`) این فیلد ذخیره نمی‌شود.
 */
export default function GoodsRoundPartySection({
  title,
  headerBadge,
  nameLabel,
  namePlaceholder,
  header,
  onHeaderChange,
  plateHint,
}) {
  return (
    <Card>
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
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {nameLabel}
            </Label>
            <Input
              placeholder={namePlaceholder}
              value={header.partyName || ""}
              onChange={(e) => onHeaderChange({ partyName: e.target.value })}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              شماره تلفن (اختیاری)
            </Label>
            <MobileNumberInput
              value={header.partyPhoneNumber || ""}
              onValueChange={(partyPhoneNumber) => onHeaderChange({ partyPhoneNumber })}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            شماره پلاک وسیله نقلیه (اختیاری)
          </Label>
          <PlateInput
            value={plateStringToValue(header.vehiclePlate)}
            onValueChange={(next) =>
              onHeaderChange({ vehiclePlate: plateValueToString(next) })
            }
          />
          {plateHint && (
            <p className="text-xs text-muted-foreground">{plateHint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
