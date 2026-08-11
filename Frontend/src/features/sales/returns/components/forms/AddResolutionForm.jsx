import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  RESOLUTION_TYPES,
  RESOLUTION_TYPE_LABELS,
} from "../../services/mockData";

export default function AddResolutionForm({ item, remaining, onAdd, isBusy }) {
  const [type, setType] = useState(RESOLUTION_TYPES.REFUND);
  const [qty, setQty] = useState(remaining);
  const [refundAmount, setRefundAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setQty(remaining);
  }, [remaining]);

  const handleSubmit = () => {
    const numQty = Number(qty);
    if (!numQty || numQty <= 0) return;
    onAdd({
      type,
      qty: numQty,
      refundAmount:
        type === RESOLUTION_TYPES.REFUND
          ? Number(refundAmount) || numQty * item.unitPrice
          : 0,
      note,
    });
    setNote("");
    setRefundAmount("");
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-2.5 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RESOLUTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min={1}
          max={remaining}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="تعداد"
          className="h-8 text-xs text-center"
        />

        {type === RESOLUTION_TYPES.REFUND ? (
          <Input
            type="number"
            dir="ltr"
            min={0}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={(
              Number(qty) * item.unitPrice || 0
            ).toLocaleString("fa-IR")}
            className="h-8 text-xs"
          />
        ) : (
          <div className="hidden lg:block" />
        )}

        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="یادداشت (اختیاری)..."
          className="h-8 text-xs"
        />
      </div>
      <Button
        type="button"
        size="sm"
        className="w-full gap-1.5 h-8 text-xs"
        onClick={handleSubmit}
        disabled={isBusy || !qty || Number(qty) <= 0}
      >
        <Plus className="h-3.5 w-3.5" />
        ثبت این تصمیم برای {Number(qty || 0).toLocaleString("fa-IR")} عدد
      </Button>
    </div>
  );
}
