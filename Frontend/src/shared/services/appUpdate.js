import { create } from "zustand";
import { registerSW } from "virtual:pwa-register";

import { getUpdateBlocker, useUpdateSafetyStore } from "@/shared/services/updateSafety";

/**
 * نسخه‌ی برنامه و بروزرسانی — تنها جایی که service worker ثبت و مدیریت می‌شود.
 *
 * با `registerType: "prompt"` نسخه‌ی تازه دانلود می‌شود ولی تا فعال نشود صفحه
 * عوض نمی‌شود. فعال‌شدن بارگذاریِ دوباره است و هر کارِ نیمه‌تمام را از بین
 * می‌برد، پس فقط وقتی انجام می‌شود که `getUpdateBlocker()` (دفترِ
 * `updateSafety.js`: فرمِ ذخیره‌نشده، کارتخوان، آپلود، ثبتِ در جریان) خالی باشد.
 *
 * نسخه‌ی تازه از این راه‌ها پیدا می‌شود: هنگامِ باز شدنِ برنامه، هر ۱۵ دقیقه،
 * با دیده‌شدنِ دوباره‌ی برگه، با برگشتنِ اینترنت و دستی از «بروزرسانی برنامه».
 * پیدا شدن فقط اعلان می‌دهد؛ بروزرسانی را کاربر با «بروزرسانی» می‌زند
 * (`applyUpdate`) — حتی آن هم اگر کاری در جریان باشد انجام نمی‌شود و دلیلش گفته
 * می‌شود. تنها استثنا صفحه‌ی ورودِ دست‌نخورده و لحظه‌ی بعد از ورود است
 * (`applyUpdateAutomatically`)، با سقفِ تعدادِ تلاش برای جلوگیری از حلقه.
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
/** فعال‌سازی (تغییرِ controller و بارگذاریِ دوباره) بیش از این طول نکشد، وگرنه شکست حساب می‌شود. */
const ACTIVATION_TIMEOUT_MS = 10 * 1000;

export const useAppUpdateStore = create(() => ({
  supported: false,
  status: UPDATE_STATUS.IDLE,
  lastCheckedAt: null,
  // پنجره‌ی «بروزرسانی برنامه» یک بار در `App` سوار است و از منوی کاربر و
  // اعلان باز می‌شود.
  dialogOpen: false,
  // دلیلِ اینکه «بروزرسانی» الان انجام نشد (کارِ ذخیره‌نشده/در جریان)؛ با رفتنِ دلیل پاک می‌شود.
  blockedReason: null,
  // فعال‌سازیِ آخر در مهلت تمام نشد؛ نسخه‌ی تازه هنوز آماده است و می‌شود دوباره زد.
  activationFailed: false,
}));

const setState = useAppUpdateStore.setState;
const getState = useAppUpdateStore.getState;

export const setUpdateDialogOpen = (dialogOpen) => setState({ dialogOpen });

// دلیلِ «انجام نشد» وقتی دیگر درست نیست (کاربر ذخیره کرد) از پنجره برداشته می‌شود.
useUpdateSafetyStore.subscribe(() => {
  if (getState().blockedReason && !getUpdateBlocker()) setState({ blockedReason: null });
});

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

/** شناسه‌ی build منتشرشده روی سرور؛ null اگر در دسترس نبود (آفلاین/توسعه). */
async function fetchRemoteBuild() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.builtAt === "string" ? data : null;
  } catch {
    return null;
  }
}

/** منتظرِ پیدایشِ worker در حالِ نصب یا منتظر (تا سقفِ زمان). */
async function waitForWorker() {
  const deadline = Date.now() + INSTALL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (registration.waiting) return;
    if (registration.installing) await waitForInstall(registration.installing);
    else await new Promise((r) => setTimeout(r, 500));
  }
}

/**
 * از سرور می‌پرسد نسخه‌ی تازه‌ای هست یا نه، و اگر هست تا آماده‌شدنش صبر
 * می‌کند. بررسی‌های هم‌زمان یکی می‌شوند. وضعیتِ نهایی را برمی‌گرداند.
 *
 * مرجعِ تصمیم `version.json` است نه فقط service worker: `update()` گاهی
 * پیش از شروعِ نصب تمام می‌شود یا فایلِ `sw.js` از کشِ میانی می‌آید و آنوقت
 * «آخرین نسخه را دارید» غلط گزارش می‌شد.
 */
