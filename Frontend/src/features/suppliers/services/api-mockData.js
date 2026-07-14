// src/features/suppliers/services/suppliersApi.js

import { api } from "@/shared/services/api/axios";

// ==========================================
// مسیر پایه‌ی این ریسورس
// ==========================================
const BASE_URL = "/suppliers";

// ==========================================
// دریافت لیست تامین‌کنندگان (صفحه‌بندی + جستجو + مرتب‌سازی)
// ==========================================
// انتظار از بک‌اند (Go):
//   GET /suppliers?page=&limit=&search=&minBalance=&maxBalance=&sortBy=&sortOrder=
//   Response: { items: [...], total: number, page: number, totalPages: number }
//
// آرگومان دوم (signal) برای پشتیبانی از cancel کردن ریکوئست‌های قبلی
// است (مثلاً وقتی React Query یا هر لایه‌ی دیگر با AbortController
// درخواست جستجوی قبلی رو لغو می‌کنه).
export async function fetchSuppliers(
  {
    page = 1,
    limit = 10,
    search = "",
    minBalance = "",
    maxBalance = "",
    sortBy = "companyName",
    sortOrder = "asc",
  } = {},
  { signal } = {}
) {
  return api.get(
    BASE_URL,
    { page, limit, search, minBalance, maxBalance, sortBy, sortOrder },
    { signal }
  );
}

// ==========================================
// ساخت تامین‌کننده جدید
// ==========================================
// انتظار از بک‌اند:
//   POST /suppliers   body: supplierData
//   Response: تامین‌کننده‌ی ساخته‌شده با id تولیدشده توسط سرور
export async function createSupplier(supplierData) {
  return api.post(BASE_URL, supplierData);
}

// ==========================================
// دریافت یک تامین‌کننده بر اساس id
// ==========================================
// انتظار از بک‌اند:
//   GET /suppliers/:id
//   Response: آبجکت تامین‌کننده
//   اگر پیدا نشد → status 404 با body مثل { message: "تامین‌کننده یافت نشد" }
//   (نیازی به throw دستی نیست؛ interceptor خودش این را نرمالایز می‌کند)
export async function getSupplierById(id, { signal } = {}) {
  return api.get(`${BASE_URL}/${id}`, undefined, { signal });
}

// ==========================================
// ویرایش تامین‌کننده
// ==========================================
// انتظار از بک‌اند:
//   PUT /suppliers/:id   body: updatedData
//   Response: آبجکت به‌روزشده‌ی تامین‌کننده
export async function updateSupplier(id, updatedData) {
  return api.put(`${BASE_URL}/${id}`, updatedData);
}

// ==========================================
// حذف تامین‌کننده
// ==========================================
// انتظار از بک‌اند:
//   DELETE /suppliers/:id
//   Response: { success: true, id } یا حتی 204 بدون بدنه
export async function deleteSupplier(id) {
  return api.delete(`${BASE_URL}/${id}`);
}
