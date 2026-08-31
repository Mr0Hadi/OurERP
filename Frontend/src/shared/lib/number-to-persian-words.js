import { normalizePersianDigits } from "@/shared/lib/normalize-persian-digits"

const JOINER = " و "
const ZERO = "صفر"
const NEGATIVE_PREFIX = "منفی "
const DECIMAL_MARKER = " ممیز "
const OUT_OF_RANGE = "عدد خارج از محدوده است"

const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"]
const TEENS = [
  "ده",
  "یازده",
  "دوازده",
  "سیزده",
  "چهارده",
  "پانزده",
  "شانزده",
  "هفده",
  "هجده",
  "نوزده",
]
const TENS = [
  "",
  "",
  "بیست",
  "سی",
  "چهل",
  "پنجاه",
  "شصت",
  "هفتاد",
  "هشتاد",
  "نود",
]
const HUNDREDS = [
  "",
  "صد",
  "دویست",
  "سیصد",
  "چهارصد",
  "پانصد",
  "ششصد",
  "هفتصد",
  "هشتصد",
  "نهصد",
]

const SCALES = [
  "",
  "هزار",
  "میلیون",
  "میلیارد",
  "بیلیون",
  "بیلیارد",
  "تریلیون",
  "تریلیارد",
]

const FRACTION_ORDINALS = [
  "",
  "دهم",
  "صدم",
  "هزارم",
  "ده\u200cهزارم",
  "صدم\u200cهزارم",
  "میلیونوم",
  "ده\u200cمیلیونوم",
  "صدمیلیونوم",
  "میلیاردم",
]

export const NUMBER_WORDS_LIMITS = {
  /** Longest supported integer part, in digits (up to 999 تریلیارد…). */
  integerDigits: SCALES.length * 3,
  /** Longest supported fractional part, in significant digits (تا میلیاردم). */
  decimalDigits: FRACTION_ORDINALS.length - 1,
}

function threeDigitToWords(value) {
  const parts = []
  const hundreds = Math.trunc(value / 100)
  const rest = value % 100

  if (hundreds > 0) {
    parts.push(HUNDREDS[hundreds])
  }

  if (rest >= 10 && rest <= 19) {
    parts.push(TEENS[rest - 10])
  } else if (rest > 0) {
    const tens = Math.trunc(rest / 10)
    const ones = rest % 10

    if (tens > 0) parts.push(TENS[tens])
    if (ones > 0) parts.push(ONES[ones])
  }

  return parts.join(JOINER);
}

function integerToWords(digits) {
  const trimmed = digits.replace(/^0+(?=\d)/, "")

  if (trimmed.length > NUMBER_WORDS_LIMITS.integerDigits) {
    return null
  }

  const groups = []
  for (let end = trimmed.length; end > 0; end -= 3) {
    groups.unshift(Number.parseInt(trimmed.slice(Math.max(0, end - 3), end), 10))
  }

  const parts = []
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i]

    if (!group) continue

    const scale = SCALES[groups.length - 1 - i]
    parts.push(scale ? `${threeDigitToWords(group)} ${scale}` : threeDigitToWords(group))
  }

  return parts.join(JOINER);
}

function mixedIntegerToWords(digits) {
  const trimmed = digits.replace(/^0+(?=\d)/, "")

  if (trimmed.length > NUMBER_WORDS_LIMITS.integerDigits) {
    return null
  }

  const groups = []
  for (let end = trimmed.length; end > 0; end -= 3) {
    groups.unshift(Number.parseInt(trimmed.slice(Math.max(0, end - 3), end), 10))
  }

  const parts = []
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i]

    if (!group) continue

    const scale = SCALES[groups.length - 1 - i]
    parts.push(scale ? `${group} ${scale}` : threeDigitToWords(group))
  }

  return parts.join(JOINER);
}

function parseValue(value) {
  const raw = normalizePersianDigits(String(value))
    // Thousands separators: Arabic ٬, comma, apostrophe, underscore, spaces.
    .replace(/[\u066C,'_ \u00A0]/g, "")
    .replace(/^\+/, "")

  if (!/\d/.test(raw)) {
    return null
  }

  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(raw)

  if (!match) {
    return null
  }

  return {
    negative: Boolean(match[1]),
    integer: match[2] ?? "",
    fraction: match[3] ?? "",
  };
}

function withSuffix(text, suffix) {
  const trimmed = suffix?.trim()
  return trimmed ? `${text} ${trimmed}` : text
}

/**
 * Spells a number out in Persian words.
 *
 * Accepts plain numbers or strings containing Latin, Persian (۰-۹), or
 * Arabic-Indic (٠-٩) digits with optional sign, decimal point, and thousands
 * separators. Returns an empty string when the input contains no readable
 * number, and the out-of-range message past the limits in
 * NUMBER_WORDS_LIMITS.
 *
 * `options.mode = "mixed"` produces compact banking-style text such as
 * «12 میلیون و 500 هزار». `options.rialToToman` reads a rial amount and
 * spells it in toman when it divides evenly (10 → «یک تومان»),
 * falling back to rial otherwise (1 → «یک ریال»).
 */
export function numberToPersianWords(value, options) {
  const parsed = parseValue(value)

  if (!parsed) {
    return ""
  }

  const { negative } = parsed
  let integer = parsed.integer
  const significantFraction = parsed.fraction.replace(/0+$/, "")
  let suffix = options?.suffix?.trim()

  if (options?.rialToToman && !significantFraction && /0$/.test(integer)) {
    integer = integer.slice(0, -1)
    suffix = "تومان"
  } else if (options?.rialToToman) {
    suffix = "ریال"
  }

  const spellInteger =
    options?.mode === "mixed" ? mixedIntegerToWords : integerToWords

  const integerWords = spellInteger(integer || "0")

  if (integerWords === null) {
    return OUT_OF_RANGE
  }

  let fractionWords = ""

  if (significantFraction.length > 0) {
    const capped = significantFraction.slice(0, NUMBER_WORDS_LIMITS.decimalDigits)
    const words = integerToWords(capped) ?? ""
    fractionWords = `${DECIMAL_MARKER}${words} ${FRACTION_ORDINALS[capped.length]}`
  }

  if (integerWords === "" && fractionWords === "") {
    return withSuffix(ZERO, suffix);
  }

  const body = `${integerWords === "" ? ZERO : integerWords}${fractionWords}`

  return withSuffix(negative ? NEGATIVE_PREFIX + body : body, suffix);
}