export function checkForUpdate() {
  const { status } = getState();
  if (status === UPDATE_STATUS.AVAILABLE || status === UPDATE_STATUS.UPDATING) {
    return Promise.resolve(status);
  }
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
      const remote = await fetchRemoteBuild();
      const outdated = remote !== null && remote.builtAt !== APP_BUILD.builtAt;
      await registration.update();
      if (registration.installing) await waitForInstall(registration.installing);
      if (outdated && !registration.waiting) await waitForWorker();
      if (registration.waiting) {
        markAvailable();
      } else if (outdated) {
        // service worker نسخه‌ی تازه را نشان نداد (کشِ میانی)؛ بروزرسانیِ کامل
        // با پاک‌کردنِ worker و کش انجام می‌شود.
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

const HARD_RESET_KEY = "app-update-hard-reset";

/** worker و کش‌ها را پاک می‌کند (نشست در localStorage می‌ماند). */
async function clearWorkersAndCaches() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    // پاک‌سازی ناقص هم بهتر از ماندن روی نسخه‌ی کهنه است؛ بارگذاری ادامه می‌یابد.
  }
}

/**
 * پاک‌سازیِ کاملِ worker و کش، *بعد از* بارگذاریِ دوباره: اگر کاربر بارگذاریِ
 * اول را لغو کند (پیامِ «ترکِ صفحه؟») چیزی پاک نشده و برنامه سالم می‌ماند.
 * `true` یعنی همین حالا پاک‌سازی و بارگذاری در کار است و برنامه نباید بالا بیاید.
 */
function resumeHardReset() {
  try {
    if (sessionStorage.getItem(HARD_RESET_KEY) !== "1") return false;
    sessionStorage.removeItem(HARD_RESET_KEY);
  } catch {
    return false;
  }
  clearWorkersAndCaches().finally(() => window.location.reload());
  return true;
}

/** نسخه‌ای که worker نشانش نداد (کشِ میانی): بارگذاریِ دوباره، و پاک‌سازی در بارِ بعد. */
function hardReload() {
  try {
    sessionStorage.setItem(HARD_RESET_KEY, "1");
  } catch {
    // بدونِ نشانه پاک‌سازیِ بعدی ممکن نیست؛ بارگذاریِ ساده بی‌خطر است.
  }
  window.location.reload();
}

let activationTimer = null;
let onControllerChange = null;

function clearActivation() {
  clearTimeout(activationTimer);
  activationTimer = null;
  if (onControllerChange) {
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    onControllerChange = null;
  }
}

/** صفحه در مهلت عوض نشد (فعال‌سازی گم شد یا بارگذاری لغو شد): به «آماده» برمی‌گردد. */
function failActivation() {
  clearActivation();
  try {
    // بارگذاریِ لغوشده نباید پاک‌سازیِ بی‌دلیل را به بارِ بعد منتقل کند.
    sessionStorage.removeItem(HARD_RESET_KEY);
  } catch {
    // sessionStorage در دسترس نیست؛ نشانه‌ای هم گذاشته نشده بود.
  }
  setState({ status: UPDATE_STATUS.AVAILABLE, activationFailed: true });
}

