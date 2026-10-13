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
 * «نسخه‌ی تازه» یعنی buildی که *جدیدتر* از buildِ در حالِ اجرا (`APP_BUILD.builtAt`)
 * است، و گواهش یکی از این‌هاست:
 *  - worker منتظر که خودش اعلام می‌کند کدام buildاست (`GET_BUILD`، فایلِ
 *    `sw-build-*.js` در `vite.config.js`) و جدیدتر است؛
 *  - یا worker منتظری که نمی‌توان buildش را فهمید *و* `version.json` جدیدتر می‌گوید.
 * `version.json` به‌تنهایی فقط یک ادعاست: اگر هیچ worker آن را تأیید نکند یک‌بار
 * بروزرسانیِ کامل (پاک‌کردنِ worker و کش) امتحان می‌شود و اگر باز هم همان build
 * بالا آمد (کش/پروکسیِ میانی، دیپلویِ نیمه‌کاره) همان ادعا دوباره اعلان نمی‌دهد.
 * `version.json` کهنه‌تر یا برابر هرگز اعلان نمی‌دهد.
 *
 * در حالتِ توسعه service worker ثبت نمی‌شود و `supported` خاموش می‌ماند.
 * برای عیب‌یابی: `localStorage.setItem("app-update-debug", "1")` و کنسول (سطحِ debug).
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
/** پاسخِ worker منتظر به «تو کدام buildای؟» بیش از این منتظر نمی‌ماند. */
const WORKER_BUILD_TIMEOUT_MS = 3 * 1000;
/** `version.json` بیش از این منتظر نمی‌ماند؛ بررسیِ آویزان همه‌ی بررسی‌های بعدی را قفل می‌کرد. */
const REMOTE_TIMEOUT_MS = 10 * 1000;

function debugEnabled() {
  try {
    return import.meta.env.DEV || localStorage.getItem("app-update-debug") === "1";
  } catch {
    return false;
  }
}

/** ردیابیِ تصمیم‌ها؛ فقط با `app-update-debug` (یا در توسعه)، نه در هر بررسیِ عادی. */
function trace(event, data) {
  if (debugEnabled()) console.debug("[app-update]", event, data ?? "");
}

/** `candidate` یک زمانِ ISO جدیدتر از buildِ در حالِ اجرا است؟ (نامعتبر ⇒ نه) */
function isNewerBuild(candidate) {
  const next = Date.parse(candidate);
  const current = Date.parse(APP_BUILD.builtAt);
  return Number.isFinite(next) && Number.isFinite(current) && next > current;
}

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

function markAvailable(reason) {
  if (getState().status === UPDATE_STATUS.UPDATING) return;
  availableReason = reason ?? availableReason;
  trace("available", { reason, running: APP_BUILD.builtAt });
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
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.builtAt === "string" ? data : null;
  } catch {
    return null;
  }
}

/** از worker می‌پرسد کدام buildاست (`sw-build-*.js`)؛ null اگر جواب نداد. */
function fetchWorkerBuild(worker) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), WORKER_BUILD_TIMEOUT_MS);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(typeof event.data?.builtAt === "string" ? event.data : null);
    };
    worker.postMessage({ type: "GET_BUILD" }, [channel.port2]);
  });
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

// ادعایی از `version.json` که یک بار با بروزرسانیِ کامل امتحان شد: `{ build, at }`.
// فقط اعلانِ *همین ادعا* را خاموش می‌کند و اثبات نمی‌کند کدام نسخه اجرا می‌شود (آن
// را همیشه `APP_BUILD` می‌گوید). وقتی buildِ در حالِ اجرا به آن رسید (بروزرسانی
// موفق بود) پاک می‌شود، بعد از `CLAIM_TRIED_TTL_MS` منقضی می‌شود تا دیپلویِ
// نیمه‌کاره‌ی موقت برای همیشه جلوی تشخیص را نگیرد، و worker منتظرِ تأییدشده
// همیشه از آن رد می‌شود (`judge`).
const CLAIM_TRIED_KEY = "app-update-claim-tried";
const CLAIM_TRIED_TTL_MS = 60 * 60 * 1000;

function claimWasTried(builtAt) {
  try {
    const saved = JSON.parse(localStorage.getItem(CLAIM_TRIED_KEY) || "null");
    if (!saved) return false;
    if (!isNewerBuild(saved.build) || Date.now() - saved.at > CLAIM_TRIED_TTL_MS) {
      localStorage.removeItem(CLAIM_TRIED_KEY);
      return false;
    }
    return saved.build === builtAt;
  } catch {
    return false;
  }
}

/** build ادعاشده‌ای که بروزرسانیِ کاملش در جریان است (برای `CLAIM_TRIED_KEY`). */
let claimedBuild = null;
/** چرا وضعیتِ فعلی AVAILABLE شد (`judge`)؛ بروزرسانیِ خودکار با ادعای بی‌worker انجام نمی‌شود. */
let availableReason = null;

