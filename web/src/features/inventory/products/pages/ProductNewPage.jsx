import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, ImagePlus, Plus, Save, ScanBarcode } from "lucide-react";
import Barcode from "react-barcode";
import { QrReader } from "react-qr-reader"; // اضافه شدن کتابخانه اسکنر

// کامپوننت‌های shadcn
import { Button } from "#/shared/components/ui/button";
import { Input } from "#/shared/components/ui/input";
import { Label } from "#/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "#/shared/components/ui/dialog";

export default function ProductNewPage({ mode = "new", defaultValues }) {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState(null);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false); // استیت برای مودال اسکنر

  const [categories, setCategories] = useState([
    { id: "1", name: "قطعات موتور" },
    { id: "2", name: "بدنه" },
    { id: "3", name: "جلوبندی" },
  ]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: defaultValues || {
      name: "",
      code: "",
      barcode: "",
      category: "",
      brand: "",
      unit: "عدد",
      initialStock: 0,
      purchasePrice: 0,
      sellPrice1: 0,
      sellPrice2: 0,
      vat: 0,
    },
  });

  const watchedBarcode = watch("barcode");

  useEffect(() => {
    if (watchedBarcode && watchedBarcode.trim()) {
      setBarcodeValue(watchedBarcode.trim());
    } else {
      setBarcodeValue("");
    }
  }, [watchedBarcode]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("نام دسته‌بندی نمی‌تواند خالی باشد");
      return;
    }
    const newCat = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
    };
    setCategories([...categories, newCat]);
    setValue("category", newCat.id);
    setNewCategoryName("");
    setIsCategoryDialogOpen(false);
    toast.success("دسته‌بندی جدید اضافه شد");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const payload = { ...data, image: imagePreview };
      console.log("Product Data to submit:", payload);

      toast.success(
        mode === "edit" ? "کالا با موفقیت ویرایش شد!" : "کالا با موفقیت ثبت شد!"
      );
      navigate("/products");
    } catch (error) {
      toast.error("خطا در ثبت کالا");
    }
  };

  return (
    <div className="container mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "edit" ? "ویرایش کالا" : "افزودن کالا جدید"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">اطلاعات پایه</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name" className="text-red-500">
                    نام کالا *
                  </Label>
                  <Input
                    id="name"
                    placeholder="مثال: لنت ترمز جلو پراید"
                    {...register("name", {
                      required: "وارد کردن نام کالا الزامی است",
                    })}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <span className="text-xs text-red-500">
                      {errors.name.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">کد کالا</Label>
                  <Input
                    id="code"
                    placeholder="مثال: PRD-102"
                    {...register("code")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">بارکد</Label>
                  <div className="flex gap-2">
                    <Input
                      id="barcode"
                      className="flex-1"
                      placeholder="بارکد را وارد یا اسکن کنید"
                      {...register("barcode")}
                    />
                    
                    {/* مودال اسکنر بارکد */}
                    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="shrink-0" title="اسکن بارکد">
                          <ScanBarcode className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl" className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>اسکن بارکد با دوربین</DialogTitle>
                        </DialogHeader>
                        <div className="w-full aspect-square bg-black rounded-md overflow-hidden relative flex items-center justify-center">
                          {isScannerOpen && (
                            <QrReader
                              constraints={{ facingMode: "environment" }}
                              onResult={(result, error) => {
                                if (result) {
                                  setValue("barcode", result?.text);
                                  toast.success("بارکد با موفقیت اسکن شد");
                                  setIsScannerOpen(false);
                                }
                              }}
                              className="w-full h-full"
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          دوربین را مقابل بارکد قرار دهید تا به صورت خودکار خوانده شود.
                        </p>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">دسته‌بندی</Label>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(val) => setValue("category", val)}>
                      <SelectTrigger className="flex-1" dir="rtl">
                        <SelectValue placeholder="انتخاب کنید" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Dialog
                      open={isCategoryDialogOpen}
                      onOpenChange={setIsCategoryDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">
                        <DialogHeader>
                          <DialogTitle>افزودن دسته‌بندی جدید</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <Label>نام دسته‌بندی</Label>
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="مثال: روغن موتور"
                            className="mt-2"
                          />
                        </div>
                        <DialogFooter>
                          <Button type="button" onClick={handleAddCategory}>
                            ذخیره
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">برند</Label>
                  <Input
                    id="brand"
                    placeholder="مثال: ایساکو"
                    {...register("brand")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="unit">واحد شمارش</Label>
                  <Select
                    defaultValue="عدد"
                    onValueChange={(val) => setValue("unit", val)}
                  >
                    <SelectTrigger dir="rtl">
                      <SelectValue placeholder="انتخاب واحد" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="عدد">عدد</SelectItem>
                      <SelectItem value="دست">دست</SelectItem>
                      <SelectItem value="لیتر">لیتر</SelectItem>
                      <SelectItem value="کیلوگرم">کیلوگرم</SelectItem>
                      <SelectItem value="کارتن">کارتن</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">موجودی و قیمت‌گذاری</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialStock">موجودی اولیه</Label>
                  <Input
                    type="number"
                    id="initialStock"
                    {...register("initialStock")}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vat">مالیات بر ارزش افزوده (درصد %)</Label>
                  <Input
                    type="number"
                    id="vat"
                    {...register("vat")}
                    min="0"
                    max="100"
                    placeholder="مثال: 9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">قیمت خرید (تومان)</Label>
                  <Input
                    type="number"
                    id="purchasePrice"
                    {...register("purchasePrice")}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellPrice1">قیمت فروش اول (تومان)</Label>
                  <Input
                    type="number"
                    id="sellPrice1"
                    {...register("sellPrice1")}
                    min="0"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="sellPrice2">قیمت فروش دوم (همکار/عمده)</Label>
                  <Input
                    type="number"
                    id="sellPrice2"
                    {...register("sellPrice2")}
                    min="0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-row md:flex-col gap-4 md:gap-6">
            <Card className="w-1/2 md:w-full">
              <CardHeader>
                <CardTitle className="text-lg text-center md:text-right">
                  تصویر کالا
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4">
                <div className="w-48 aspect-square md:w-full mx-auto border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center overflow-hidden bg-muted/20 relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="پیش‌نمایش"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImagePlus className="w-10 h-10 md:w-12 md:h-12 mb-2 opacity-50" />
                      <span className="text-xs md:text-sm">
                        عکسی انتخاب نشده
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="w-1/2 md:w-full">
              <CardHeader>
                <CardTitle className="text-lg text-center md:text-right">
                  بارکد
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4">
                <div className="w-48 h-30 md:w-full mx-auto border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center overflow-hidden p-4">
                  {barcodeValue ? (
                    <Barcode
                      value={barcodeValue}
                      width={1.5}
                      height={60}
                      fontSize={14}
                      margin={5}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <span className="text-xs md:text-sm text-center">
                        بارکد را در فیلد بالا وارد کنید
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6">
          <Button
            type="submit"
            className="w-full h-12 text-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "در حال ذخیره..."
            ) : (
              <>
                <Save className="w-5 h-5 ml-2" />
                {mode === "edit" ? "به‌روزرسانی کالا" : "ذخیره کالا"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
