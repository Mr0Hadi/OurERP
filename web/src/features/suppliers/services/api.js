import { api } from "@/shared/lib/api";

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
    postalCode: s.postal_code || "",
    notes: s.notes || "",
    balance: s.balance || 0,
    balanceType: s.balance_type || "none",
    avatar: null,
    coordinates: s.latitude != null && s.longitude != null
      ? { lat: s.latitude, lng: s.longitude }
      : null,
  };
}

function mapSupplierForCreate(data) {
  const result = {
    name: data.companyName || "",
    contact_name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
    phone: data.phone || "",
    address: data.address || "",
    postal_code: data.postalCode || "",
    latitude: data.coordinates?.lat ?? null,
    longitude: data.coordinates?.lng ?? null,
    balance_type: data.balanceType || "none",
    balance: data.balance || 0,
    notes: data.notes || "",
  };
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
