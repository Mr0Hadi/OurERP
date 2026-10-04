import ReturnTable from "@/shared/components/returns/ReturnTable";
import { ROUTES } from "@/shared/constants/routes";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import {
  PURCHASE_RETURN_PROBLEM_LABELS,
  PURCHASE_RETURN_PROBLEM_STYLES,
} from "../../domain/purchaseReturnVocabulary";

const CONFIG = {
  side: sideConfig(RETURN_SIDES.PURCHASE),
  invoice: { key: "purchaseInvoiceNumber", header: "فاکتور خرید" },
  party: { key: "supplierName", header: "تامین‌کننده" },
  problemLabels: PURCHASE_RETURN_PROBLEM_LABELS,
  problemStyles: PURCHASE_RETURN_PROBLEM_STYLES,
  detailRoute: ROUTES.PURCHASES_RETURNS_DETAIL,
};

/** فهرستِ مرجوعی‌های خرید (`ReturnTable`). */
export default function PurchaseReturnTable(props) {
  return <ReturnTable config={CONFIG} {...props} />;
}
