/**
 * کلیدهای کشِ صندوق و حسابِ بانکی — سراسری: صفحه‌ی «صندوق و بانک» (`features/treasury/bankAccounts`) و
 * انتخابگرِ حساب در همه‌ی فرم‌های پرداخت (`BankAccountSelect`) هر دو زیرِ همین ریشه‌اند، تا هر نوشتن در
 * صفحه‌ی حساب‌ها انتخابگرها را هم تازه کند.
 */
export const bankAccountKeys = {
  all: ["bankAccounts"],
  options: () => [...bankAccountKeys.all, "options"],
  lists: () => [...bankAccountKeys.all, "list"],
  list: (params) => [...bankAccountKeys.lists(), params],
  statements: () => [...bankAccountKeys.all, "statement"],
  statement: (params) => [...bankAccountKeys.statements(), params],
};
