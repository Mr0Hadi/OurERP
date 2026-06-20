// src/features/customers/components/CustomerDetailLoading.jsx

export default function CustomerDetailLoading() {
  return (
    <div className="md:w-4xl mx-auto space-y-6 animate-pulse">

      {/* کارت اطلاعات هویتی و تماس */}
      <div className="border border-border/60 rounded-xl p-6 space-y-4 bg-card">
        {/* تیتر کارت */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded-full" />
          <div className="h-5 w-40 bg-muted rounded-md" />
        </div>
        {/* فیلدهای فرم */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* نام */}
          <div className="space-y-2">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
          {/* نام خانوادگی */}
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
          {/* شماره تماس */}
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
          {/* آپلود عکس */}
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="flex items-center gap-2">
              <div className="h-10 flex-1 bg-muted rounded-lg" />
              <div className="h-5 w-5 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* کارت وضعیت مالی */}
      <div className="border border-border/60 rounded-xl p-6 space-y-4 bg-card">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded-full" />
          <div className="h-5 w-32 bg-muted rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* سلکت وضعیت حساب */}
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
          {/* فیلد مبلغ (همیشه نمایش داده می‌شود تا ساختار حفظ شود) */}
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
        </div>
      </div>

      {/* کارت آدرس و موقعیت مکانی */}
      <div className="border border-border/60 rounded-xl p-6 space-y-4 bg-card">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded-full" />
          <div className="h-5 w-40 bg-muted rounded-md" />
        </div>
        <div className="space-y-4">
          {/* آدرس کامل */}
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* کد پستی */}
            <div className="space-y-2">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-10 bg-muted rounded-lg" />
            </div>
            {/* مختصات جغرافیایی */}
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="flex gap-2">
                <div className="h-10 flex-1 bg-muted rounded-lg" />
                <div className="h-10 flex-1 bg-muted rounded-lg" />
                <div className="h-10 w-10 bg-muted rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* دکمه‌های پایین صفحه */}
      <div className="flex items-center justify-end gap-4">
        <div className="h-10 w-24 bg-muted rounded-lg" />
        <div className="h-10 w-36 bg-muted rounded-lg" />
      </div>
    </div>
  );
}