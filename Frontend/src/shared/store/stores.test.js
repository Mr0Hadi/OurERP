import { describe, expect, it, vi } from "vitest";
import { createFilterStore } from "./createFilterStore";
import { createDocumentFormStore } from "./createDocumentFormStore";
import { BALANCE_QUICK_FILTERS, createPartyFilterStore } from "@/features/partyAccount/store/createPartyFilterStore";
import { EMPTY_UNIT_FILTERS, useProductUnitFilterStore } from "@/features/warehouse/units/store/unitFilterStore";
import { UNIT_SEGMENTS } from "@/features/warehouse/units/domain/unitVocabulary";
import { isSaleCoreChanged, isSaleDueDateChanged, isSaleInfoChanged, useSaleFormStore } from "@/features/sales/orders/store/saleFormStore";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { saleKeys } from "@/features/sales/orders/services/queryKeys";
import { productUnitKeys } from "@/features/warehouse/units/services/queryKeys";
import { purchaseKeys } from "@/features/purchases/orders/services/queryKeys";

describe("createFilterStore", () => {
  const make = () => createFilterStore({ filters: { search: "", status: "" }, defaultPageSize: 25 });

  it("هر فیلتر setter دارد و به صفحه‌ی اول برمی‌گرداند؛ اندازه‌ی صفحه می‌ماند", () => {
    const store = make();
    store.getState().setPagination({ pageIndex: 4, pageSize: 50 });
    store.getState().setSearch("لنت");
    expect(store.getState()).toMatchObject({ search: "لنت", pagination: { pageIndex: 0, pageSize: 50 } });
    store.getState().setPagination({ pageIndex: 2, pageSize: 50 });
    store.getState().setSorting({ id: "name", desc: false });
    expect(store.getState().pagination.pageIndex).toBe(0);
  });

  it("بازنشانی فیلتر و مرتب‌سازی را برمی‌گرداند؛ پیش‌فرض‌ها برای شمارِ فیلترِ فعال", () => {
    const store = make();
    store.getState().setStatus(2);
    store.getState().setSorting({ id: "x" });
    store.getState().resetFilters();
    expect(store.getState()).toMatchObject({ search: "", status: "", sorting: { id: "createdAt", desc: true }, pagination: { pageSize: 25 } });
    expect(store.filterDefaults).toEqual({ search: "", status: "" });
  });

  it("طرف حساب: میان‌بر بازه‌ی عددی را پاک می‌کند", () => {
    const store = createPartyFilterStore("customerName");
    store.getState().setBalanceRange(10, 20);
    store.getState().setQuickFilter(BALANCE_QUICK_FILTERS[1].balanceType);
    expect(store.getState()).toMatchObject({ minBalance: "", maxBalance: "", balanceType: BALANCE_QUICK_FILTERS[1].balanceType });
    store.getState().setSearch("علی");
    expect(store.getState().customerName).toBe("علی");
    expect(store.getState().sorting).toBe(null);
  });

  it("دانه‌ها: کالای تازه بازه‌ی سریال را پاک می‌کند؛ جایگاه علت و برچسبِ بی‌معنا را", () => {
    const store = useProductUnitFilterStore;
    store.getState().openWith({ productId: 3, fromSerial: 1, toSerial: 9, custodyReason: 2, labelFilter: "unprinted", segment: UNIT_SEGMENTS.QUARANTINE });
    store.getState().setProductId(4);
    expect(store.getState()).toMatchObject({ productId: 4, fromSerial: "", toSerial: "", custodyReason: 2 });
    store.getState().setSegment(UNIT_SEGMENTS.WITH_CUSTOMER);
    expect(store.getState()).toMatchObject({ custodyReason: "", labelFilter: "" });
    store.getState().openWith({ search: "x" });
    store.getState().clearAdvanced();
    expect(store.getState()).toMatchObject({ ...EMPTY_UNIT_FILTERS, search: "x" });
  });
});

