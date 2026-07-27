// src/features/purchases/components/forms/PurchaseReturnDetailLoading.jsx
export default function PurchaseReturnDetailLoading() {
  return (
    <div className="container max-w-6xl mx-auto px-4 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-2xl bg-card shadow-md h-40" />
          <div className="border rounded-2xl bg-card shadow-md h-64" />
        </div>
        <div className="space-y-4">
          <div className="border rounded-2xl bg-card shadow-md h-80" />
        </div>
      </div>
    </div>
  );
}