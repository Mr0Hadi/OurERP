import { User, IdCard } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
 * `PartyNationalId` و `VehiclePlate` روی `ExecuteGoodsRoundCommand`.
 *
 * جدا از `TransporterSection` است چون فیلدِ دومِ آن شماره‌ی موبایل است و
 * اینجا بکند کدِ ملی می‌خواهد؛ در دورِ کالای مرجوعی، هویتِ تحویل‌گیرنده
 * سندِ ماست، نه راهی برای تماس با او.
 */
export default function GoodsRoundPartySection({
  title,
  headerBadge,
  nameLabel,
  namePlaceholder,
  header,
  onHeaderChange,
  plateHint,
  // کدِ ملی برای کسی که کالای مشتری را برمی‌گرداند سند است؛ برای رانندهٔ
  // تامین‌کننده که کالا را می‌برد لازم نیست.
  showNationalId = true,
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
          className={`grid grid-cols-1 gap-4 ${showNationalId ? "md:grid-cols-2" : ""}`}
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

          {showNationalId && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
                کد ملی (اختیاری)
              </Label>
              <Input
                inputMode="numeric"
                placeholder="مثلاً: ۰۰۱۲۳۴۵۶۷۸"
                value={header.partyNationalId || ""}
                onChange={(e) =>
                  onHeaderChange({ partyNationalId: e.target.value })
                }
                className="h-9 text-sm"
              />
            </div>
          )}
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
