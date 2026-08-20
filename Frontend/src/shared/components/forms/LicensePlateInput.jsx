import { useRef, useState } from "react";

const PLATE_LETTERS = [
  "الف", "ب", "پ", "ت", "ث", "ج", "د", "ز", "س", "ش", "ص", "ط",
  "ع", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی",
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

/**
 * پلاک خودروی ایرانی به‌صورت چهار خانه‌ی جدا با پرش خودکار فوکوس.
 *
 * value    - رشته‌ی فرمت‌شده‌ی پلاک
 * onChange - (formattedString) => void
 * resetKey - وقتی عوض شود، مقدار داخلی دوباره از value خوانده می‌شود
 *            (مثلاً هنگام جابه‌جایی بین دو سند)
 */
export default function LicensePlateInput({ value, onChange, resetKey }) {
  const [plate, setPlate] = useState(() => parsePlate(value));
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPlate(parsePlate(value));
  }

  const regionARef = useRef(null);
  const letterRef = useRef(null);
  const numberRef = useRef(null);
  const regionBRef = useRef(null);

  const updatePlate = (patch, nextRef) => {
    const next = { ...plate, ...patch };
    setPlate(next);
    onChange(formatPlate(next));
    if (nextRef) nextRef.current?.focus();
  };

  return (
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
        onChange={(e) => updatePlate({ regionB: onlyDigits(e.target.value, 2) })}
        maxLength={2}
        placeholder="۶۷"
        className="w-12 text-center text-lg font-bold bg-transparent outline-none tabular-nums focus:bg-accent transition-colors"
      />
    </div>
  );
}
