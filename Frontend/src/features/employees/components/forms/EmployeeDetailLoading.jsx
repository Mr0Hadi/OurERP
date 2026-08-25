// src/features/employees/components/forms/EmployeeDetailLoading.jsx

const FieldSkeleton = () => (
  <div className="space-y-1.5">
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-10 bg-muted/50 rounded-lg" />
  </div>
);

const CardSkeleton = ({ children, titleWidth = "w-32" }) => (
  <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
    <div className="border-b bg-muted/30 py-4 px-6 flex items-center gap-3">
      <div className="h-9 w-9 bg-primary/10 rounded-xl" />
      <div className={`h-5 ${titleWidth} bg-muted rounded-lg`} />
    </div>
    <div className="py-5 px-6 space-y-4">{children}</div>
  </div>
);

export default function EmployeeDetailLoading() {
  return (
    <div className="container m-auto bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          <div className="lg:col-span-1 space-y-4">
            <CardSkeleton titleWidth="w-52">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
            </CardSkeleton>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <CardSkeleton titleWidth="w-24">
              <FieldSkeleton />
              <div className="h-20 bg-muted/30 rounded-xl" />
            </CardSkeleton>

            <div className="flex gap-2">
              <div className="h-9 flex-1 bg-muted/50 rounded-lg" />
              <div className="h-9 flex-1 bg-primary/20 rounded-lg" />
            </div>
            <div className="h-9 w-full bg-muted/50 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
