import {
  Ban,
  Package,
  PackageSearch,
  ShieldAlert,
  ShoppingCart,
  Tag,
  Tags,
  Undo2,
} from "lucide-react";

import { LABEL_FILTERS, UNIT_SEGMENTS } from "../domain/unitVocabulary";

/** آیکنِ هر جایگاه در انتخاب‌گرِ نما. */
export const SEGMENT_ICONS = Object.freeze({
  [UNIT_SEGMENTS.ALL]: PackageSearch,
  [UNIT_SEGMENTS.IN_STOCK]: Package,
  [UNIT_SEGMENTS.QUARANTINE]: ShieldAlert,
  [UNIT_SEGMENTS.WITH_CUSTOMER]: ShoppingCart,
  [UNIT_SEGMENTS.RETURNED]: Undo2,
  [UNIT_SEGMENTS.SCRAPPED]: Ban,
});

export const LABEL_VIEWS = Object.freeze([
  { value: "", icon: Tags, label: "برچسب: همه" },
  { value: LABEL_FILTERS.UNPRINTED, icon: Tag, label: "بدون برچسب" },
  { value: LABEL_FILTERS.PRINTED, icon: Tags, label: "برچسب‌خورده" },
]);
