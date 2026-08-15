// src/features/warehouse/units/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";

export const fetchPendingLabelProducts = async (params) => {
  const { data } = await axiosInstance.get("/product-units/pending-labels", {
    params,
  });
  return data;
};

export const fetchProductUnits = async (params) => {
  const { data } = await axiosInstance.get("/product-units", { params });
  return data;
};

export const fetchUnitByCode = async (code) => {
  const { data } = await axiosInstance.get(
    `/product-units/by-code/${encodeURIComponent(code)}`,
  );
  return data;
};

export const fetchUnitLabelSummary = async () => {
  const { data } = await axiosInstance.get("/product-units/summary");
  return data;
};

export const generateProductUnits = async (payload) => {
  const { data } = await axiosInstance.post("/product-units/generate", payload);
  return data;
};

export const markUnitsPrinted = async (unitIds) => {
  const { data } = await axiosInstance.post("/product-units/print", { unitIds });
  return data;
};

/**
 * در بک‌اند واقعی، تخصیص و ارسال واحدها اثر جانبیِ ثبت فروش و تأیید
 * ارسال است و سرویس جدایی ندارد؛ این دو فقط برای حالت‌های اصلاح دستی
 * پیش‌بینی شده‌اند.
 */
export const allocateUnitsForSale = async (saleId, items) => {
  const { data } = await axiosInstance.post(
    `/product-units/allocate/${saleId}`,
    { items },
  );
  return data;
};

export const markUnitsShipped = async (saleId, items) => {
  const { data } = await axiosInstance.post(`/product-units/ship/${saleId}`, {
    items,
  });
  return data;
};
