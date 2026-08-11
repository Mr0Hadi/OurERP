import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function SortIcon({ direction }) {
  if (direction === "asc") return <ArrowUp className="h-4 w-4" />;
  if (direction === "desc") return <ArrowDown className="h-4 w-4" />;
  return <ArrowUpDown className="h-4 w-4 opacity-40" />;
}