/**
 * حکمِ یک بررسی: دلیلِ «نسخه‌ی تازه هست» یا null.
 * - worker منتظرِ شناخته‌شده: فقط اگر جدیدتر باشد؛ کهنه‌تر/برابر (مثلاً sw.jsِ کهنه از
 *   کشِ میانی) اعلان نمی‌دهد.
 * - worker منتظرِ ناشناس: فقط با تأییدِ `version.json` که جدیدتر می‌گوید (و یک بار، مثلِ ادعا).
 * - بدونِ worker: ادعای جدیدترِ `version.json`، مگر همین ادعا قبلاً بی‌نتیجه مانده.
 */
async function judge(remote, remoteNewer) {
  claimedBuild = null;
  const waiting = registration.waiting;
  if (waiting) {
    const workerBuild = await fetchWorkerBuild(waiting);
    trace("worker", { workerBuild: workerBuild?.builtAt ?? null, running: APP_BUILD.builtAt });
    if (workerBuild) {
      if (isNewerBuild(workerBuild.builtAt)) return "worker-newer";
    } else if (remoteNewer && !claimWasTried(remote.builtAt)) {
      // worker جواب نداد (مثلاً `sw-build-*.js` روی سرور نیست و worker نیمه‌کاره نصب شده):
      // فقط با تأییدِ `version.json` و یک بار، چون ممکن است فعال‌شدنش ممکن نباشد.
      claimedBuild = remote.builtAt;
      return "worker-unidentified+remote-newer";
    }
  }
  if (remoteNewer && !claimWasTried(remote.builtAt)) {
    claimedBuild = remote.builtAt;
    return "remote-claim";
  }
  return null;
}

/**
 * از سرور می‌پرسد نسخه‌ی تازه‌ای هست یا نه، و اگر هست تا آماده‌شدنش صبر
 * می‌کند. بررسی‌های هم‌زمان یکی می‌شوند. وضعیتِ نهایی را برمی‌گرداند.
 *
 * مرجعِ تصمیم خودِ buildِ worker است و `version.json` فقط راهنما/پشتیبان
 * (`judge`): `update()` گاهی پیش از شروعِ نصب تمام می‌شود یا `sw.js` از کشِ
 * میانی می‌آید، و `version.json`ِ کهنه هم نباید «نسخه‌ی تازه» بسازد.
 * نتیجه فقط وقتی نوشته می‌شود که وضعیت هنوز CHECKING باشد؛ بررسیِ کهنه نه
 * بروزرسانیِ در جریان را بهم می‌زند و نه اعلانِ تازه را پاک می‌کند.
 *
 * @param trigger چه چیزی بررسی را شروع کرد (فقط برای ردیابی)
 */
