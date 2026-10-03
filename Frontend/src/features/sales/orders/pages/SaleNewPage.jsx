import { usePageHeader } from "@/shared/hooks/usePageHeader";
import SaleForm from "./SaleForm";

/** ثبتِ فروشِ جدید (`SaleForm` بی سند). */
export default function SaleNewPage() {
  usePageHeader({ title: "فروش جدید", showBack: true });
  return <SaleForm />;
}
