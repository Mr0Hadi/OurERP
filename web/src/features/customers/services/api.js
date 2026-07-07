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
    postalCode: "",
    nationalId: c.national_id || "",
    type: c.type || "",
    customerGrade: c.customer_grade || "",
    referralCode: c.referral_code || "",
    creditLimit: c.credit_limit || 0,
    notes: c.notes || "",
    balance: 0,
    avatar: null,
    coordinates: null,
  };
}

function mapCustomerForCreate(data) {
  const result = {
    full_name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
    phone: data.phone || "",
    address: data.address || "",
    national_id: data.nationalId || "",
    type: data.type || "",
    customer_grade: data.customerGrade || "",
    referral_code: data.referralCode || "",
    credit_limit: data.creditLimit || 0,
    notes: data.notes || "",
  };
  Object.keys(result).forEach((k) => {
    if (result[k] === "" || result[k] === undefined || result[k] === null) delete result[k];
  });
  return result;
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
