import { describe, expect, it } from "vitest";
import { SaleInstallmentStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { DEFAULT_INSTALLMENT_VIEW, INSTALLMENT_VIEWS, installmentListParams } from "./installmentViews";

const TODAY = "2026-10-28";

describe("نماهای اقساط", () => {
  it("هر نما وضعیتِ خودش؛ ناشناخته = پیش‌فرض", () => {
    expect(installmentListParams({ view: "paid", customerId: 3 }, TODAY)).toEqual({ customerId: 3, status: SaleInstallmentStatusEnum.PAID, fromDueDate: undefined, toDueDate: undefined });
    expect(installmentListParams({ view: "all" }, TODAY).status).toBeUndefined();
    expect(installmentListParams({ view: "؟" }, TODAY).status).toBe(INSTALLMENT_VIEWS[DEFAULT_INSTALLMENT_VIEW].status);
    expect(INSTALLMENT_VIEWS[DEFAULT_INSTALLMENT_VIEW].status).toBe(SaleInstallmentStatusEnum.OVERDUE);
  });

  it("«پیش‌رو»: از امروز، یا تاریخِ کاربر اگر دیرتر است", () => {
    expect(installmentListParams({ view: "upcoming" }, TODAY).fromDueDate).toBe(TODAY);
    expect(installmentListParams({ view: "upcoming", fromDueDate: "2026-01-01" }, TODAY).fromDueDate).toBe(TODAY);
    expect(installmentListParams({ view: "upcoming", fromDueDate: "2026-12-01", toDueDate: "2027-01-01" }, TODAY)).toMatchObject({
      status: SaleInstallmentStatusEnum.PENDING, fromDueDate: "2026-12-01", toDueDate: "2027-01-01",
    });
    expect(installmentListParams({ view: "pending", fromDueDate: "2026-01-01" }, TODAY).fromDueDate).toBe("2026-01-01");
  });
});
