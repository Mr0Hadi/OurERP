import { describe, expect, it, vi } from "vitest";
import {
  compactParams,
  documentVersion,
  fetchAllPages,
  idempotencyKeyFor,
  idempotent,
  listQuery,
  normalizeListResponse,
  releaseIdempotencyKey,
  toApiAttachments,
} from "./contract";
import { SortDirectionEnum, toApiSort } from "./sorting";
import { unwrapBlobError } from "./blob";

describe("normalizeListResponse", () => {
  it("شکلِ بکند → { items, total, page, totalPages }", () => {
    expect(normalizeListResponse({ userList: [1, 2], page: { page: 2, pageCount: 5, take: 2, total: 9 } })).toEqual({
      items: [1, 2], total: 9, page: 2, totalPages: 5,
    });
    expect(normalizeListResponse({ X: [1], Page: { Page: 1, PageCount: 3, Total: 25 } }, { itemsKey: "X" }).totalPages).toBe(3);
  });

  it("بی PageCount از take حساب می‌شود؛ فهرستِ خالی «صفحه ۱ از ۱»", () => {
    expect(normalizeListResponse({ list: [], page: { total: 25, take: 10 } }).totalPages).toBe(3);
    expect(normalizeListResponse({ list: [], page: { total: 0, pageCount: 0 } }).totalPages).toBe(1);
    expect(normalizeListResponse(null)).toEqual({ items: [], total: 0, page: 1, totalPages: 1 });
  });

  it("پاسخِ از قبل نرمال دست نمی‌خورد", () => {
    const ready = { items: [1], total: 1, page: 1, totalPages: 1, extra: true };
    expect(normalizeListResponse(ready)).toBe(ready);
  });
});

describe("listQuery / compactParams / toApiSort", () => {
  it("صفحه از ۱، فیلترِ خالی و «all» فرستاده نمی‌شود، مرتب‌سازی با نقشه", () => {
    expect(listQuery({
      filters: { fullName: "علی", status: "", teamId: null, kind: "all", isActive: false, minBalance: 0 },
      pagination: { pageIndex: 2, pageSize: 20 },
      sorting: { id: "name", desc: true },
      sortColumns: { name: 4 },
    })).toEqual({ page: 3, take: 20, fullName: "علی", isActive: false, minBalance: 0, sortBy: 4, sortDirection: SortDirectionEnum.DESC });
  });

  it("ستونِ بی‌نقشه یعنی ترتیبِ پیش‌فرضِ سرور", () => {
    expect(toApiSort({ id: "x", desc: false }, {})).toEqual({});
    expect(toApiSort(null, { x: 1 })).toEqual({});
    expect(toApiSort({ id: "x", desc: false }, { x: 0 })).toEqual({ sortBy: 0, sortDirection: SortDirectionEnum.ASC });
    expect(compactParams({ a: undefined, b: 0 })).toEqual({ b: 0 });
  });
});

describe("fetchAllPages", () => {
  const page = (n, totalPages) => ({ rows: [`p${n}a`, `p${n}b`], page: { page: n, pageCount: totalPages } });

  it("همه‌ی صفحه‌ها به ترتیب، با حداکثر ۴ درخواستِ هم‌زمان", async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchPage = vi.fn(async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, (10 - n) * 2));
      inFlight -= 1;
      return page(n, 9);
    });
    const result = await fetchAllPages(fetchPage, { itemsKey: "rows" });
    expect(fetchPage).toHaveBeenCalledTimes(9);
    expect(result.rows).toEqual(Array.from({ length: 9 }, (_, i) => [`p${i + 1}a`, `p${i + 1}b`]).flat());
    expect(peak).toBeLessThanOrEqual(4);
  });

  it("شکستِ یک صفحه کلِ فراخوانی را شکست می‌دهد؛ maxPages رعایت می‌شود", async () => {
    await expect(fetchAllPages(async (n) => {
      if (n === 3) throw new Error("boom");
      return page(n, 6);
    }, { itemsKey: "rows" })).rejects.toThrow("boom");
    const fetchPage = vi.fn(async (n) => page(n, 50));
    await fetchAllPages(fetchPage, { itemsKey: "rows", maxPages: 3 });
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
});

describe("کلیدِ ایدمپوتنسی", () => {
  it("همان محتوا همان کلید (retry و کلیکِ دوباره)، scopeِ دیگر کلیدِ دیگر", () => {
    const body = { amount: 100, type: 0 };
    const key = idempotencyKeyFor(body);
    expect(idempotencyKeyFor({ amount: 100, type: 0 })).toBe(key);
    expect(idempotencyKeyFor(body, "row-2")).not.toBe(key);
    expect(idempotent(key)).toEqual({ headers: { "Idempotency-Key": key } });
    expect(idempotent(null)).toEqual({});
  });

  it("بعد از پاسخِ قطعیِ سرور همان محتوا قصدِ تازه است", () => {
    const body = { amount: 7 };
    const key = idempotencyKeyFor(body);
    releaseIdempotencyKey(key);
    expect(idempotencyKeyFor(body)).not.toBe(key);
    expect(idempotencyKeyFor(null)).not.toBe(idempotencyKeyFor(null));
  });
});

describe("نسخه‌ی سند و پیوست‌ها", () => {
  it("updatedAt اگر هست؛ وگرنه اثرِ انگشتِ محتوا", () => {
    expect(documentVersion({ updatedAt: "t1", status: 1 })).toBe("t1");
    const doc = { status: 1, invoiceNumber: "A", totalAmount: 10, items: [1], attachments: [] };
    expect(documentVersion(doc)).not.toBe(documentVersion({ ...doc, totalAmount: 11 }));
    expect(documentVersion({ ...doc })).toBe(documentVersion(doc));
    expect(documentVersion(null)).toBe(null);
  });

  it("پیوستِ بی‌فایل حذف، فیلدِ خالی undefined", () => {
    expect(toApiAttachments([{ objectKey: "k", fileName: "", note: "n" }, { fileName: "x" }, null])).toEqual([
      { objectKey: "k", fileName: undefined, note: "n" },
    ]);
  });
});

describe("unwrapBlobError", () => {
  it("پیامِ فارسیِ JSON از بدنه‌ی Blob بیرون می‌آید", async () => {
    const error = { response: { data: new Blob([JSON.stringify({ Message: "فایل پیدا نشد" })]) } };
    await expect(unwrapBlobError(error)).rejects.toMatchObject({ serverMessage: "فایل پیدا نشد" });
  });
  it("بدنه‌ی غیر JSON یا غیر Blob همان خطا", async () => {
    const html = { response: { data: new Blob(["<html>"]) } };
    await expect(unwrapBlobError(html)).rejects.toBe(html);
    expect(html.serverMessage).toBeUndefined();
    const plain = new Error("x");
    await expect(unwrapBlobError(plain)).rejects.toBe(plain);
  });
});
