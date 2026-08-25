// src/features/organization/departments/components/forms/DepartmentIdentityForm.jsx
import { Building2 } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import { departmentNameRules } from "../../hooks/useDepartmentForm";

export default function DepartmentIdentityForm({ register, errors }) {
  return (
    <FormSectionCard icon={Building2} title="مشخصات واحد">
      <FormField label="نام واحد" htmlFor="name" required error={errors.name}>
        <Input
          id="name"
          placeholder="واحد فروش"
          className="h-10 rounded-lg transition-all"
          {...register("name", departmentNameRules)}
        />
      </FormField>
    </FormSectionCard>
  );
}
