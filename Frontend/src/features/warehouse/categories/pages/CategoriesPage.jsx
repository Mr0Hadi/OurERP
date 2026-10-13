import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import MasterListPane from "@/shared/components/layout/MasterListPane";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";

import { useCategoryProductsQuery, useProductCategoriesQuery } from "../services/queries";
import { useDeleteProductCategoryMutation } from "../services/mutations";
import CategoryFormDialog from "../components/CategoryFormDialog";

/** شناسه‌ی مسیرِ «همه‌ی کالاها»: کالاهای همه‌ی دسته‌ها. */
const ALL_ID = "all";
const PAGE_SIZE = 20;
const detailPath = (id) => routeWithId(ROUTES.WAREHOUSE_CATEGORIES_DETAIL, id);

function CategoryList({ selectedId, className, canManage, onCreate, categories, isLoading, isError }) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  // دسته‌ها یک‌جا گرفته شده‌اند؛ جست‌وجو همین‌جا فیلتر می‌کند.
  const visible = categories.filter((c) => c.name.toLowerCase().includes(term));
  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);

  return (
    <MasterListPane
      className={className}
      header={
        canManage && (
          <Button onClick={onCreate} size="sm" className="w-full gap-1.5">
            <Plus className="size-4" />
            دسته‌بندی جدید
          </Button>
        )
      }
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="جست‌وجوی دسته‌بندی..."
      isLoading={isLoading}
      selectedId={selectedId}
      pinned={[
        {
          id: ALL_ID,
          title: "همه‌ی کالاها",
          subtitle: "کالاهای همه‌ی دسته‌بندی‌ها",
          icon: <Layers className="size-4" />,
          trailing: formatNumber(totalProducts),
          to: detailPath(ALL_ID),
        },
      ]}
      items={visible.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.productCount > 0 ? `${formatNumber(c.productCount)} کالا` : "بدون کالا",
        icon: <Tags className="size-4" />,
        to: detailPath(c.id),
      }))}
      emptyText={
        isError
          ? "فهرست دسته‌بندی‌ها دریافت نشد."
          : search
            ? "دسته‌بندی‌ای پیدا نشد."
            : "هنوز دسته‌بندی‌ای تعریف نشده."
      }
      footerText={`${formatNumber(categories.length)} دسته‌بندی`}
    />
  );
}

function ProductRow({ product }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
      <ProductThumb item={{ ...product, productName: product.name }} />
      <Link
        to={routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, product.id)}
        className="min-w-0 flex-1 hover:text-primary"
      >
        <span className="block truncate text-sm font-medium">{product.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[product.code, product.brand].filter(Boolean).join(" · ")}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground sm:hidden">
          موجودی {formatNumber(product.stock)}
        </span>
      </Link>
      <span className="hidden w-20 shrink-0 text-center text-xs text-muted-foreground sm:block">
        موجودی
        <span className="block text-sm font-medium text-foreground tabular-nums">
          {formatNumber(product.stock)}
        </span>
      </span>
    </li>
  );
}

