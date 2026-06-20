import { User, Image as ImageIcon } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default function CustomerIdentityForm({ register, errors }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <User className="ml-2 h-5 w-5" />
          اطلاعات هویتی و تماس
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName">نام <span className="text-red-500">*</span></Label>
          <Input id="firstName" {...register("firstName", { required: "وارد کردن نام الزامی است" })} />
          {errors.firstName && <span className="text-sm text-red-500">{errors.firstName.message}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">نام خانوادگی <span className="text-red-500">*</span></Label>
          <Input id="lastName" {...register("lastName", { required: "وارد کردن نام خانوادگی الزامی است" })} />
          {errors.lastName && <span className="text-sm text-red-500">{errors.lastName.message}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">شماره تماس</Label>
          <Input id="phone" type="tel" dir="ltr" {...register("phone")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar">عکس مشتری</Label>
          <div className="flex items-center gap-2">
            <Input id="avatar" type="file" accept="image/*" {...register("avatar")} className="cursor-pointer" />
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
