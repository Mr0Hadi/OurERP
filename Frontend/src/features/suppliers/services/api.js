import { api } from "@/shared/services/api/api";

function mapSupplier(s) {
  const contactParts = (s.contact_name || "").split(" ");
  return {
    id: String(s.id),
    companyName: s.name || "",
    firstName: contactParts[0] || "",
    lastName: contactParts.slice(1).join(" ") || "",
    phone: s.phone || "",
    email: "",
    address: s.address || "",
    postalCode: "",
    notes: s.notes || "",
    balance: 0,
    avatar: null,
    coordinates: null,
  };
}

function mapSupplierForCreate(data) {
  const result = {
    name: data.companyName || "",
    contact_name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
    phone: data.phone || "",
    address: data.address || "",
    notes: data.notes || "",
  };
  Object.keys(result).forEach((k) => {
    if (result[k] === "" || result[k] === undefined || result[k] === null) delete result[k];
  });
  return result;
}

export async function fetchSuppliers({
  page = 1,
  limit = 10,
  search = "",
  sortBy = "companyName",
  sortOrder = "asc",
} = {}) {
  const res = await api.get("/api/suppliers", {
    page,
    page_size: limit,
    search: search || undefined,
  });
  return {
    items: (res.data || []).map(mapSupplier),
    total: res.meta?.total_count ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.total_pages ?? 1,
  };
}

export async function createSupplier(supplierData) {
  const res = await api.post("/api/suppliers", mapSupplierForCreate(supplierData));
  return mapSupplier(res.data);
}

export const getSupplierById = async (id) => {
  const res = await api.get(`/api/suppliers/${id}`);
  return mapSupplier(res.data);
};

export const updateSupplier = async (id, updatedData) => {
  const res = await api.put(`/api/suppliers/${id}`, mapSupplierForCreate(updatedData));
  return mapSupplier(res.data);
};

export const deleteSupplier = async (id) => {
  await api.delete(`/api/suppliers/${id}`);
  return { success: true, id };
};
