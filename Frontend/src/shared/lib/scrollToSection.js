import toast from "react-hot-toast";

/** اسکرول به بخشِ فرم (`FormSection`) — مثلاً اولین بخشی که پیش از ثبت کم است. */
export function scrollToSection(name) {
  document.getElementById(`section-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * نخستین مشکلِ فرم پیش از ثبت: پیام و اسکرول به همان بخش.
 *
 * @param problem `[پیام، نامِ بخش]` — همان چیزی که قاعده‌های فرمِ هر سند برمی‌گردانند
 */
export function reportFormProblem([message, section]) {
  toast.error(message);
  if (section) scrollToSection(section);
}
