import { create } from "zustand";
import { registerSW } from "virtual:pwa-register";

/**
 * نسخه‌ی برنامه و بروزرسانی — تنها جایی که service worker ثبت و مدیریت می‌شود.
 *
 * با `registerType: "prompt"` نسخه‌ی تازه دانلود می‌شود ولی تا کاربر تأیید
 * نکند فعال نمی‌شود (کارِ نیمه‌تمامِ فرم با بارگذاریِ دوباره از دست نرود).
 * سه راهِ رسیدن به نسخه‌ی تازه:
 *
 *  ۱. بررسیِ خودکار — هر ۱۵ دقیقه و هر بار که برگه دوباره دیده می‌شود؛ اگر
 *     نسخه‌ای آمده باشد اعلان می‌آید.
 *  ۲. بررسیِ دستی — «بروزرسانی برنامه» در منوی کاربر (`AppUpdateDialog`).
 *  ۳. هنگامِ ورود — کسی که تازه وارد می‌شود کارِ نیمه‌تمامی ندارد، پس نسخه‌ی
 *     آماده بی‌پرسش فعال می‌شود (`applyUpdateOnLogin`).
 *
 * در حالتِ توسعه service worker ثبت نمی‌شود و `supported` خاموش می‌ماند.
 */

/** شناسه‌ی همین build — از `define` در `vite.config.js`. */
export const APP_BUILD = __APP_BUILD__;

export const UPDATE_STATUS = Object.freeze({
  IDLE: "idle",
  CHECKING: "checking",
  UP_TO_DATE: "upToDate",
  AVAILABLE: "available",
  UPDATING: "updating",
  ERROR: "error",
});

const PERIODIC_CHECK_MS = 15 * 60 * 1000;
/** نصبِ نسخه‌ی تازه (دانلودِ فایل‌های precache) بیش از این منتظر نمی‌ماند. */
const INSTALL_TIMEOUT_MS = 30 * 1000;

export const useAppUpdateStore = create(() => ({
  supported: false,
  status: UPDATE_STATUS.IDLE,
  lastCheckedAt: null,
  // پنجره‌ی «بروزرسانی برنامه» یک بار در `App` سوار است و از منوی کاربر و
  // اعلان باز می‌شود.
  dialogOpen: false,
}));

const setState = useAppUpdateStore.setState;
const getState = useAppUpdateStore.getState;

export const setUpdateDialogOpen = (dialogOpen) => setState({ dialogOpen });

let registration = null;
let resolveRegistered;
/**
 * ثبتِ service worker ناهم‌زمان است و ممکن است بعد از سوار شدنِ اولین صفحه
 * تمام شود؛ بررسی‌ای که زودتر بیاید تا آن موقع صبر می‌کند. در حالتِ توسعه
 * هیچ‌وقت ثبتی نیست، پس آنجا صبری هم نیست.
 */
const registered =
  import.meta.env.PROD && "serviceWorker" in navigator
    ? new Promise((resolve) => {
        resolveRegistered = resolve;
      })
    : Promise.resolve();
const REGISTER_WAIT_MS = 10 * 1000;
let pendingCheck = null;
const availableListeners = new Set();

function markAvailable() {
  if (getState().status === UPDATE_STATUS.UPDATING) return;
  setState({ status: UPDATE_STATUS.AVAILABLE, lastCheckedAt: new Date() });
  availableListeners.forEach((listener) => listener());
}

/** نسخه‌ی تازه آماده شد — برای اعلان؛ تابعِ لغوِ ثبت را برمی‌گرداند. */
export function onUpdateAvailable(listener) {
  availableListeners.add(listener);
  return () => availableListeners.delete(listener);
}

