import axios from "axios";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROUTES } from "@/shared/constants/routes";
import { extractServerMessage, getErrorMessage } from "@/shared/lib/errorMessage";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5083/api",
  timeout: 15000,
  // آرایه‌ها به شکلِ `statuses=2&statuses=3` (نه `statuses[]=2`)؛ همان شکلی که
  // ASP.NET برای `List<>` در query می‌خواند.
  paramsSerializer: { indexes: null },
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

    // تورِ ایمنیِ multipart. هدرِ پیش‌فرضِ بالا (`application/json`) روی
    // هر درخواستی می‌نشیند، و `transformRequest` در axios 1.x وقتی
    // Content-Type برابرِ application/json باشد بدنه‌ی FormData را با
    // `formDataToJSON` به JSON تبدیل می‌کند — یعنی فایل اصلاً ارسال
    // نمی‌شود. با برداشتنِ هدر، axios خودش هنگام ارسال multipart را با
    // boundaryِ درست می‌گذارد.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * access token امضا *و رمزنگاری* می‌شود (`TokenService.SetTokenAsync` هم
 * `signingCredentials` هم `encryptingCredentials` می‌دهد)، یعنی یک JWE
 * پنج‌بخشی است نه JWT سه‌بخشیِ معمول. بخشِ دومش کلیدِ رمزشده است، نه JSON —
 * پس نمی‌شود اینجا `exp` را از رویِ خودِ توکن خواند؛ تنها کسی که می‌تواند
 * بگوید توکن منقضی شده یا نه خودِ سرور است.
 */

const bearerOf = (config) =>
  String(config?.headers?.Authorization ?? "").replace(/^Bearer\s+/i, "") || null;

// مدیریت refresh token برای جلوگیری از race condition چند ریکوئست هم‌زمان
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(onSuccess, onFailure) {
  refreshSubscribers.push({ onSuccess, onFailure });
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach(({ onSuccess }) => onSuccess(newToken));
  refreshSubscribers = [];
}

function onRefreshFailed(error) {
  refreshSubscribers.forEach(({ onFailure }) => onFailure(error));
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

/**
 * پیامِ خطا را برای لایه‌های بالادستی آماده می‌کند.
 *
 * `serverMessage` پیامِ فارسیِ خودِ سرور است (اگر فرستاده باشد) و
 * `message` همیشه یک متنِ فارسیِ قابل‌نمایش می‌شود، تا حتی کدی که هنوز
 * مستقیم `error.message` را نشان می‌دهد متنِ انگلیسیِ axios را به کاربر
 * نشان ندهد. برای انتخابِ پیام در UI از `getErrorMessage` استفاده کنید.
 */
function attachUserMessage(error) {
  error.serverMessage = extractServerMessage(error?.response?.data);
  error.message = getErrorMessage(error);
  return error;
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
    const isRefreshCall = originalRequest?.url?.includes("/Account/RefreshToken");

    if (status === 401 && !originalRequest._retry && !isRefreshCall) {
      const { accessToken, refreshToken, setTokens, logout } =
        useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(attachUserMessage(error));
      }

      // درخواست با توکنی رفته که دیگر توکنِ فعلی نیست: رفرشِ دیگری (در
      // همین تب یا تبِ دیگر) قبلاً انجام شده. رفرشِ دوباره با توکنِ تازه
      // از سرور ۴۰۰ می‌گیرد و کاربر را بی‌دلیل بیرون می‌اندازد؛ فقط با
      // توکنِ فعلی دوباره بفرست.
      const sentToken = bearerOf(originalRequest);
      if (!isRefreshing && accessToken && sentToken && sentToken !== accessToken) {
        originalRequest._retry = true;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      }

      if (isRefreshing) {
        // منتظر بمون تا رفرش قبلی تموم بشه، بعد با توکن جدید دوباره ارسال کن
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(
            (newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(axiosInstance(originalRequest));
            },
            (refreshError) => reject(refreshError)
          );
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // شاید تبِ دیگری همین الان رفرش کرده باشد؛ همیشه آخرین توکن‌های
        // ذخیره‌شده را بخوان، نه کپیِ احتمالاً کهنه‌ی بالای تابع.
        const latest = useAuthStore.getState();
        const { data: envelope } = await axios.post(
          `${axiosInstance.defaults.baseURL}/Account/RefreshToken`,
          {
            accessToken: latest.accessToken ?? accessToken,
            refreshToken: latest.refreshToken ?? refreshToken,
          }
        );
        const data = isEnvelope(envelope) ? unwrapEnvelope(envelope) : envelope;

        setTokens(data.accessToken, data.refreshToken);
        onRefreshed(data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        const latest = useAuthStore.getState();
        // رفرشِ دیگری (همین تب یا تبِ دیگر) در همین فاصله توکن را عوض کرده
        // و سرور رفرشِ دوباره با توکنِ قدیمی را ۴۰۰ داده؛ با توکنِ تازه
        // دوباره بفرست.
        //
        // ولی اگر توکن عوض *نشده*، ۴۰۰ (حتی با پیامِ «توکن منقضی نشده است
        // و معتبر است») بن‌بست است نه تلاشِ زودهنگام: سرور همین توکن را با
        // ۴۰۱ رد کرده و رفرشش هم نمی‌کند — مثلاً بعد از ری‌استارتِ سرور که
        // فهرستِ توکن‌های درون‌حافظه‌ی `CachingMiddleware` خالی شده. نگه‌داشتنِ
        // کاربر در این حالت یعنی صفحه‌ی سفید؛ به بلوکِ خروجِ پایین می‌رود.
        const refreshedElsewhere =
          refreshError.response?.status === 400 &&
          latest.accessToken &&
          latest.accessToken !== accessToken;

        if (refreshedElsewhere) {
          onRefreshFailed(refreshError);
          originalRequest.headers.Authorization = `Bearer ${latest.accessToken}`;
          return axiosInstance(originalRequest);
        }

        // فقط وقتی سرور صراحتاً رفرش را رد کرده (رفرش‌توکنِ منقضی/باطل)
        // logout کن. خطای شبکه/تایم‌اوت (بدون response) یعنی سرور اصلاً
        // جواب نداده — دلیلی نیست که کاربرِ واردشده را بیرون بیندازیم.
        attachUserMessage(refreshError);
        if (refreshError.response) {
          logout();
          onRefreshFailed(refreshError);
          window.location.href = ROUTES.LOGIN;
        } else {
          onRefreshFailed(refreshError);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ۴۲۲ یعنی یک Idempotency-Key برای دو درخواستِ متفاوت به کار رفته — در
    // کارکردِ درست پیش نمی‌آید و نشانه‌ی باگ در فرانت است (مثلاً شیءِ
    // variables بعد از ساخته‌شدن تغییر کرده).
    if (status === 422 && import.meta.env?.DEV) {
      console.error("Idempotency-Key reused for a different request", originalRequest);
    }

    return Promise.reject(attachUserMessage(error));
  }
);

export default axiosInstance;