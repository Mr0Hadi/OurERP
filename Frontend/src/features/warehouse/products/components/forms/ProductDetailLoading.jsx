/** چیدمانِ صفحه‌ی جزئیاتِ کالا تا رسیدنِ داده؛ عنوان و «بازگشت» را خودِ هدرِ برنامه دارد. */
export default function ProductDetailLoading() {
  return (
    <div className="container mx-auto space-y-6 animate-pulse">
      {/* گرید اصلی فرم */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ستون سمت چپ (اطلاعات پایه و قیمت‌گذاری) */}
        <div className="md:col-span-2 space-y-6">
          {/* کارت اطلاعات پایه */}
          <div className="border border-border/60 rounded-xl p-6 space-y-4 bg-card">
            <div className="h-5 w-40 bg-muted rounded-md" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-10 bg-muted rounded-lg" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-10 bg-muted rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-12 bg-muted rounded" />
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            </div>
          </div>

          {/* کارت قیمت‌گذاری */}
          <div className="border border-border/60 rounded-xl p-6 space-y-4 bg-card">
            <div className="h-5 w-32 bg-muted rounded-md" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-10 bg-muted rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-10 bg-muted rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* ستون سمت راست (تصویر و بارکد) */}
        <div className="space-y-6">
          {/* آپلود تصویر */}
          <div className="border border-border/60 rounded-xl p-4 space-y-3 bg-card">
            <div className="h-5 w-24 bg-muted rounded-md" />
            <div className="flex items-center justify-center h-40 border-2 border-dashed border-muted rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </div>
          </div>

          {/* بارکد */}
          <div className="border border-border/60 rounded-xl p-4 space-y-3 bg-card">
            <div className="h-5 w-20 bg-muted rounded-md" />
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-32 bg-muted rounded-lg" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>

          {/* انصراف / ذخیره */}
          <div className="flex gap-2">
            <div className="h-9 flex-1 bg-muted rounded-md" />
            <div className="h-9 flex-1 bg-muted rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