/** worker تا نصب‌شدن (یا شکست) — یا تا سقفِ زمان. */
function waitForInstall(worker) {
  return new Promise((resolve) => {
    if (worker.state !== "installing") return resolve();
    const timer = setTimeout(resolve, INSTALL_TIMEOUT_MS);
    worker.addEventListener("statechange", () => {
      if (worker.state !== "installing") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

/**
 * از سرور می‌پرسد نسخه‌ی تازه‌ای هست یا نه، و اگر هست تا آماده‌شدنش صبر
 * می‌کند. بررسی‌های هم‌زمان یکی می‌شوند. وضعیتِ نهایی را برمی‌گرداند.
 */
export function checkForUpdate() {
  if (getState().status === UPDATE_STATUS.AVAILABLE) return Promise.resolve(UPDATE_STATUS.AVAILABLE);
  if (pendingCheck) return pendingCheck;

  pendingCheck = (async () => {
    if (!registration) {
      await Promise.race([registered, new Promise((r) => setTimeout(r, REGISTER_WAIT_MS))]);
    }
    if (!registration || getState().status === UPDATE_STATUS.AVAILABLE) {
      pendingCheck = null;
      return getState().status;
    }
    setState({ status: UPDATE_STATUS.CHECKING });
    try {
      await registration.update();
      if (registration.installing) await waitForInstall(registration.installing);
      if (registration.waiting) {
        markAvailable();
      } else {
        setState({ status: UPDATE_STATUS.UP_TO_DATE, lastCheckedAt: new Date() });
      }
    } catch {
      // آفلاین یا سرور در دسترس نیست؛ بررسیِ بعدی دوباره امتحان می‌کند.
      setState({ status: UPDATE_STATUS.ERROR, lastCheckedAt: new Date() });
    } finally {
      pendingCheck = null;
    }
    return getState().status;
  })();
  return pendingCheck;
}

/**
 * نسخه‌ی آماده را فعال می‌کند؛ صفحه روی همان نشانی از نو بارگذاری می‌شود.
 *
 * بارگذاریِ دوباره اینجا با `controllerchange` انجام می‌شود، نه با
 * `updateSW(true)`ِ vite-plugin-pwa: آن فقط وقتی صفحه را از نو بارگذاری
 * می‌کند که رویدادِ `waiting`ِ workbox قبلاً رسیده باشد، و نسخه‌ای که
 * `checkForUpdate` زودتر پیدا کرده فعال می‌شد ولی صفحه روی نسخه‌ی قبلی
 * می‌ماند.
 */
export function applyUpdate() {
  const waiting = registration?.waiting;
  if (!waiting || getState().status !== UPDATE_STATUS.AVAILABLE) return false;
  setState({ status: UPDATE_STATUS.UPDATING });
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
  // همان پیامی که service workerِ ساخته‌ی workbox با آن `skipWaiting` می‌کند.
  waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

/**
 * بعد از ورود: اگر نسخه‌ی تازه آماده است (یا بررسیِ در جریان در همین چند
 * ثانیه پیدایش کند) بی‌پرسش فعالش می‌کند. ورود منتظرِ سرورِ کُند نمی‌ماند:
 * بعد از `waitMs` هر چه هست همان است و اعلانِ معمولی بقیه را پوشش می‌دهد.
 */
export async function applyUpdateOnLogin({ waitMs = 3000 } = {}) {
  const status = await Promise.race([
    checkForUpdate(),
    new Promise((resolve) => setTimeout(() => resolve(getState().status), waitMs)),
  ]);
  return status === UPDATE_STATUS.AVAILABLE ? applyUpdate() : false;
}

/** یک بار، پیش از رندرِ برنامه (`main.jsx`). */
export function initAppUpdates({ onOfflineReady } = {}) {
  registerSW({
    onNeedRefresh: markAvailable,
    onOfflineReady,
    onRegisteredSW(_swUrl, swRegistration) {
      if (!swRegistration) return;
      registration = swRegistration;
      setState({ supported: true });
      resolveRegistered?.();
      setInterval(checkForUpdate, PERIODIC_CHECK_MS);
      // برگه‌ای که ساعت‌ها پشتِ برگه‌های دیگر بوده، با برگشتن بررسی می‌شود.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
    },
  });
}
