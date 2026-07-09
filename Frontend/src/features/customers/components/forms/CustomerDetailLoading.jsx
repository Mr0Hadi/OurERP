// src/features/customers/components/forms/CustomerDetailLoading.jsx

export default function CustomerDetailLoading() {
  return (
    <div className="container m-auto bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">

          {/* ستون راست - هویتی + مالی */}
          <div className="lg:col-span-1 space-y-4">

            {/* کارت هویتی */}
            <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
              <div className="border-b bg-muted/30 py-4 px-6 flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-xl" />
                <div className="h-5 w-28 bg-muted rounded-lg" />
              </div>
              <div className="py-5 px-6 flex flex-col sm:flex-row gap-6 items-start">
                {/* آواتار */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl bg-muted/30 border-2 border-dashed border-border" />
                  <div className="flex gap-2 w-full">
                    <div className="h-8 sm:h-9 flex-1 bg-muted rounded-lg" />
                    <div className="h-8 sm:h-9 w-8 sm:w-9 bg-muted rounded-lg" />
                  </div>
                </div>
                {/* فیلدها */}
                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="h-4 w-14 bg-muted rounded" />
                      <div className="h-10 bg-muted/50 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-4 w-20 bg-muted rounded" />
                      <div className="h-10 bg-muted/50 rounded-lg" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-16 bg-muted rounded" />
                    <div className="h-10 bg-muted/50 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* کارت مالی */}
            <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
              <div className="border-b bg-muted/30 py-4 px-6 flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-xl" />
                <div className="h-5 w-24 bg-muted rounded-lg" />
              </div>
              <div className="py-5 px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-10 bg-muted/50 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-10 bg-muted/50 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ستون چپ - آدرس + دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">

            {/* کارت آدرس */}
            <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
              <div className="border-b bg-muted/30 py-4 px-6 flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-xl" />
                <div className="h-5 w-28 bg-muted rounded-lg" />
              </div>
              <div className="py-5 px-6 space-y-4">
                <div className="space-y-1.5">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-[90px] bg-muted/50 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-10 bg-muted/50 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 bg-muted/50 rounded-lg" />
                    <div className="h-10 bg-muted/50 rounded-lg" />
                  </div>
                  <div className="h-9 bg-muted/50 rounded-lg" />
                </div>
              </div>
            </div>

            {/* دکمه‌ها */}
            <div className="flex items-center justify-end gap-4">
              <div className="h-9 w-20 bg-muted/50 rounded-lg" />
              <div className="h-9 w-28 bg-primary/20 rounded-lg" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
