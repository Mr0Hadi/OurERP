import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        duration: 4000,
        style: {
          // توکن‌های `--toast-*` فقط در تمِ Material تعریف شده‌اند (material.css)؛
          // در بقیه‌ی تم‌ها مقدارِ پیش‌فرضِ قبلی (fallback) اعمال می‌شود.
          background: "var(--toast-bg, #363636)",
          color: "var(--toast-fg, #fff)",
          direction: "rtl", // پشتیبانی از متن فارسی
          fontFamily: "inherit",
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: "var(--toast-success, #10b981)",
            secondary: "var(--toast-icon-fg, #fff)",
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: "var(--toast-error, #ef4444)",
            secondary: "var(--toast-icon-fg, #fff)",
          },
        },
      }}
    />
  );
}
