import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";
import { createFilterStore } from "@/shared/store/createFilterStore";

/** میان‌برهای نوار بالای لیست، به مقدارِ `balanceType` ترجمه می‌شوند. */
export const BALANCE_QUICK_FILTERS = [
  { key: "all", label: "همه", balanceType: "all" },
  { key: "debtors", label: "بدهکاران", balanceType: BalanceTypeEnum.DEBTOR },
  { key: "creditors", label: "بستانکاران", balanceType: BalanceTypeEnum.CREDITOR },
  { key: "settled", label: "تسویه‌شده", balanceType: BalanceTypeEnum.BALANCED },
];

/**
 * استورِ فیلترِ لیستِ طرف‌حساب‌ها (مشتری، تامین‌کننده).
 *
 * فیلدها همان نامِ پارامترهای `Get*ListQuery`ِ بکند را دارند؛ فقط نامِ
 * جست‌وجوی متنی بینِ دو کنترلر فرق می‌کند (`fullName` در برابر
 * `companyNameOrContactName`) و از بیرون داده می‌شود.
 *
 * @param {string} searchKey نامِ پارامترِ جست‌وجوی متنیِ همان endpoint
 */
export function createPartyFilterStore(searchKey) {
  return createFilterStore({
    filters: {
      [searchKey]: "",
      id: "",
      minBalance: "",
      maxBalance: "",
      balanceType: "all", // "all" | BalanceTypeEnum
    },
    defaultSorting: null,
    actions: ({ applyFilters }) => ({
      setSearch: (value) => applyFilters({ [searchKey]: value }),
      // میان‌بر بازه‌ی عددی را هم پاک می‌کند: این دو راهِ رقیبِ بیانِ یک
      // چیزند و با هم فعال بمانند، نتیجه‌ی لیست غیرقابل‌توضیح می‌شود.
      setQuickFilter: (balanceType) =>
        applyFilters({ balanceType, minBalance: "", maxBalance: "" }),
      setBalanceRange: (minBalance, maxBalance) => applyFilters({ minBalance, maxBalance }),
    }),
  });
}
