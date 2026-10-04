import {
  BankBlubankColor,
  BankBlubankMono,
  BankDeyColor,
  BankDeyMono,
  BankEghtesadNovinColor,
  BankEghtesadNovinMono,
  BankGardeshgariColor,
  BankGardeshgariMono,
  BankGhavaminColor,
  BankGhavaminMono,
  BankHekmatColor,
  BankHekmatMono,
  BankIranZaminColor,
  BankIranZaminMono,
  BankKarafarinColor,
  BankKarafarinMono,
  BankKeshavarziColor,
  BankKeshavarziMono,
  BankKhavarMianehColor,
  BankKhavarMianehMono,
  BankMaskanColor,
  BankMaskanMono,
  BankMehrIranColor,
  BankMehrIranMono,
  BankMelallColor,
  BankMelallMono,
  BankMellatColor,
  BankMellatMono,
  BankMelliColor,
  BankMelliMono,
  BankParsianColor,
  BankParsianMono,
  BankPasargadColor,
  BankPasargadMono,
  BankPostbankColor,
  BankPostbankMono,
  BankRefahColor,
  BankRefahMono,
  BankResalatColor,
  BankResalatMono,
  BankSaderatColor,
  BankSaderatMono,
  BankSamanColor,
  BankSamanMono,
  BankSarmayehColor,
  BankSarmayehMono,
  BankSepahColor,
  BankSepahMono,
  BankShahrColor,
  BankShahrMono,
  BankSinaColor,
  BankSinaMono,
  BankTejaratColor,
  BankTejaratMono,
  BankToseeSaderatColor,
  BankToseeSaderatMono,
  BankToseeTaavonColor,
  BankToseeTaavonMono,
} from "@persianlabs/icons/react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/shared/components/ui/input-group"
import { useControllableState } from "@/shared/hooks/useControllableState"
import {
  formatCardNumber,
  formatShaba,
  getIranianBankByCardNumber,
  getIranianBankByShaba,
  normalizeCardNumber,
  normalizeShaba,
} from "@/shared/lib/iranian-bank";
import { cn } from "@/shared/lib/utils"

// import نام‌دار، نه `import *`: پکیجِ آیکن ده‌ها مگابایت است و فقط آیکن‌های بانک لازم‌اند.
const bankIcons = {
  blubank: { color: BankBlubankColor, mono: BankBlubankMono },
  dey: { color: BankDeyColor, mono: BankDeyMono },
  eghtesad_novin: { color: BankEghtesadNovinColor, mono: BankEghtesadNovinMono },
  gardeshgari: { color: BankGardeshgariColor, mono: BankGardeshgariMono },
  ghavvamin: { color: BankGhavaminColor, mono: BankGhavaminMono },
  hekmat: { color: BankHekmatColor, mono: BankHekmatMono },
  iranzamin: { color: BankIranZaminColor, mono: BankIranZaminMono },
  kar_afarin: { color: BankKarafarinColor, mono: BankKarafarinMono },
  keshavarzi: { color: BankKeshavarziColor, mono: BankKeshavarziMono },
  khavarmianeh: { color: BankKhavarMianehColor, mono: BankKhavarMianehMono },
  maskan: { color: BankMaskanColor, mono: BankMaskanMono },
  mehr_e_iranian: { color: BankMehrIranColor, mono: BankMehrIranMono },
  meli: { color: BankMelallColor, mono: BankMelallMono },
  mellat: { color: BankMellatColor, mono: BankMellatMono },
  melli: { color: BankMelliColor, mono: BankMelliMono },
  parsian: { color: BankParsianColor, mono: BankParsianMono },
  pasargad: { color: BankPasargadColor, mono: BankPasargadMono },
  post_bank: { color: BankPostbankColor, mono: BankPostbankMono },
  refah: { color: BankRefahColor, mono: BankRefahMono },
  resalat: { color: BankResalatColor, mono: BankResalatMono },
  saderat: { color: BankSaderatColor, mono: BankSaderatMono },
  saman: { color: BankSamanColor, mono: BankSamanMono },
  sarmayeh: { color: BankSarmayehColor, mono: BankSarmayehMono },
  sepah: { color: BankSepahColor, mono: BankSepahMono },
  shahr: { color: BankShahrColor, mono: BankShahrMono },
  sina: { color: BankSinaColor, mono: BankSinaMono },
  tejarat: { color: BankTejaratColor, mono: BankTejaratMono },
  tosee_saderat: { color: BankToseeSaderatColor, mono: BankToseeSaderatMono },
  tosee_taavon: { color: BankToseeTaavonColor, mono: BankToseeTaavonMono },
}