export function checkForUpdate(trigger = "manual") {
  const { status } = getState();
  if (status === UPDATE_STATUS.AVAILABLE || status === UPDATE_STATUS.UPDATING) {
    return Promise.resolve(status);
  }
  if (pendingCheck) return pendingCheck;

  pendingCheck = (async () => {
    if (!registration) {
      await Promise.race([registered, new Promise((r) => setTimeout(r, REGISTER_WAIT_MS))]);
    }
    const early = getState().status;
    if (!registration || early === UPDATE_STATUS.AVAILABLE || early === UPDATE_STATUS.UPDATING) {
      pendingCheck = null;
      return early;
    }
    setState({ status: UPDATE_STATUS.CHECKING });
    const settle = (next) => {
      if (getState().status === UPDATE_STATUS.CHECKING) setState(next);
    };
    try {
      const remote = await fetchRemoteBuild();
      const remoteNewer = remote !== null && isNewerBuild(remote.builtAt);
      trace("check", { trigger, running: APP_BUILD.builtAt, remote: remote?.builtAt ?? null, remoteNewer });
      await registration.update();
      if (registration.installing) await waitForInstall(registration.installing);
      if (remoteNewer && !registration.waiting) await waitForWorker();
      const reason = await judge(remote, remoteNewer);
      if (reason) {
        if (getState().status === UPDATE_STATUS.CHECKING) markAvailable(reason);
      } else {
        settle({ status: UPDATE_STATUS.UP_TO_DATE, lastCheckedAt: new Date() });
      }
    } catch {
      // آفلاین یا سرور در دسترس نیست؛ بررسیِ بعدی دوباره امتحان می‌کند.
      settle({ status: UPDATE_STATUS.ERROR, lastCheckedAt: new Date() });
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
    // اگر بعد از این هم همین build بالا بیاید، همین ادعا دوباره اعلان نمی‌دهد.
    if (claimedBuild) {
      localStorage.setItem(CLAIM_TRIED_KEY, JSON.stringify({ build: claimedBuild, at: Date.now() }));
    }
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
  trace("activation-failed", { running: APP_BUILD.builtAt });
  setState({ status: UPDATE_STATUS.AVAILABLE, activationFailed: true });
  // اعلانِ «بروزرسانی» با کلیک بسته شده بود؛ دوباره نشان داده می‌شود تا امتحانِ مجدد ممکن باشد.
  availableListeners.forEach((listener) => listener());
}

/**
 * worker تازه کنترلِ صفحه را گرفت (به درخواستِ همین صفحه یا برگه‌ی دیگر): بارگذاریِ
 * دوباره فقط اگر دفترِ ایمنی خالی باشد. وگرنه صفحه روی کدِ قدیمی می‌ماند و
 * «بروزرسانی»ِ بعدی (بدونِ worker منتظر) پس از ذخیره آن را بارگذاری می‌کند.
 * workbox-window هم همین را از راهِ `onNeedReload` صدا می‌زند؛ بدونِ آن خودش بی‌پرسش
 * بارگذاری می‌کرد.
 */
function reloadIfSafe() {
  clearActivation();
  const reason = getUpdateBlocker();
  trace("takeover", { blocked: reason });
  if (reason) {
    setState({ status: UPDATE_STATUS.AVAILABLE, blockedReason: reason });
    // worker تازه فعال است و صفحه روی کدِ قدیمی مانده؛ اعلان دوباره نشان داده می‌شود.
    availableListeners.forEach((listener) => listener());
    return;
  }
  window.location.reload();
}

/** فعال‌سازی و بارگذاریِ دوباره، بی‌پرسش از دفترِ ایمنی — فقط از `applyUpdate*`. */
function activate() {
  // worker منتظری که یک بار به `SKIP_WAITING` جواب نداد (ناقص نصب شده) دوباره امتحان
  // نمی‌شود؛ مسیرِ بارگذاریِ کامل صفحه را به buildِ تازه می‌رساند.
  const waiting = getState().activationFailed ? null : registration?.waiting;
  trace("activate", { viaWaitingWorker: Boolean(waiting) });
  setState({ status: UPDATE_STATUS.UPDATING, blockedReason: null, activationFailed: false });
  activationTimer = setTimeout(failActivation, ACTIVATION_TIMEOUT_MS);
  if (!waiting) {
    hardReload();
    return;
  }
  // بارگذاریِ دوباره با `controllerchange` است، نه `updateSW(true)`ِ
  // vite-plugin-pwa: آن فقط وقتی صفحه را بارگذاری می‌کند که رویدادِ `waiting`ِ
  // workbox قبلاً رسیده باشد، و نسخه‌ای که `checkForUpdate` زودتر پیدا کرده
  // فعال می‌شد ولی صفحه روی نسخه‌ی قبلی می‌ماند.
  onControllerChange = reloadIfSafe;
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
  // بی‌پرسش فقط برای worker که خودش buildِ جدیدتر را تأیید کرده؛ ادعای `version.json`
  // و worker ناشناس ممکن است به پاک‌کردنِ worker و کش برسد.
  if (availableReason !== "worker-newer") return false;
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
    checkForUpdate("after-login"),
    new Promise((resolve) => setTimeout(() => resolve(getState().status), waitMs)),
  ]);
  return status === UPDATE_STATUS.AVAILABLE ? applyUpdateAutomatically() : false;
}

let initialized = false;

/** یک بار، پیش از رندرِ برنامه (`main.jsx`). */
export function initAppUpdates({ onOfflineReady } = {}) {
  if (initialized) return;
  initialized = true;
  if (resumeHardReset()) return;
  // نشانه‌ی ادعای کهنه/منقضی (یا بروزرسانیِ موفق) همین‌جا پاک می‌شود.
  claimWasTried(APP_BUILD.builtAt);
  registerSW({
    // «worker منتظر» رویداد است نه حکم: همان بررسیِ معمول تصمیم می‌گیرد جدیدتر هست یا نه.
    onNeedRefresh: () => checkForUpdate("waiting-event"),
    onNeedReload: reloadIfSafe,
    onOfflineReady,
    onRegisteredSW(_swUrl, swRegistration) {
      if (!swRegistration) return;
      registration = swRegistration;
      setState({ supported: true });
      resolveRegistered?.();
      setInterval(() => checkForUpdate("interval"), PERIODIC_CHECK_MS);
      window.addEventListener("online", () => checkForUpdate("online"));
      // هنگامِ باز شدن فقط بررسی می‌شود؛ باز شدنِ برنامه به معنیِ «کاری ندارم» نیست.
      checkForUpdate("launch");
      // برگه‌ای که ساعت‌ها پشتِ برگه‌های دیگر بوده، با برگشتن بررسی می‌شود.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate("visible");
      });
    },
  });
}
