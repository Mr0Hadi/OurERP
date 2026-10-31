import {
  FieldPairSkeleton,
  FieldSkeleton,
  FormCardSkeleton,
  FormPageSkeleton,
} from "@/shared/components/skeletons/FormSkeleton";

/** اسکلتونِ صفحه‌ی جزئیاتِ مشتری/تامین‌کننده تا رسیدنِ داده. */
export default function PartyDetailLoading() {
  return (
    <FormPageSkeleton
      start={
        <>
          {/* کارت هویتی: آواتار + فیلدها */}
          <FormCardSkeleton titleWidth="w-28" className="flex flex-col sm:flex-row gap-6 items-start space-y-0">
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl bg-muted/30 border-2 border-dashed border-border" />
              <div className="flex gap-2 w-full">
                <div className="h-8 sm:h-9 flex-1 bg-muted rounded-lg" />
                <div className="h-8 sm:h-9 w-8 sm:w-9 bg-muted rounded-lg" />
              </div>
            </div>
            <div className="flex-1 w-full space-y-4">
              <FieldPairSkeleton />
              <FieldSkeleton labelWidth="w-16" />
            </div>
          </FormCardSkeleton>

          <FormCardSkeleton titleWidth="w-24">
            <FieldPairSkeleton />
          </FormCardSkeleton>
        </>
      }
      end={
        <>
          <FormCardSkeleton titleWidth="w-28">
            <FieldSkeleton labelWidth="w-16" height="h-[90px]" />
            <FieldSkeleton />
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-muted/50 rounded-lg" />
                <div className="h-10 bg-muted/50 rounded-lg" />
              </div>
              <div className="h-9 bg-muted/50 rounded-lg" />
            </div>
          </FormCardSkeleton>

          <div className="flex items-center justify-end gap-4">
            <div className="h-9 w-20 bg-muted/50 rounded-lg" />
            <div className="h-9 w-28 bg-primary/20 rounded-lg" />
          </div>
        </>
      }
    />
  );
}