function offsetAfterDigits(value, digitCount) {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let index = 0; index < value.length; index++) {
    if (/\d/.test(value[index])) seen++
    if (seen === digitCount) return index + 1
  }
  return value.length
}

function restoreCaret(
  input,
  formatted,
  digitsBeforeCaret
) {
  requestAnimationFrame(() => {
    const offset = offsetAfterDigits(formatted, digitsBeforeCaret)
    input.setSelectionRange(offset, offset)
  })
}

function BankIdentity({
  bank,
  logo
}) {
  if (!bank) return null

  return (
    <InputGroupAddon align="inline-end" className="pe-2">
      <BankLogo bank={bank} logo={logo} />
    </InputGroupAddon>
  )
}

/** لوگوی بانک به‌تنهایی (بدونِ ورودی)؛ مثلاً بانکِ کارتِ ماسک‌شده در رسیدِ کارتخوان. */
function BankLogo({ bank, logo = "color", className }) {
  const Logo = bank && bankIcons[bank.id]?.[logo === "mono" ? "mono" : "color"]
  if (!Logo) return null
  return <Logo className={cn("size-5 shrink-0", className)} aria-hidden="true" />
}

function CardNumberInput({
  value,
  defaultValue = "",
  onValueChange,
  bankLogo = "color",
  onBankChange,
  separator = " ",
  className,
  ...props
}) {
  const [number, setNumber] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
    caller: "CardNumberInput",
  })
  const normalized = normalizeCardNumber(number)
  const bank = getIranianBankByCardNumber(normalized)

  function handleChange(event) {
    const digitsBeforeCaret = normalizeCardNumber(
      event.target.value.slice(0, event.target.selectionStart ?? 0)
    ).length
    const next = normalizeCardNumber(event.target.value)
    setNumber(next)
    onBankChange?.(getIranianBankByCardNumber(next))
    restoreCaret(
      event.target,
      formatCardNumber(next, separator),
      digitsBeforeCaret
    )
  }

  return (
    <InputGroup className={cn("h-10", className)} dir="ltr">
      <InputGroupInput
        {...props}
        dir="ltr"
        inputMode="numeric"
        autoComplete="cc-number"
        spellCheck={false}
        translate="no"
        value={formatCardNumber(normalized, separator)}
        onChange={handleChange}
        placeholder={`1234${separator}1234${separator}1234${separator}1234`}
        className="font-mono text-sm tracking-wide md:text-base"
      />
      {bankLogo && <BankIdentity bank={bank} logo={bankLogo} />}
    </InputGroup>
  )
}

function ShabaInput({
  value,
  defaultValue = "",
  onValueChange,
  bankLogo = "color",
  onBankChange,
  separator = " ",
  className,
  ...props
}) {
  const [account, setAccount] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
    caller: "ShabaInput",
  })
  const normalized = normalizeShaba(account)
  const bank = getIranianBankByShaba(normalized)

  function handleChange(event) {
    const digitsBeforeCaret = normalizeShaba(
      event.target.value.slice(0, event.target.selectionStart ?? 0)
    ).length
    const next = normalizeShaba(event.target.value)
    setAccount(next)
    onBankChange?.(getIranianBankByShaba(next))
    restoreCaret(event.target, formatShaba(next, separator), digitsBeforeCaret)
  }

  return (
    <InputGroup className={cn("h-10", className)} dir="ltr">
      <InputGroupAddon align="inline-start">
        <InputGroupText className="font-mono font-semibold tracking-wide">
          IR
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        {...props}
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        translate="no"
        value={formatShaba(normalized, separator)}
        onChange={handleChange}
        placeholder={`1234${separator}1234${separator}1234${separator}1234${separator}1234${separator}1234`}
        className="font-mono text-sm tracking-wide md:text-base"
      />
      {bankLogo && <BankIdentity bank={bank} logo={bankLogo} />}
    </InputGroup>
  )
}

export { BankLogo, CardNumberInput, ShabaInput }
