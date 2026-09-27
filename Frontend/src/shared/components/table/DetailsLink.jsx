import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";

/**
 * دکمه‌ی «جزئیات» ردیفِ جدول — یک لینکِ واقعی، نه `onClick={navigate}`،
 * تا کاربر بتواند سند را با کلیکِ وسط یا Ctrl+کلیک در تبِ جدید باز کند.
 */
export default function DetailsLink({ to, state, children = "جزئیات" }) {
  return (
    <Button asChild variant="outline" size="sm" className="gap-1">
      <Link to={to} state={state}>
        {children}
        <ChevronLeft className="size-4" />
      </Link>
    </Button>
  );
}
