// src/features/warehouse/products/components/forms/CategoryManager.jsx
import { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "#/shared/components/ui/button";
import { Input } from "#/shared/components/ui/input";
import { Label } from "#/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "#/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/shared/components/ui/select";

export default function CategoryManager({ value, onChange, categories, onAddCategory }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAdd = () => {
    if (!newCategoryName.trim()) {
      toast.error("نام دسته‌بندی نمی‌تواند خالی باشد");
      return;
    }

    const newCategory = {
      id: newCategoryName.trim(),
      name: newCategoryName.trim(),
    };

    onAddCategory(newCategory);
    setNewCategoryName("");
    setIsDialogOpen(false);
    toast.success("دسته‌بندی جدید اضافه شد");
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value ?? ""} onValueChange={onChange}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="shrink-0">
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
            <Button type="button" onClick={handleAdd}>
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
