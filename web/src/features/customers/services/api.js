import { api } from "@/shared/lib/api";

function mapCustomer(c) {
  const nameParts = (c.full_name || "").split(" ");
  return {
    id: String(c.id),
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || "",
    phone: c.phone || "",
    email: "",
    address: c.address || "",
    postalCode: c.postal_code || "",
    nationalId: c.national_id || "",
    type: c.type || "retail",
    customerGrade: (c.customer_grade ?? 1).toString(),
    referralCode: c.referral_code || "",
    creditLimit: c.credit_limit || 0,
    balanceType: c.balance_type || "none",
    openingBalance: c.opening_balance || 0,
    notes: c.notes || "",
    balance: c.outstanding_balance || 0,
    avatar: null,
    coordinates: c.latitude != null && c.longitude != null
      ? { lat: c.latitude, lng: c.longitude }
      : null,
  };
}

function mapCustomerForCreate(data) {
  return {
    full_name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
    phone: data.phone || "",
    address: data.address || "",
    postal_code: data.postalCode || "",
    latitude: data.coordinates?.lat ?? null,
    longitude: data.coordinates?.lng ?? null,
    national_id: data.nationalId || "",
    type: data.type || "retail",
    customer_grade: parseInt(data.customerGrade) || 1,
    referral_code: data.referralCode || "",
    credit_limit: parseFloat(data.creditLimit) || 0,
    balance_type: data.balanceType || "none",
    opening_balance: parseFloat(data.openingBalance) || 0,
    notes: data.notes || "",
  };
}

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
    items: (res.data || []).map(mapCustomer),
    total: res.meta?.total_count ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.total_pages ?? 1,
  };
}

export async function createCustomer(customerData) {
  const res = await api.post("/api/customers", mapCustomerForCreate(customerData));
  return mapCustomer(res.data);
}

export const getCustomerById = async (id) => {
  const res = await api.get(`/api/customers/${id}`);
  return mapCustomer(res.data);
};

export const updateCustomer = async (id, updatedData) => {
  const res = await api.put(`/api/customers/${id}`, mapCustomerForCreate(updatedData));
  return mapCustomer(res.data);
};

export const deleteCustomer = async (id) => {
  await api.delete(`/api/customers/${id}`);
  return { success: true, id };
};
