import { MapPin, Map } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export default function CustomerAddressForm({ register }) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader className="border-b border-muted/40 bg-muted/10 pb-4">
        <CardTitle className="flex items-center text-lg font-semibold text-foreground/90">
          <MapPin className="ml-2 h-5 w-5 text-primary" />
          آدرس و موقعیت مکانی
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium text-foreground/80">آدرس کامل</Label>
          <Input 
            id="address" 
            placeholder="خیابان، کوچه، پلاک، واحد..." 
            className="h-10 focus-visible:ring-primary/30"
            {...register("address")} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="postalCode" className="text-sm font-medium text-foreground/80">کد پستی</Label>
            <Input 
              id="postalCode" 
              dir="ltr" 
              placeholder="1234567890" 
              className="h-10 text-left focus-visible:ring-primary/30"
              {...register("postalCode")} 
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-medium text-foreground/80">مختصات جغرافیایی</Label>
            <div className="flex gap-2">
              <Input 
                dir="ltr" 
                placeholder="عرض جغرافیایی (Lat)" 
                className="h-10 text-left focus-visible:ring-primary/30"
                {...register("lat")} 
              />
              <Input 
                dir="ltr" 
                placeholder="طول جغرافیایی (Lng)" 
                className="h-10 text-left focus-visible:ring-primary/30"
                {...register("lng")} 
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 border-muted hover:bg-muted/80"
                aria-label="Open Google Maps"
                onClick={() => window.open("https://maps.google.com", "_blank")}
              >
                <Map className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
