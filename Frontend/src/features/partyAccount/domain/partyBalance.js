import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";

/** مانده‌ی اولیه‌ی دستی (`balance`/`balanceType`) با علامت: بدهکار مثبت، بستانکار منفی. */
export function openingBalanceOf(party) {
  const amount = Math.abs(Number(party?.balance) || 0);
  if (party?.balanceType === BalanceTypeEnum.DEBTOR) return amount;
  if (party?.balanceType === BalanceTypeEnum.CREDITOR) return -amount;
  return 0;
}

/**
 * مانده‌ی کلِ یک طرف حساب = مانده‌ی اولیه‌ی دستی + گردشِ دفتر حساب اشخاص
 * (`ledgerBalance`). دفتر از روزِ راه‌اندازی شروع شده و بدهی/طلبِ قبل از
 * آن فقط در همان مانده‌ی دستی است؛ بدون جمعِ این دو، همه‌ی اشخاصِ قدیمی
 * «تسویه» دیده می‌شدند. مثبت یعنی طرف به ما بدهکار است.
 */
export function partyBalanceOf(party) {
  return openingBalanceOf(party) + (Number(party?.ledgerBalance) || 0);
}
