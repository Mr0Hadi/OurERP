/**
 * کلیدهای حسابداری؛ فقط با پارامترها شناخته می‌شوند (id ندارند). بخش فقط‌خواندنی است و
 * `staleTime: 0`ِ سراسری با هر ورود به صفحه از سرور می‌خواند، پس mutationهای خرید/فروش
 * لازم نیست این کلیدها را باطل کنند.
 */
export const accountingKeys = {
  all: ["accounting"],
  dashboard: (params) => [...accountingKeys.all, "dashboard", { ...params }],
  partyBalances: (params) => [...accountingKeys.all, "party-balances", { ...params }],
  partyLedger: (params) => [...accountingKeys.all, "party-ledger", { ...params }],
  invoiceJournal: (side, params) => [...accountingKeys.all, "invoice-journal", String(side), { ...params }],
  saleLines: (params) => [...accountingKeys.all, "sale-lines", { ...params }],
  payments: (params) => [...accountingKeys.all, "payments", { ...params }],
  tax: (params) => [...accountingKeys.all, "tax", { ...params }],
  inventory: (params) => [...accountingKeys.all, "inventory", { ...params }],
  tradeBreakdown: (params) => [...accountingKeys.all, "trade-breakdown", { ...params }],
};