/** فعال‌سازی و بارگذاریِ دوباره، بی‌پرسش از دفترِ ایمنی — فقط از `applyUpdate*`. */
function activate() {
  setState({ status: UPDATE_STATUS.UPDATING, blockedReason: null, activationFailed: false });
  activationTimer = setTimeout(failActivation, ACTIVATION_TIMEOUT_MS);
  const waiting = registration?.waiting;
  if (!waiting) {
    hardReload();
    return;
  }
  // بارگذاریِ دوباره با `controllerchange` است، نه `updateSW(true)`ِ
  // vite-plugin-pwa: آن فقط وقتی صفحه را بارگذاری می‌کند که رویدادِ `waiting`ِ
  // workbox قبلاً رسیده باشد، و نسخه‌ای که `checkForUpdate` زودتر پیدا کرده
  // فعال می‌شد ولی صفحه روی نسخه‌ی قبلی می‌ماند.
  onControllerChange = () => {
    clearActivation();
    // کاربر بین «بروزرسانی» و تغییرِ controller کاری شروع کرده؟ بارگذاری نمی‌شود؛
    // worker تازه فعال است و «بروزرسانی»ِ بعدی (بدونِ worker منتظر) صفحه را بارگذاری می‌کند.
    const reason = getUpdateBlocker();
    if (reason) {
      setState({ status: UPDATE_STATUS.AVAILABLE, blockedReason: reason });
      return;
    }
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  // همان پیامی که service workerِ ساخته‌ی workbox با آن `skipWaiting` می‌کند.
  waiting.postMessage({ type: "SKIP_WAITING" });
}

/** متنِ «الان نمی‌شود» برای کاربر؛ `reason` از `getUpdateBlocker()`. */
export const blockedMessage = (reason) =>
  `الان نمی‌شود بروزرسانی کرد: ${reason}. اول کارتان را ذخیره یا تمام کنید.`;

/**
 * «بروزرسانی» که کاربر زد. اگر کاری ذخیره‌نشده یا در جریان است بارگذاری نمی‌شود:
 * نسخه آماده می‌ماند و دلیل در `blockedReason` (و در نتیجه) می‌آید.
 * @returns {{ started: boolean, reason?: string }}
 */
export function applyUpdate() {
  if (getState().status !== UPDATE_STATUS.AVAILABLE) return { started: false };
  const reason = getUpdateBlocker();
  if (reason) {
    setState({ blockedReason: reason });
    return { started: false, reason };
  }
  activate();
  return { started: true };
}

const AUTO_UPDATE_KEY = "app-update-auto-attempts";
/** برای یک buildِ در حالِ اجرا بیش از این بار خودکار بروزرسانی نمی‌شود. */
const AUTO_UPDATE_MAX_ATTEMPTS = 2;
const AUTO_UPDATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * سقفِ تلاشِ خودکار برای همین build. اگر بعد از بارگذاریِ دوباره هم همین build
 * بالا آمد (دیپلویِ نیمه‌کاره: `version.json` تازه، `index.html`/`sw.js` هنوز
 * کهنه) شمارنده می‌ماند و تلاشِ سوم انجام نمی‌شود؛ با build تازه از صفر شروع
 * می‌شود. بدونِ localStorage سقف را نمی‌شود نگه داشت، پس خودکار نمی‌شود.
 */
function reserveAutoAttempt() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTO_UPDATE_KEY) || "null");
    const recent =
      saved && saved.build === APP_BUILD.builtAt && Date.now() - saved.at < AUTO_UPDATE_WINDOW_MS;
    const count = recent ? saved.count : 0;
    if (count >= AUTO_UPDATE_MAX_ATTEMPTS) return false;
    localStorage.setItem(
      AUTO_UPDATE_KEY,
      JSON.stringify({ build: APP_BUILD.builtAt, count: count + 1, at: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * بروزرسانیِ بی‌پرسش — فقط برای جاهایی که کاربر کاری ندارد که از دست برود (صفحه‌ی
 * ورودِ دست‌نخورده، لحظه‌ی بعد از ورود). اگر چیزی در دفترِ ایمنی باشد یا سقفِ
 * تلاش پر شده باشد انجام نمی‌شود و اعلانِ معمولی می‌ماند.
 */
export function applyUpdateAutomatically() {
  if (getState().status !== UPDATE_STATUS.AVAILABLE) return false;
  if (getUpdateBlocker() || !reserveAutoAttempt()) return false;
  activate();
  return true;
}

/**
 * بعد از ورود: اگر نسخه‌ی تازه آماده است (یا بررسیِ در جریان در همین چند
 * ثانیه پیدایش کند) فعالش می‌کند. ورود منتظرِ سرورِ کُند نمی‌ماند: بعد از
 * `waitMs` هر چه هست همان است و اعلانِ معمولی بقیه را پوشش می‌دهد.
 */
export async function applyUpdateOnLogin({ waitMs = 3000 } = {}) {
  const status = await Promise.race([
    checkForUpdate(),
    new Promise((resolve) => setTimeout(() => resolve(getState().status), waitMs)),
  ]);
  return status === UPDATE_STATUS.AVAILABLE ? applyUpdateAutomatically() : false;
}

/** یک بار، پیش از رندرِ برنامه (`main.jsx`). */
export function initAppUpdates({ onOfflineReady } = {}) {
  if (resumeHardReset()) return;
  registerSW({
    onNeedRefresh: markAvailable,
    onOfflineReady,
    onRegisteredSW(_swUrl, swRegistration) {
      if (!swRegistration) return;
      registration = swRegistration;
      setState({ supported: true });
      resolveRegistered?.();
      setInterval(checkForUpdate, PERIODIC_CHECK_MS);
      window.addEventListener("online", checkForUpdate);
      // هنگامِ باز شدن فقط بررسی می‌شود؛ باز شدنِ برنامه به معنیِ «کاری ندارم» نیست.
      checkForUpdate();
      // برگه‌ای که ساعت‌ها پشتِ برگه‌های دیگر بوده، با برگشتن بررسی می‌شود.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
    },
  });
}
