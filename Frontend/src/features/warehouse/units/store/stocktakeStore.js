import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * وضعیتِ یک شمارشِ در جریان. شمارشِ یک قفسه‌ی بزرگ ممکن است با رفرش،
 * قطعِ شبکه یا عوض شدنِ تب قطع شود؛ پس در مرورگر می‌ماند تا انباردار از
 * همان‌جا ادامه دهد.
 *
 * `counted` فقط payload است — خودِ دانه‌ها از فهرستِ انتظار می‌آیند.
 * `unexpected` هر اسکنی است که در آن فهرست نبود، با وضعیتی که سرور
 * برایش گفت (یا `null` تا جواب برسد).
 */
const initialState = {
  productId: "",
  startedAt: null,
  counted: [],
  unexpected: [],
  lastScan: null,
};

export const useStocktakeStore = create(
  persist(
    (set) => ({
      ...initialState,

      start: (productId) =>
        set({ ...initialState, productId, startedAt: new Date().toISOString() }),

      reset: () => set(initialState),

      /** همان کالا از اول — اسکن‌ها پاک می‌شوند، کالا می‌ماند. */
      restart: () =>
        set((state) => ({
          ...initialState,
          productId: state.productId,
          startedAt: new Date().toISOString(),
        })),

      addCounted: (payload) =>
        set((state) => ({ counted: [...state.counted, payload] })),

      removeCounted: (payload) =>
        set((state) => ({ counted: state.counted.filter((p) => p !== payload) })),

      addUnexpected: (entry) =>
        set((state) =>
          state.unexpected.some((u) => u.payload === entry.payload)
            ? state
            : { unexpected: [entry, ...state.unexpected] },
        ),

      resolveUnexpected: (payload, patch) =>
        set((state) => ({
          unexpected: state.unexpected.map((u) =>
            u.payload === payload ? { ...u, ...patch } : u,
          ),
        })),

      removeUnexpected: (payload) =>
        set((state) => ({
          unexpected: state.unexpected.filter((u) => u.payload !== payload),
        })),

      setLastScan: (lastScan) => set({ lastScan }),
    }),
    { name: "unit-stocktake" },
  ),
);
