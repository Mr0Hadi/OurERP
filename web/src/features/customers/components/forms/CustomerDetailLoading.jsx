// src/features/customers/components/CustomerDetailLoading.jsx

export default function CustomerDetailLoading() {
  return (
    <div className="container max-w-4xl mx-auto space-y-6 animate-pulse pb-10">

      {/* ۱. کارت اطلاعات هویتی و تماس */}
      <div className="border border-muted/60 rounded-xl overflow-hidden bg-card shadow-sm">
        {/* هدر کارت */}
        <div className="border-b border-muted/40 bg-muted/10 p-4 flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded-full" />
          <div className="h-5 w-40 bg-muted rounded-md" />
        </div>
        {/* محتوای کارت */}
        <div className="p-6 flex flex-col md:flex-row gap-8 items-start">
          {/* بخش آواتار مربعی مدرن و دکمه‌ها */}
          <div className="flex flex-col items-center gap-3 w-full md:w-auto shrink-0">
            <div className="w-32 h-32 rounded-2xl bg-muted/40 border-2 border-dashed border-muted/20" />
            <div className="flex gap-2 w-full justify-center">
              <div className="h-9 w-20 bg-muted rounded-lg" />
              <div className="h-9 w-14 bg-muted rounded-lg" />
            </div>
          </div>
          {/* فیلدهای فرم */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1 w-full">
            {/* نام */}
            <div className="space-y-2">
              <div className="h-4 w-12 bg-muted rounded" />
              <div className="h-10 bg-muted rounded-lg" />
            </div>
            {/* نام خانوادگی */}
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-10 bg-muted rounded-lg" />
            </div>
            {/* شماره تماس */}
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-10 bg-muted rounded-lg" />
            </div>
            {/* کد ملی / ایمیل */}
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-10 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* ۲. کارت وضعیت مالی */}
      <div className="border border-muted/60 rounded-xl overflow-hidden bg-card shadow-sm">
        {/* هدر کارت */}
        <div className="border-b border-muted/40 bg-muted/10 p-4 flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded-full" />
          <div className="h-5 w-32 bg-muted rounded-md" />
        </div>
        {/* محتوای کارت */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* وضعیت حساب */}
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
          {/* مبلغ حساب */}
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
        </div>
      </div>

      {/* ۳. کارت آدرس و موقعیت مکانی */}
      <div className="border border-muted/60 rounded-xl overflow-hidden bg-card shadow-sm">
        {/* هدر کارت */}
        <div className="border-b border-muted/40 bg-muted/10 p-4 flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded-full" />
          <div className="h-5 w-40 bg-muted rounded-md" />
        </div>
        {/* محتوای کارت */}
        <div className="p-6 space-y-6">
          {/* آدرس کامل */}
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
          </div>
          {/* کد پستی و مختصات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            {/* کد پستی */}
            <div className="space-y-2 md:col-span-1">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-10 bg-muted rounded-lg" />
            </div>
            {/* مختصات و دکمه نقشه */}
            <div className="space-y-2 md:col-span-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="flex gap-2">
                <div className="h-10 flex-1 bg-muted rounded-lg" />
                <div className="h-10 flex-1 bg-muted rounded-lg" />
                <div className="h-10 w-10 bg-muted rounded-lg shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* دکمه‌های انتهای فرم */}
      <div className="flex items-center justify-end gap-4">
        <div className="h-10 w-24 bg-muted rounded-lg" />
        <div className="h-10 w-32 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
