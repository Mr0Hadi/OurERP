import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTES } from "@/shared/constants/routes";
import { DocumentKindEnum } from "@/shared/domain/enums/documentKind";
import { PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { AuditOperationEnum, actionGroupOf, actionTitleOf } from "./auditEnums";
import { STANDALONE_ENTITY_TYPES, changeTargetOf, entityLabelOf, fieldLabelOf, formatAuditValue } from "./auditVocabulary";

describe("مقدارِ تاریخچه", () => {
  it("خالی، پنهان، بله/خیر", () => {
    expect([null, undefined, ""].map((value) => formatAuditValue("Sale", "Note", value).kind)).toEqual(["empty", "empty", "empty"]);
    expect(formatAuditValue("User", "PasswordHash", "***")).toEqual({ text: "پنهان", kind: "secret" });
    expect([formatAuditValue("X", "IsActive", true).text, formatAuditValue("X", "IsActive", false).text]).toEqual(["بله", "خیر"]);
  });

  it("enum با برچسب (نوعِ خاص یا *)، شناسه با #، عدد با جداکننده", () => {
    expect(formatAuditValue("Sale", "Status", SaleStatusEnum.PROFORMA).text).toBe("پیش‌فاکتور");
    expect(formatAuditValue("Purchase", "PaymentType", 0).text).not.toBe("۰");
    expect(formatAuditValue("PaymentDetail", "Purpose", PaymentPurposeEnum.NORMAL).text).toBe("عادی");
    expect(formatAuditValue("PaymentDetail", "Purpose", PaymentPurposeEnum.INSTALLMENT).text).toBe("قسط");
    expect(formatAuditValue("Sale", "Status", 999).text).toBe("۹۹۹");
    expect(formatAuditValue("Sale", "CustomerId", 1234).text).toBe("#۱۲۳۴");
    expect(formatAuditValue("Sale", "TotalAmount", 1234567).text).toBe("۱٬۲۳۴٬۵۶۷");
  });

  it("تاریخِ ISO شمسی؛ متنِ عددی رقم‌به‌رقم با صفرِ اول", () => {
    expect(formatAuditValue("Sale", "InvoiceDate", "2026-10-28T10:30:00").text).toContain("۱۴۰۵/۰۸/۰۶");
    expect(formatAuditValue("Customer", "PhoneNumber", "09121234567").text).toBe("۰۹۱۲۱۲۳۴۵۶۷");
    expect(formatAuditValue("Customer", "NationalId", "0012345678").text).toBe("۰۰۱۲۳۴۵۶۷۸");
    expect(formatAuditValue("Customer", "Name", "0912").text).toBe("0912");
    expect(formatAuditValue("X", "Data", { a: 1 }).text).toBe('{"a":1}');
  });
});

describe("پیوندِ تغییر", () => {
  it("سند مقدم بر سطر", () => {
    const target = changeTargetOf({ documentKind: DocumentKindEnum.SALE, documentId: 12, entityType: "SaleItem", entityKey: "5" });
    expect(target).toEqual({ label: "فروش ۱۲", to: ROUTES.SALES_DETAIL.replace(":id", "12") });
    expect(changeTargetOf({ documentKind: 99, documentId: 1 })).toEqual({ label: "سند ۱", to: null });
  });

  it("سطرِ مستقل: کلیدِ تک‌بخشی پیوند دارد؛ حذف‌شده و کلیدِ ترکیبی نه", () => {
    expect(changeTargetOf({ entityType: "Customer", entityKey: "7", operation: AuditOperationEnum.UPDATE })).toEqual({ label: "مشتری ۷", to: ROUTES.CUSTOMERS_DETAIL.replace(":id", "7") });
    expect(changeTargetOf({ entityType: "Customer", entityKey: "7", operation: AuditOperationEnum.DELETE }).to).toBe(null);
    expect(changeTargetOf({ entityType: "UserPermission", entityKey: "3-15" })).toEqual({ label: `${entityLabelOf("UserPermission")} 3-15`, to: null });
    expect(changeTargetOf({ entityType: "Unknown", entityKey: "1" }).label).toBe("Unknown ۱");
  });

  it("نامِ ناشناخته همان نامِ انگلیسی؛ همه‌ی نوع‌های مستقل برچسب دارند", () => {
    expect([fieldLabelOf("Nope"), entityLabelOf("Nope")]).toEqual(["Nope", "Nope"]);
    for (const type of STANDALONE_ENTITY_TYPES) expect(entityLabelOf(type), type).not.toBe(type);
  });
});

describe("گروهِ عملیات", () => {
  it("بازه‌ها و پیش‌فرض‌ها", () => {
    expect([actionGroupOf(null).label, actionGroupOf(1).label, actionGroupOf(250).label, actionGroupOf(5000).label]).toEqual(["سیستم", "نشست", "خرید", "سایر"]);
    expect([actionTitleOf({ actionTitle: "ثبت فروش" }), actionTitleOf({}), actionTitleOf(null)]).toEqual(["ثبت فروش", "تغییر سیستمی", "تغییر سیستمی"]);
  });

  const AUDIT_ACTIONS = resolve(import.meta.dirname, "../../../../../Backend-Net/Domain/Enums/AuditActionEnum.cs");
  it.skipIf(!existsSync(AUDIT_ACTIONS))("هر `AuditActionEnum`ِ بکند در گروهی جز «سایر» می‌افتد", () => {
    const values = [...readFileSync(AUDIT_ACTIONS, "utf8").matchAll(/^\s*(\w+)\s*=\s*(\d+)/gm)].map(([, name, value]) => [name, Number(value)]);
    expect(values.length).toBeGreaterThan(50);
    expect(values.filter(([, value]) => actionGroupOf(value).label === "سایر")).toEqual([]);
  });
});
