import { MapPin, Map } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export default function CustomerAddressForm({ register }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <MapPin className="ml-2 h-5 w-5" />
          آدرس و موقعیت مکانی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="address">آدرس کامل</Label>
          <Input id="address" {...register("address")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="postalCode">کد پستی</Label>
            <Input id="postalCode" dir="ltr" {...register("postalCode")} />
          </div>

          <div className="space-y-2">
            <Label>مختصات جغرافیایی</Label>
            <div className="flex gap-2">
              <Input dir="ltr" placeholder="Lat" {...register("lat")} />
              <Input dir="ltr" placeholder="Lng" {...register("lng")} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Open Google Maps"
                onClick={() => window.open("https://maps.google.com", "_blank")}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
