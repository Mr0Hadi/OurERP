/** اسکرول به بخشِ فرم (`FormSection`) — مثلاً اولین بخشی که پیش از ثبت کم است. */
export function scrollToSection(name) {
  document.getElementById(`section-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
