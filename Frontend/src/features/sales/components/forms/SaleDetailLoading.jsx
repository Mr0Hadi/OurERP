// src/features/purchases/components/PurchasesDetailLoading.jsx

export default function SaleDetailLoading() {
  return (
    <div className="container m-auto bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ستون اصلی - اقلام خرید + اطلاعات فاکتور */}
          <div className="lg:col-span-2 space-y-4">

            {/* کارت اقلام خرید */}
            <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
              {/* هدر */}
              <div className="border-b bg-muted/30 py-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-xl" />
                  <div className="h-5 w-28 bg-muted rounded-lg" />
                </div>
                <div className="h-9 w-36 bg-primary/20 rounded-lg" />
              </div>

              <div className="py-5 px-6 space-y-4">
                {/* نوار جست‌وجو و فیلتر */}
                <div className="flex gap-3">
                  <div className="h-10 flex-1 bg-muted/50 rounded-lg" />
                  <div className="h-10 w-36 bg-muted/50 rounded-lg" />
                </div>

                {/* لیست محصولات - ۳ ردیف */}
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 border rounded-xl bg-muted/10"
                    >
                      <div className="w-12 h-12 rounded-lg bg-muted/50 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-20 bg-muted/60 rounded" />
                      </div>
                      <div className="h-4 w-16 bg-muted/60 rounded" />
                      <div className="h-8 w-8 bg-muted/50 rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>

                {/* جدول اقلام انتخاب‌شده */}
                <div className="border rounded-xl overflow-hidden mt-2">
                  {/* هدر جدول */}
                  <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-muted/30 border-b">
                    {[40, 16, 24, 20, 20, 12].map((w, i) => (
                      <div
                        key={i}
                        className={`h-3 bg-muted rounded`}
                        style={{ width: `${w * 4}px`, maxWidth: "100%" }}
                      />
                    ))}
                  </div>
                  {/* دو ردیف */}
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="grid grid-cols-6 gap-2 px-4 py-3 border-b last:border-0 items-center"
                    >
                      <div className="h-4 bg-muted/50 rounded" />
                      <div className="h-9 bg-muted/50 rounded-lg" />
                      <div className="h-9 bg-muted/50 rounded-lg" />
                      <div className="h-9 bg-muted/50 rounded-lg" />
                      <div className="h-4 bg-muted/50 rounded" />
                      <div className="h-8 w-8 bg-muted/50 rounded-lg mx-auto" />
                    </div>
                  ))}
                  {/* فوتر جمع */}
                  <div className="flex justify-end gap-4 px-4 py-3 bg-muted/20 border-t">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-4 w-28 bg-primary/20 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* کارت اطلاعات فاکتور */}
            <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
              <div className="border-b bg-muted/30 py-4 px-6 flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-xl" />
                <div className="h-5 w-32 bg-muted rounded-lg" />
              </div>
              <div className="py-5 px-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* شماره فاکتور */}
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-10 bg-muted/50 rounded-lg" />
                  </div>
                  {/* تاریخ فاکتور */}
                  <div className="space-y-1.5">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-10 bg-muted/50 rounded-lg" />
                  </div>
                  {/* سررسید */}
                  <div className="space-y-1.5">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-10 bg-muted/50 rounded-lg" />
                  </div>
                </div>
                {/* توضیحات */}
                <div className="space-y-1.5">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-20 bg-muted/50 rounded-lg" />
                </div>
              </div>
            </div>

          </div>

          {/* ستون کناری - تامین‌کننده + پرداخت + دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">

            {/* کارت تامین‌کننده */}
            <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
              <div className="border-b bg-muted/30 py-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-xl" />
                  <div className="h-5 w-24 bg-muted rounded-lg" />
                </div>
                <div className="h-8 w-32 bg-primary/20 rounded-lg" />
              </div>
              <div className="py-5 px-6 space-y-3">
                {/* فیلد جست‌وجو */}
                <div className="h-10 bg-muted/50 rounded-lg" />
                {/* نتایج */}
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 border rounded-xl bg-muted/10"
                  >
                    <div className="w-9 h-9 rounded-full bg-muted/50 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3.5 w-24 bg-muted rounded" />
                      <div className="h-3 w-16 bg-muted/60 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* کارت اطلاعات پرداخت */}
            <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
              <div className="border-b bg-muted/30 py-4 px-6 flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-xl" />
                <div className="h-5 w-28 bg-muted rounded-lg" />
              </div>
              <div className="py-5 px-6 space-y-4">
                {/* خلاصه مبالغ */}
                <div className="border rounded-xl p-3 bg-muted/10 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="h-3.5 w-20 bg-muted rounded" />
                      <div className="h-3.5 w-24 bg-muted/60 rounded" />
                    </div>
                  ))}
                </div>
                {/* نوع پرداخت */}
                <div className="space-y-1.5">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-10 bg-muted/50 rounded-lg" />
                </div>
                {/* مبلغ پرداختی */}
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-10 bg-muted/50 rounded-lg" />
                </div>
              </div>
            </div>

            {/* دکمه‌های عملیات */}
            <div className="flex items-center gap-3">
              <div className="h-10 flex-1 bg-primary/20 rounded-lg" />
              <div className="h-10 w-24 bg-muted/50 rounded-lg" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
