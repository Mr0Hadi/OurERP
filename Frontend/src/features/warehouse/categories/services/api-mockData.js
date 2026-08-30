// src/features/warehouse/categories/services/api-mockData.js
import { allProductCategories } from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchProductCategories = async ({ name = "" } = {}) => {
  await delay(200);

  const rows = name
    ? allProductCategories.filter((c) => c.name.includes(name))
    : allProductCategories;

  return { items: rows, total: rows.length, page: 1, totalPages: 1 };
};

export const createProductCategory = async ({ name }) => {
  await delay(300);

  const trimmed = String(name ?? "").trim();
  if (!trimmed) throw new Error("نام دسته‌بندی نمی‌تواند خالی باشد");

  const existing = allProductCategories.find((c) => c.name === trimmed);
  if (existing) return existing;

  const category = {
    id: allProductCategories.reduce((max, c) => Math.max(max, c.id), 0) + 1,
    name: trimmed,
    productCount: 0,
  };

  allProductCategories.push(category);
  return category;
};
