import axios from "axios";
import { useAuthStore } from "@/features/auth/store/authStore";
import { translateError } from "./errorMessages";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message =
        translateError(error.response.data?.error) ||
        `خطای درخواست (${error.response.status})`;
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  }
);

function buildParams(params) {
  const filtered = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      filtered[key] = value;
    }
  }
  return filtered;
}

async function request(endpoint, { method = "GET", body, params } = {}) {
  const config = { method, url: endpoint };
  if (params) {
    config.params = buildParams(params);
  }
  if (body) {
    config.data = body;
  }
  const response = await apiClient(config);
  return response.data;
}

export const api = {
  get: (endpoint, params) => request(endpoint, { params }),
  post: (endpoint, data) => request(endpoint, { method: "POST", body: data }),
  put: (endpoint, data) => request(endpoint, { method: "PUT", body: data }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};
