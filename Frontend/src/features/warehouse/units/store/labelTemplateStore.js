import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_LABEL_TEMPLATE } from "../domain/labelTemplate";

/**
 * قالبِ برچسب به پرینتر و اسکنرِ انبار بستگی دارد، نه به این دسته‌ی خاص؛
 * پس بینِ نشست‌ها می‌ماند. `fields` جدا ادغام می‌شود تا فیلدِ تازه‌ای که
 * بعداً به قالب اضافه شود، در ذخیره‌ی قدیمیِ مرورگر گم نشود.
 */
export const useLabelTemplateStore = create(
  persist(
    (set) => ({
      template: DEFAULT_LABEL_TEMPLATE,
      updateTemplate: (patch) =>
        set((state) => ({ template: { ...state.template, ...patch } })),
      setField: (key, value) =>
        set((state) => ({
          template: {
            ...state.template,
            fields: { ...state.template.fields, [key]: value },
          },
        })),
      resetTemplate: () => set({ template: DEFAULT_LABEL_TEMPLATE }),
    }),
    {
      name: "unit-label-template",
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted?.template ?? {};
        return {
          ...current,
          template: {
            ...DEFAULT_LABEL_TEMPLATE,
            ...saved,
            custom: { ...DEFAULT_LABEL_TEMPLATE.custom, ...saved.custom },
            fields: { ...DEFAULT_LABEL_TEMPLATE.fields, ...saved.fields },
          },
        };
      },
    },
  ),
);