function CategoryDetail({ id, category, canManage, onRename, onDelete }) {
  const isAll = id === ALL_ID;
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [termFor, setTermFor] = useState(term);
  if (termFor !== term) {
    setTermFor(term);
    setPage(1);
  }

  const query = useCategoryProductsQuery({
    categoryId: isAll ? null : Number(id),
    search: term,
    page,
    take: PAGE_SIZE,
  });
  const products = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const total = query.data?.total ?? 0;

  const title = isAll ? "همه‌ی کالاها" : category?.name ?? "…";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 sm:px-4">
        <Button asChild variant="ghost" size="icon" className="lg:hidden">
          <Link to={ROUTES.WAREHOUSE_CATEGORIES} aria-label="بازگشت به فهرست دسته‌بندی‌ها">
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isAll ? <Layers className="size-5" /> : <Tags className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {isAll ? "کالاهای همه‌ی دسته‌بندی‌ها" : `${formatNumber(total)} کالا`}
          </p>
        </div>
        {canManage && !isAll && category && (
          <>
            <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex" onClick={onRename}>
              <Pencil className="size-3.5" />
              ویرایش نام
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-1.5 text-destructive hover:text-destructive md:inline-flex"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
              حذف
            </Button>
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="گزینه‌های دسته‌بندی">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onRename}>
                  <Pencil className="size-4" />
                  ویرایش نام
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 className="size-4" />
                  حذف دسته‌بندی
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="نام کالا..."
            className="h-9 pr-8"
          />
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto", query.isFetching && !query.isLoading && "opacity-60")}>
          {query.isError ? (
            <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : query.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <Package className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {term ? "کالایی با این جست‌وجو پیدا نشد." : "هنوز کالایی در این دسته‌بندی نیست."}
              </p>
              {!term && !isAll && canManage && (
                <Button asChild size="sm" variant="outline" className="mt-1 gap-1.5">
                  <Link to={ROUTES.WAREHOUSE_PRODUCTS_NEW}>
                    <Plus className="size-4" />
                    کالای جدید
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {products.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              صفحه {formatNumber(page)} از {formatNumber(totalPages)} · {formatNumber(total)} کالا
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                aria-label="صفحه‌ی قبل"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                aria-label="صفحه‌ی بعد"
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * «دسته‌بندی کالاها»: فهرستِ دسته‌ها در ستونِ کنار (مثلِ صفحه‌ی خودروها) و
 * کالاهای دسته‌ی انتخاب‌شده در کنارش. هر کالا فقط یک دسته دارد، پس دسته‌ی
 * کالا از فرمِ خودِ کالا عوض می‌شود. در موبایل فهرست و جزئیات جدا نمایش داده می‌شوند.
 */
export default function CategoriesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const canManage = can("ProductCategoryManage");

  usePageHeader({ title: "دسته‌بندی کالاها" });

  const categoriesQuery = useProductCategoriesQuery();
  const categories = categoriesQuery.data ?? [];
  const category =
    id && id !== ALL_ID ? categories.find((c) => String(c.id) === String(id)) : null;
  const categoryMissing = id && id !== ALL_ID && categoriesQuery.isSuccess && !category;

  const [formState, setFormState] = useState({ open: false, category: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteMutation = useDeleteProductCategoryMutation();

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:h-[calc(100svh-6.5rem)] lg:grid-cols-[19rem_minmax(0,1fr)]">
      <CategoryList
        selectedId={id}
        className={id ? "hidden lg:flex" : "flex h-[calc(100svh-7rem)] lg:h-auto"}
        canManage={canManage}
        onCreate={() => setFormState({ open: true, category: null })}
        categories={categories}
        isLoading={categoriesQuery.isLoading}
        isError={categoriesQuery.isError}
      />

      <main className={id ? "flex min-h-[calc(100svh-7rem)] min-w-0 flex-col lg:min-h-0" : "hidden min-h-0 min-w-0 lg:flex"}>
        {categoryMissing ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <Tags className="size-8 text-muted-foreground/60" />
            <p className="font-medium">این دسته‌بندی پیدا نشد یا حذف شده است.</p>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.WAREHOUSE_CATEGORIES}>بازگشت به فهرست</Link>
            </Button>
          </div>
        ) : id ? (
          <CategoryDetail
            key={id}
            id={id}
            category={category}
            canManage={canManage}
            onRename={() => setFormState({ open: true, category })}
            onDelete={() => setDeleteTarget(category)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <Tags className="size-8 text-muted-foreground/60" />
            <p className="font-medium">یک دسته‌بندی را از فهرست انتخاب کنید</p>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              هر کالا دقیقاً در یک دسته‌بندی است و دسته‌ی کالا از فرمِ خودِ کالا تغییر می‌کند.
            </p>
          </div>
        )}
      </main>

      <CategoryFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        category={formState.category}
        onSaved={(saved) => !formState.category && saved?.id && navigate(detailPath(saved.id))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`حذف دسته‌بندی «${deleteTarget?.name ?? ""}»`}
        description={
          deleteTarget?.productCount > 0
            ? `${formatNumber(deleteTarget.productCount)} کالا در این دسته است. کالاها پاک نمی‌شوند و دسته‌شان روی آن‌ها می‌ماند؛ فقط این دسته دیگر در فهرست‌ها و انتخاب‌گرها نمی‌آید.`
            : "این دسته دیگر در فهرست‌ها و انتخاب‌گرها نمی‌آید."
        }
        confirmLabel="حذف"
        pendingLabel="در حال حذف..."
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteMutation.mutate(deleteTarget?.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              navigate(ROUTES.WAREHOUSE_CATEGORIES, { replace: true });
            },
          })
        }
      />
    </div>
  );
}
