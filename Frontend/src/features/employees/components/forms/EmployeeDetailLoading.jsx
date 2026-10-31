import {
  FieldPairSkeleton,
  FieldSkeleton,
  FormActionsSkeleton,
  FormCardSkeleton,
  FormPageSkeleton,
} from "@/shared/components/skeletons/FormSkeleton";

export default function EmployeeDetailLoading() {
  return (
    <FormPageSkeleton
      start={
        <FormCardSkeleton titleWidth="w-52">
          <FieldPairSkeleton />
          <FieldPairSkeleton />
        </FormCardSkeleton>
      }
      end={
        <>
          <FormCardSkeleton titleWidth="w-24">
            <FieldSkeleton />
            <div className="h-20 bg-muted/30 rounded-xl" />
          </FormCardSkeleton>
          <FormActionsSkeleton />
        </>
      }
    />
  );
}
