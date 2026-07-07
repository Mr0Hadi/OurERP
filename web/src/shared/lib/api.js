import { useAuthStore } from "@/features/auth/store/authStore";
import { translateError } from "./errorMessages";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function request(endpoint, { method = "GET", body, params } = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(translateError(json.error) || `خطای درخواست (${res.status})`);
  }

  return json;
}

export const api = {
  get: (endpoint, params) => request(endpoint, { params }),
  post: (endpoint, data) => request(endpoint, { method: "POST", body: data }),
  put: (endpoint, data) => request(endpoint, { method: "PUT", body: data }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};
