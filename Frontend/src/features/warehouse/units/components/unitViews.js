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

/** هر جایگاه با آیکون و یک توضیحِ کوتاه — «این دانه‌ها در چه حالی‌اند». */
export const SEGMENT_VIEWS = Object.freeze({
  [UNIT_SEGMENTS.ALL]: { icon: PackageSearch, hint: "همه‌ی دانه‌ها در هر جایگاه" },
  [UNIT_SEGMENTS.IN_STOCK]: { icon: Package, hint: "روی قفسه، قابل فروش" },
  [UNIT_SEGMENTS.QUARANTINE]: { icon: ShieldAlert, hint: "کنار گذاشته، منتظرِ تصمیم" },
  [UNIT_SEGMENTS.WITH_CUSTOMER]: { icon: ShoppingCart, hint: "فروخته و تحویل‌شده" },
  [UNIT_SEGMENTS.RETURNED]: { icon: Undo2, hint: "به تامین‌کننده برگشته" },
  [UNIT_SEGMENTS.SCRAPPED]: { icon: Ban, hint: "از چرخه خارج شده" },
});

export const LABEL_VIEWS = Object.freeze([
  { value: "", icon: Tags, label: "همه", hint: "برچسب‌خورده یا نه" },
  { value: LABEL_FILTERS.UNPRINTED, icon: Tag, label: "بدون برچسب", hint: "صفِ چاپ" },
  { value: LABEL_FILTERS.PRINTED, icon: Tags, label: "برچسب‌خورده", hint: "دست‌کم یک بار چاپ شده" },
]);
