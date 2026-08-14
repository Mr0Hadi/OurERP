// src/features/warehouse/products/components/forms/GenerateFieldButton.jsx
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

export default function GenerateFieldButton({ onClick, isPending, title }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={isPending}
      title={title}
      className="shrink-0"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      تولید خودکار
    </Button>
  );
}
