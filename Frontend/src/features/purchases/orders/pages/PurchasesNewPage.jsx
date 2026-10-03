import { usePageHeader } from "@/shared/hooks/usePageHeader";
import PurchaseForm from "./PurchaseForm";

/** ثبتِ خریدِ جدید (`PurchaseForm` بی سند). */
export default function PurchasesNewPage() {
  usePageHeader({ title: "خرید جدید", showBack: true });
  return <PurchaseForm />;
}
