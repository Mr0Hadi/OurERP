import {
  FieldSkeleton,
  FormActionsSkeleton,
  FormCardSkeleton,
  FormPageSkeleton,
} from "@/shared/components/skeletons/FormSkeleton";

/** اسکلتونِ مشترک صفحه‌ی جزئیات واحد و تیم — چیدمانشان یکی است. */
export default function OrgDetailLoading() {
  return (
    <FormPageSkeleton
      start={
        <>
          <FormCardSkeleton titleWidth="w-28">
            <FieldSkeleton labelWidth="w-24" />
            <FieldSkeleton labelWidth="w-24" />
          </FormCardSkeleton>
          <div className="h-20 bg-muted/20 rounded-2xl border border-border" />
        </>
      }
      end={
        <>
          <FormCardSkeleton titleWidth="w-24">
            <FieldSkeleton labelWidth="w-24" />
            <FieldSkeleton labelWidth="w-24" />
          </FormCardSkeleton>
          <FormActionsSkeleton />
        </>
      }
    />
  );
}
