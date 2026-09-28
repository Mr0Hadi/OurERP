import {
  Clock,
  FileText,
  Loader2,
  PackageCheck,
  PackageOpen,
  Truck,
  Undo2,
  XCircle,
} from "lucide-react";

import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";

/**
 * آیکنِ هر وضعیتِ سند — یک‌جا، تا «ارسال شده» در فرمِ فروش و در صفِ ارسالِ
 * انبار یک آیکن داشته باشد (قبلاً هر کارت نقشه‌ی خودش را داشت و با هم
 * نمی‌خواندند). رنگ از `*_STATUS_TONES` در دامنه می‌آید.
 */
export const PURCHASE_STATUS_ICONS = Object.freeze({
  [PurchaseStatusEnum.PROFORMA]: FileText,
  [PurchaseStatusEnum.PENDING]: Clock,
  [PurchaseStatusEnum.SHIPPED]: Truck,
  [PurchaseStatusEnum.PARTIALLY_RECEIVED]: PackageOpen,
  [PurchaseStatusEnum.RECEIVED]: PackageCheck,
  [PurchaseStatusEnum.CANCELLED]: XCircle,
});

export const SALE_STATUS_ICONS = Object.freeze({
  [SaleStatusEnum.PROFORMA]: FileText,
  [SaleStatusEnum.PROCESSING]: Loader2,
  [SaleStatusEnum.PARTIALLY_DELIVERED]: PackageOpen,
  [SaleStatusEnum.SHIPPED]: Truck,
  [SaleStatusEnum.DELIVERED]: PackageCheck,
  [SaleStatusEnum.CANCELLED]: XCircle,
  [SaleStatusEnum.RETURNED]: Undo2,
});
