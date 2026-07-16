import axios from "axios";
import { useAuthStore } from "@/features/auth/store/authStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        window.location.href = "/auth/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { default: axiosStatic } = await import("axios");
        const res = await axiosStatic.post(
          `${BASE_URL}/auth/refresh`,
          { refreshToken: refreshToken },
          {
            headers: {
              Authorization: `Bearer ${useAuthStore.getState().token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        setTokens(accessToken, newRefreshToken);

        processQueue(null);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        logout();
        window.location.href = "/auth/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response) {
      const message =
        error.response.data?.error ||
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
