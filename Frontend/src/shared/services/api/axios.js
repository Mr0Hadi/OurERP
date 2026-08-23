// src\shared\services\api\axios.js
import axios from "axios";
import { useAuthStore } from "@/features/auth/store/authStore";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// افزودن خودکار accessToken به هر ریکوئست
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// مدیریت refresh token برای جلوگیری از race condition چند ریکوئست هم‌زمان
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

/**
 * پوششِ پاسخِ بک‌اند.
 *
 * بک‌اند همه‌چیز را داخل `ResponseDto` می‌پیچد:
 *
 *   { Data, Message, ResponseMessageType }
 *
 * باز کردنِ این پوشش در همین‌جا انجام می‌شود، نه در تک‌تکِ فایل‌های
 * `api-v1`. دلیلش این است که پوشش یک قراردادِ *انتقالی* است نه بخشی
 * از دامنه؛ اگر هر فایل خودش بازش کند، همان چهار خط در ده فایل تکرار
 * می‌شود و روزی که پوشش عوض شود باید همه‌جا دست بخورد.
 *
 * تشخیص محافظه‌کارانه است: فقط پاسخی که واقعاً کلید `Data` دارد باز
 * می‌شود، تا مسیرهای بدون پوشش (مثل refresh token) دست‌نخورده بمانند.
 */
function isEnvelope(body) {
  return (
    body != null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ("Data" in body || "data" in body) &&
    ("Message" in body || "message" in body)
  );
}

function unwrapEnvelope(body) {
  return "Data" in body ? body.Data : body.data;
}

/** پیامِ فارسیِ خطا از پوشش بیرون کشیده می‌شود تا toastها معنادار بمانند. */
function messageOf(error) {
  const body = error?.response?.data;
  if (isEnvelope(body)) return body.Message ?? body.message;
  if (typeof body?.Message === "string") return body.Message;
  if (typeof body?.message === "string") return body.message;
  if (typeof body?.title === "string") return body.title;
  return null;
}

axiosInstance.interceptors.response.use(
  (response) => {
    if (isEnvelope(response.data)) {
      response.data = unwrapEnvelope(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // اگر خود ریکوئست refresh بود، دیگه دوباره تلاش نکن
    const isRefreshCall = originalRequest?.url?.includes("/auth/refresh");

    if (status === 401 && !originalRequest._retry && !isRefreshCall) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // منتظر بمون تا رفرش قبلی تموم بشه، بعد با توکن جدید دوباره ارسال کن
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${axiosInstance.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );

        setTokens(data.accessToken, data.refreshToken);
        onRefreshed(data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        logout();
        window.location.href = "/auth/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // لایه‌های بالادستی (mutationها) فقط `error.message` را toast
    // می‌کنند؛ بدون این، کاربر پیام عمومیِ axios را می‌بیند به‌جای
    // پیامِ دقیقی که سرور فرستاده.
    const serverMessage = messageOf(error);
    if (serverMessage) error.message = serverMessage;

    return Promise.reject(error);
  }
);

export default axiosInstance;