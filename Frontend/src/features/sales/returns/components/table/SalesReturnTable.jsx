import ReturnTable from "@/shared/components/returns/ReturnTable";
import { ROUTES } from "@/shared/constants/routes";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import {
  SALES_RETURN_PROBLEM_LABELS,
  SALES_RETURN_PROBLEM_STYLES,
} from "../../domain/salesReturnVocabulary";

const CONFIG = {
  side: sideConfig(RETURN_SIDES.SALES),
  invoice: { key: "saleInvoiceNumber", header: "فاکتور فروش" },
  party: { key: "customerName", header: "مشتری" },
  problemLabels: SALES_RETURN_PROBLEM_LABELS,
  problemStyles: SALES_RETURN_PROBLEM_STYLES,
  detailRoute: ROUTES.SALES_RETURNS_DETAIL,
};

/** فهرستِ مرجوعی‌های فروش (`ReturnTable`). */
export default function SalesReturnTable(props) {
  return <ReturnTable config={CONFIG} {...props} />;
}
