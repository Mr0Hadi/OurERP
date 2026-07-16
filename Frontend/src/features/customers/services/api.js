import { api } from "@/shared/services/api/api";

export async function fetchCustomers({
  page = 1,
  limit = 10,
  search = "",
  sortBy = "lastName",
  sortOrder = "asc",
} = {}) {
  const res = await api.get("/api/customers", {
    page,
    page_size: limit,
    search: search || undefined,
  });
  return {
    items: res.data || [],
    total: res.meta?.totalCount ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function createCustomer(customerData) {
  const res = await api.post("/api/customers", {
    firstName: customerData.firstName || "",
    lastName: customerData.lastName || "",
    phone: customerData.phone || "",
    email: customerData.email || "",
    address: customerData.address || "",
    postalCode: customerData.postalCode || "",
    nationalId: customerData.nationalId || "",
    type: customerData.type || "retail",
    customerGrade: parseInt(customerData.customerGrade) || 1,
    referralCode: customerData.referralCode || "",
    creditLimit: parseFloat(customerData.creditLimit) || 0,
    balanceType: customerData.balanceType || "none",
    openingBalance: parseFloat(customerData.openingBalance) || 0,
    notes: customerData.notes || "",
    coordinates: customerData.coordinates || null,
  });
  return res.data;
}

export const getCustomerById = async (id) => {
  const res = await api.get(`/api/customers/${id}`);
  return res.data;
};

export const updateCustomer = async (id, updatedData) => {
  const res = await api.put(`/api/customers/${id}`, {
    firstName: updatedData.firstName || "",
    lastName: updatedData.lastName || "",
    phone: updatedData.phone || "",
    email: updatedData.email || "",
    address: updatedData.address || "",
    postalCode: updatedData.postalCode || "",
    nationalId: updatedData.nationalId || "",
    type: updatedData.type || "retail",
    customerGrade: parseInt(updatedData.customerGrade) || 1,
    referralCode: updatedData.referralCode || "",
    creditLimit: parseFloat(updatedData.creditLimit) || 0,
    balanceType: updatedData.balanceType || "none",
    openingBalance: parseFloat(updatedData.openingBalance) || 0,
    notes: updatedData.notes || "",
    coordinates: updatedData.coordinates || null,
  });
  return res.data;
};

export const deleteCustomer = async (id) => {
  await api.delete(`/api/customers/${id}`);
  return { success: true, id };
};
