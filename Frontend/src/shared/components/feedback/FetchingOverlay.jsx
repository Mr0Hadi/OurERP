/**
 * پوششِ نیمه‌شفاف روی محتوای لیست هنگام واکشی دوباره (تغییر فیلتر یا صفحه).
 * برای بار اول از اسکلتون استفاده می‌شود، نه این؛ پس معمولاً
 * active={isFetching && !isLoading} پاس داده می‌شود.
 */
export default function FetchingOverlay({ active, children }) {
  return (
    <div className="relative">
      {active && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/60 backdrop-blur-[2px]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      )}
      {children}
    </div>
  );
}