describe("فرمِ سند", () => {
  const store = () => createDocumentFormStore({ emptyForm: { note: "", items: [] }, formFromDocument: (doc) => ({ note: doc.note }) });

  it("از سند فقط یک‌بار برای هر نسخه؛ نسخه‌ی تازه دوباره", () => {
    const form = store();
    form.getState().initializeFrom({ id: 1, updatedAt: "a", note: "اول" });
    form.getState().setFormData({ note: "ویرایش کاربر" });
    form.getState().initializeFrom({ id: 1, updatedAt: "a", note: "اول" });
    expect(form.getState().formData.note).toBe("ویرایش کاربر");
    form.getState().initializeFrom({ id: 1, updatedAt: "b", note: "دوم" });
    expect(form.getState().formData).toEqual({ note: "دوم", items: [] });
    expect(form.getState().baseline).toBe(form.getState().formData);
  });

  it("پیش‌نویسِ پرداخت با مقدار یا تابع؛ ریست", () => {
    const form = store();
    form.getState().initializeForNew();
    form.getState().setPaymentDraft({ n: 1 });
    form.getState().setPaymentDraft((draft) => ({ n: draft.n + 1 }));
    expect(form.getState().formData.paymentDraft).toEqual({ n: 2 });
    form.getState().resetForm();
    expect(form.getState()).toMatchObject({ initializedForId: null, formData: { note: "", items: [] } });
  });

  it("فروش: سه نوع تغییر از هم جدا", () => {
    const sale = { id: 9, updatedAt: "t", customerId: 4, paymentDate: "2026-11-01", description: "", items: [{ id: 1, productId: 2, quantity: 1, unitPrice: 100 }] };
    useSaleFormStore.getState().initializeFrom(sale);
    const flags = () => [isSaleCoreChanged, isSaleDueDateChanged, isSaleInfoChanged].map((check) => check(useSaleFormStore.getState()));
    expect(flags()).toEqual([false, false, false]);
    useSaleFormStore.getState().setFormData({ description: "x" });
    expect(flags()).toEqual([false, false, true]);
    // همان مقدار با نوعِ دیگر («4» به‌جای 4) تغییر نیست.
    useSaleFormStore.getState().setFormData({ description: "", customerId: "4" });
    expect(flags()).toEqual([false, false, false]);
    useSaleFormStore.getState().setItems([{ id: 1, productId: 2, quantity: 2, unitPrice: 100 }]);
    useSaleFormStore.getState().setFormData({ paymentDate: "2026-12-01" });
    expect(flags()).toEqual([true, true, false]);
    useSaleFormStore.getState().resetForm();
  });
});

describe("باطل کردنِ کش بعد از نوشتن", () => {
  const recorder = () => {
    const calls = [];
    return { calls, invalidateQueries: vi.fn((filter) => calls.push(filter)) };
  };
  const keys = (client) => client.calls.map((filter) => JSON.stringify(filter.queryKey));

  it("فروش: سند، لیست‌ها، کالا و دانه‌ها؛ سندِ تازه و مرجوعیِ تازه باطل نمی‌شوند", () => {
    const client = recorder();
    invalidateSalesEcosystem(client, 5, { freshSale: true, freshReturnId: 8 });
    expect(keys(client)).not.toContain(JSON.stringify(saleKeys.detail(5)));
    expect(keys(client)).toEqual(expect.arrayContaining([JSON.stringify(saleKeys.lists()), JSON.stringify(productUnitKeys.all)]));
    const { predicate } = client.calls.find((filter) => filter.predicate);
    expect(predicate({ queryKey: ["x", "detail", "8"] })).toBe(false);
    expect(predicate({ queryKey: ["x", "detail", "9"] })).toBe(true);

    const plain = recorder();
    invalidateSalesEcosystem(plain, 5);
    expect(keys(plain)).toContain(JSON.stringify(saleKeys.detail(5)));
    expect(plain.calls.find((filter) => filter.predicate).predicate({ queryKey: ["8"] })).toBe(true);
  });

  it("بی شناسه فقط لیست‌ها؛ خرید هم همان الگو", () => {
    const client = recorder();
    invalidateSalesEcosystem(client, null);
    expect(keys(client).some((key) => key.includes('"detail",'))).toBe(false);
    const purchase = recorder();
    invalidatePurchaseEcosystem(purchase, 3);
    expect(keys(purchase)).toEqual(expect.arrayContaining([JSON.stringify(purchaseKeys.detail(3)), JSON.stringify(purchaseKeys.lists()), JSON.stringify(productUnitKeys.all)]));
  });
});
