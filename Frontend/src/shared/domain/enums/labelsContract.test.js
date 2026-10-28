import { describe, expect, it } from "vitest";
import { TONES } from "@/shared/lib/tone";

/**
 * هر عضوِ enum برچسب و (اگر نقشه دارد) tone دارد؛ برچسبِ کهنه برای عضوی که دیگر نیست هم نه —
 * وگرنه وضعیتِ تازه‌ی سرور در جدول «2» نشان داده می‌شد. نقشه‌ها با نامِ export از همه‌ی ماژول‌های
 * domain پیدا می‌شوند. enumِ تازه با برچسب‌هایش را اینجا اضافه کنید.
 */
const modules = import.meta.glob(
  ["/src/**/domain/**/*.js", "/src/shared/domain/enums/*.js", "!/src/**/*.test.js"],
  { eager: true },
);
const exportsByName = Object.assign({}, ...Object.values(modules));

/** enum → نقشه‌هایی که باید *همه‌ی* اعضایش را داشته باشند. */
const COMPLETE_MAPS = {
  ChequeStatusEnum: ["CHEQUE_STATUS_LABELS", "CHEQUE_STATUS_TONES"],
  OrgRoleEnum: ["ORG_ROLE_LABELS"],
  PartyLedgerEntryTypeEnum: ["PARTY_LEDGER_ENTRY_TYPE_LABELS"],
  PartyLedgerDirectionEnum: ["PARTY_LEDGER_DIRECTION_LABELS"],
  PaymentTypeEnum: ["PAYMENT_TYPE_LABELS", "PAYMENT_TYPE_TONES"],
  BankAccountKindEnum: ["BANK_ACCOUNT_KIND_LABELS"],
  BankAccountMovementKindEnum: ["BANK_ACCOUNT_MOVEMENT_LABELS"],
  SaleProformaStageEnum: ["SALE_PROFORMA_STAGE_LABELS", "SALE_PROFORMA_STAGE_TONES"],
  SaleProformaEventEnum: ["SALE_PROFORMA_EVENT_TONES"],
  SaleWarehouseIssueResolutionEnum: ["SALE_WAREHOUSE_ISSUE_RESOLUTION_LABELS"],
  PurchaseStatusEnum: ["PURCHASE_STATUS_LABELS", "PURCHASE_STATUS_TONES"],
  SaleInstallmentPlanStatusEnum: ["INSTALLMENT_PLAN_STATUS_LABELS", "INSTALLMENT_PLAN_STATUS_TONES"],
  SaleInstallmentStatusEnum: ["INSTALLMENT_STATUS_LABELS", "INSTALLMENT_STATUS_TONES"],
  SaleStatusEnum: ["SALE_STATUS_LABELS", "SALE_STATUS_TONES"],
  DocumentKindEnum: ["DOCUMENT_KIND_LABELS"],
  ProductUnitStatusEnum: ["UNIT_STATUS_LABELS", "UNIT_STATUS_TONES"],
  UnitCustodyReasonEnum: ["UNIT_CUSTODY_REASON_LABELS"],
  TaxCategoryEnum: ["TAX_CATEGORY_LABELS"],
  AccountingPartyTypeEnum: ["ACCOUNTING_PARTY_TYPE_LABELS", "ACCOUNTING_PARTY_TYPE_TONES"],
  PartyBalanceStateEnum: ["PARTY_BALANCE_STATE_LABELS"],
  InvoicePaymentStateEnum: ["INVOICE_PAYMENT_STATE_LABELS"],
  DocumentSideEnum: ["DOCUMENT_SIDE_LABELS"],
  AuditOperationEnum: ["AUDIT_OPERATION_LABELS", "AUDIT_OPERATION_TONES", "AUDIT_OPERATION_ICONS"],
  UnitActionReasonEnum: ["UNIT_ACTION_REASON_LABELS"],
  UnitActionEnum: ["UNIT_ACTION_META"],
  RETURN_PROBLEMS: ["RETURN_PROBLEM_LABELS", "RETURN_PROBLEM_STYLES"],
  RETURN_STATUSES: ["RETURN_STATUS_TONES"],
  OFF_SCOPE_KINDS: ["OFF_SCOPE_KIND_STYLES"],
};

const keysOf = (map) => Object.keys(map).map(String).sort();
const valuesOf = (enumObject) => Object.values(enumObject).map(String).sort();

describe("برچسب، tone و آیکنِ enumها", () => {
  it.each(Object.entries(COMPLETE_MAPS))("%s", (enumName, mapNames) => {
    const enumObject = exportsByName[enumName];
    expect(enumObject, `export ${enumName} پیدا نشد`).toBeTruthy();
    expect(Object.isFrozen(enumObject) || enumName === enumName.toUpperCase(), `${enumName} باید Object.freeze باشد`).toBe(true);
    expect(new Set(Object.values(enumObject)).size, "عددِ تکراری در enum").toBe(Object.values(enumObject).length);

    for (const mapName of mapNames) {
      const map = exportsByName[mapName];
      expect(map, `export ${mapName} پیدا نشد`).toBeTruthy();
      expect(keysOf(map), `${mapName} همه‌ی اعضای ${enumName} را دارد و عضوِ اضافه ندارد`).toEqual(valuesOf(enumObject));
      for (const entry of Object.values(map)) {
        if (mapName.endsWith("_TONES")) expect(TONES, `${mapName}: tone نامعتبر`).toContain(entry);
        else expect(entry, `${mapName}: مقدارِ خالی`).toBeTruthy();
      }
    }
  });

  it("زیرمجموعه‌ها فقط از اعضای enumِ اصلی‌اند", () => {
    const { PaymentTypeEnum, RETURN_PROBLEMS, DOCUMENT_PAYMENT_TYPE_LABELS, SALE_PAYMENT_TYPE_LABELS } = exportsByName;
    const paymentTypes = Object.values(PaymentTypeEnum).map(String);
    for (const subset of [DOCUMENT_PAYMENT_TYPE_LABELS, SALE_PAYMENT_TYPE_LABELS]) {
      expect(paymentTypes).toEqual(expect.arrayContaining(Object.keys(subset)));
    }
    for (const list of ["RETURN_PAYMENT_METHODS", "SPLITTABLE_PAYMENT_TYPES", "DOCUMENT_PAYMENT_TYPES"]) {
      expect(Object.values(PaymentTypeEnum)).toEqual(expect.arrayContaining([...exportsByName[list]]));
    }
    const problems = Object.values(RETURN_PROBLEMS);
    for (const name of ["PURCHASE_RETURN_PROBLEMS", "SALES_RETURN_PROBLEMS", "OBSERVATION_PROBLEMS"]) {
      expect(problems).toEqual(expect.arrayContaining(Object.values(exportsByName[name])));
    }
  });
});
