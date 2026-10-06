import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList,
} from "@/shared/components/ui/combobox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/shared/components/ui/sheet";
import { Switch } from "@/shared/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider,
} from "@/shared/components/ui/sidebar";
import DataTablePagination from "@/shared/components/table/DataTablePagination";

const FRUITS = ["لنت ترمز", "روغن موتور", "فیلتر هوا", "شمع", "تسمه تایم"];
// ردیف‌های ثابتِ نمایشیِ صفحه‌ی راهنما؛ به API وصل نیستند.
const ROWS = [
  ["۱۰۲۴", "لنت ترمز جلو", "۱۲", "۴٬۵۰۰٬۰۰۰"],
  ["۱۰۲۵", "روغن موتور ۴ لیتری", "۴۰", "۲٬۱۰۰٬۰۰۰"],
  ["۱۰۲۶", "فیلتر هوا", "۷", "۸۵۰٬۰۰۰"],
];

function Section({ title, children }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">{children}</CardContent>
    </Card>
  );
}

/** نمونه‌ی کامپوننت‌های پایه با همه‌ی حالت‌ها — برای بررسیِ بصریِ تم‌ها. فقط DEV. */
export default function ComponentShowcase() {
  const [page, setPage] = useState({ pageIndex: 1, pageSize: 10 });
  const [date, setDate] = useState(null);

  return (
    <>
      <Section title="Button">
        <Button>اصلی</Button>
        <Button variant="secondary">ثانویه</Button>
        <Button variant="outline">حاشیه‌دار</Button>
        <Button variant="ghost">شفاف</Button>
        <Button variant="destructive">حذف</Button>
        <Button variant="link">پیوند</Button>
        <Button disabled>غیرفعال</Button>
        <Button variant="outline" disabled>غیرفعال</Button>
        <Button size="sm"><Plus /> کوچک</Button>
        <Button size="xs">خیلی کوچک</Button>
        <Button size="lg">بزرگ</Button>
        <Button size="icon" variant="outline" aria-label="جستجو"><Search /></Button>
        <Button size="icon-sm" variant="ghost" aria-label="حذف"><Trash2 /></Button>
      </Section>

      <Section title="Input / Textarea / DatePicker">
        <Input className="w-48" placeholder="نام کالا" />
        <Input className="w-48" defaultValue="مقدار پر" />
        <Input className="w-48" aria-invalid defaultValue="نامعتبر" />
        <Input className="w-48" disabled defaultValue="غیرفعال" />
        <Textarea className="w-64" placeholder="توضیحات" />
        <div className="w-48"><PersianDatePicker value={date} onChange={setDate} /></div>
      </Section>

      <Section title="Select / Combobox / Dropdown / Popover / Tooltip">
        <Select defaultValue="b">
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="a">گزینه الف</SelectItem>
            <SelectItem value="b">گزینه ب</SelectItem>
            <SelectItem value="c">گزینه ج</SelectItem>
          </SelectContent>
        </Select>
        <Combobox items={FRUITS}>
          <ComboboxInput className="w-48" placeholder="جستجوی کالا" />
          <ComboboxContent>
            <ComboboxEmpty>موردی نیست</ComboboxEmpty>
            <ComboboxList>
              {(item) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline">منو</Button></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>ویرایش</DropdownMenuItem>
            <DropdownMenuItem>کپی</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">حذف</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger asChild><Button variant="outline">Popover</Button></PopoverTrigger>
          <PopoverContent>محتوای Popover</PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="ghost">Tooltip</Button></TooltipTrigger>
          <TooltipContent>راهنما</TooltipContent>
        </Tooltip>
      </Section>

      <Section title="Checkbox / Switch / Badge">
        <Checkbox defaultChecked aria-label="انتخاب" />
        <Checkbox aria-label="انتخاب" />
        <Checkbox disabled aria-label="انتخاب" />
        <Switch defaultChecked aria-label="فعال" />
        <Switch aria-label="فعال" />
        <Switch disabled aria-label="فعال" />
        <Badge>پیش‌فرض</Badge>
        <Badge variant="secondary">ثانویه</Badge>
        <Badge variant="outline">حاشیه‌دار</Badge>
        <Badge variant="destructive">خطا</Badge>
      </Section>

      <Section title="Dialog / AlertDialog / Sheet / Toast">
        <Dialog>
          <DialogTrigger asChild><Button variant="outline">Dialog</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>عنوان</DialogTitle>
              <DialogDescription>توضیح کوتاهِ دیالوگ.</DialogDescription>
            </DialogHeader>
            <Input placeholder="فیلد" />
            <DialogFooter><Button>تأیید</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive">AlertDialog</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>مطمئنید؟</AlertDialogTitle>
              <AlertDialogDescription>این کار قابل بازگشت نیست.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction>ادامه</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Sheet>
          <SheetTrigger asChild><Button variant="outline">Sheet</Button></SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>عنوان</SheetTitle>
              <SheetDescription>توضیح پنل کناری.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <Button variant="outline" onClick={() => toast.success("ذخیره شد")}>Toast موفق</Button>
        <Button variant="outline" onClick={() => toast.error("خطا رخ داد")}>Toast خطا</Button>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">همه</TabsTrigger>
            <TabsTrigger value="b">باز</TabsTrigger>
            <TabsTrigger value="c">بسته</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="a">
          <TabsList variant="line">
            <TabsTrigger value="a">همه</TabsTrigger>
            <TabsTrigger value="b">باز</TabsTrigger>
            <TabsTrigger value="c">بسته</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sidebar (Navigation)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 overflow-hidden rounded-lg border">
            <SidebarProvider className="min-h-0 h-full">
              <Sidebar collapsible="none" className="h-full w-full">
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupLabel>امکانات</SidebarGroupLabel>
                    <SidebarMenu>
                      {["داشبورد", "فروش", "خرید"].map((t, i) => (
                        <SidebarMenuItem key={t}>
                          <SidebarMenuButton isActive={i === 1}>{t}</SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroup>
                </SidebarContent>
              </Sidebar>
            </SidebarProvider>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Card / Table / Pagination</CardTitle>
          <CardDescription>جدول نمونه با سه ردیف</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد</TableHead>
                <TableHead>کالا</TableHead>
                <TableHead>موجودی</TableHead>
                <TableHead>قیمت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((r, i) => (
                <TableRow key={r[0]} data-state={i === 1 ? "selected" : undefined}>
                  {r.map((c) => <TableCell key={c}>{c}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination
            totalPages={5}
            currentPage={page.pageIndex}
            pageSize={page.pageSize}
            onPaginationChange={setPage}
          />
        </CardContent>
        <CardFooter className="gap-2"><Button size="sm">ذخیره</Button><Button size="sm" variant="outline">انصراف</Button></CardFooter>
      </Card>
    </>
  );
}
