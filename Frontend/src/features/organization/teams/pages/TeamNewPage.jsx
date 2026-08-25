// src/features/organization/teams/pages/TeamNewPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { ROUTES } from "@/shared/constants/routes";

import { useCreateTeamMutation } from "../services/mutations";
import { useTeamForm } from "../hooks/useTeamForm";
import {
  useEmployeeOptions,
  labelOfOption,
} from "../../hooks/useEmployeeOptions";
import TeamIdentityForm from "../components/forms/TeamIdentityForm";
import OrgLeadershipForm from "../../components/OrgLeadershipForm";

export default function TeamNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateTeamMutation();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);
  const { options } = useEmployeeOptions();

  useEffect(() => {
    setHeader({ title: "ثبت تیم جدید", showBack: true });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const { formMethods, buildPayload } = useTeamForm();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    createMutation.mutate(
      buildPayload(data, labelOfOption(options, data.headId)),
      { onSuccess: () => navigate(ROUTES.ORG_TEAMS) },
    );
  };

  const isBusy = createMutation.isPending;

  return (
    <div className="m-auto bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          <div className="lg:col-span-1 space-y-4">
            <TeamIdentityForm
              register={register}
              errors={errors}
              control={control}
            />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <OrgLeadershipForm control={control} scopeLabel="تیم" />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isBusy}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ثبت..." : "ثبت تیم"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
