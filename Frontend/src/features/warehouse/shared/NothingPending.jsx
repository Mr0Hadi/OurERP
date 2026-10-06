import { CheckCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/** وقتی برای این مرجوعی کاری در انبار نمانده — با برگشت به خودِ مرجوعی. */
export default function NothingPending({ message, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <CheckCircle className="h-12 w-12 text-success" />
      <p className="text-lg text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onBack}>
        بازگشت به مرجوعی
      </Button>
    </div>
  );
}
