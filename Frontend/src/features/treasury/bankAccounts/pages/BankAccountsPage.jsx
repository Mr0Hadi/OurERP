import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftRight, Ban, Landmark, Pencil, Plus, Wallet } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import MasterListPane from "@/shared/components/layout/MasterListPane";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { BANK_ACCOUNT_KIND_LABELS, BankAccountKindEnum } from "@/shared/domain/enums/bankAccount";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useBankAccountsQuery } from "../services/queries";
import { useDeactivateBankAccountMutation } from "../services/mutations";
import BankAccountFormDialog from "../components/BankAccountFormDialog";
import BankTransferDialog from "../components/BankTransferDialog";
import BankAccountStatement from "../components/BankAccountStatement";

const detailPath = (id) => routeWithId(ROUTES.TREASURY_ACCOUNTS_DETAIL, id);

/** عدد با علامتِ منفی و رنگِ خطر (مانده‌ی منفی یعنی ثبتی جا افتاده). */
const signed = (value) => {
  const number = Number(value) || 0;
  return `${number < 0 ? "−" : ""}${formatNumber(Math.abs(number))}`;
};

/** جمع‌های بالای فهرست: صندوق‌ها، بانک‌ها، کل، و پولِ بی‌حساب (ردیف‌های قدیمی). */
function Totals({ data, includeInactive, onIncludeInactiveChange }) {
  const rows = [
    ["صندوق‌ها", data?.totalCashBoxBalance],
    ["بانک‌ها", data?.totalBankBalance],
    ["جمعِ کل", data?.totalBalance],
  ];
  const unassigned = Number(data?.unassignedNet) || 0;

  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border text-center">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-card px-1.5 py-1.5">
            <dt className="text-[10px] text-muted-foreground">{label}</dt>
            <dd className={cn("text-xs font-semibold tabular-nums", Number(value) < 0 && toneText("danger"))}>
              {signed(value)}
            </dd>
          </div>
        ))}
      </dl>
      {unassigned !== 0 && (
        <p className="text-[11px] leading-5 text-muted-foreground">
          {signed(unassigned)} ریال دریافت و پرداخت بی‌حساب (ثبت‌های قبل از تعریفِ حساب‌ها) در هیچ مانده‌ای نیست.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="bank-include-inactive" className="text-xs text-muted-foreground">
          نمایشِ حساب‌های غیرفعال
        </Label>
        <Switch id="bank-include-inactive" checked={includeInactive} onCheckedChange={onIncludeInactiveChange} />
      </div>
    </div>
  );
}

/**
 * «صندوق و بانک»: فهرستِ صندوق‌ها و حساب‌های بانکی با مانده در ستونِ کنار، و گردشِ حسابِ انتخاب‌شده در کنارش
 * (`GetBankAccountList`، `GetBankAccountStatement`). افزودن، ویرایش، غیرفعال‌کردن و انتقال با `BankAccountManage`.
 * در موبایل فهرست و جزئیات جدا نمایش داده می‌شوند.
 */
export default function BankAccountsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const canManage = can("BankAccountManage");

  usePageHeader({ title: "صندوق و بانک" });

  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState({ open: false, account: null });
  const [transferOpen, setTransferOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const deactivate = useDeactivateBankAccountMutation();

  const query = useBankAccountsQuery({ includeInactive });
  const accounts = query.data?.accounts ?? [];
  const activeAccounts = accounts.filter((a) => a.isActive);
  const account = id ? accounts.find((a) => String(a.id) === String(id)) : null;
  const accountMissing = id && query.isSuccess && !account;

  const term = search.trim();
  const visible = accounts.filter((a) => !term || a.title.includes(term) || a.bankName?.includes(term));

  const accountMenu = (a) =>
    canManage && a.isActive
      ? [
          { label: "ویرایش", icon: <Pencil className="size-4" />, onSelect: () => setFormState({ open: true, account: a }) },
          { label: "غیرفعال‌کردن", icon: <Ban className="size-4" />, destructive: true, onSelect: () => setDeactivateTarget(a) },
        ]
      : undefined;

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:h-[calc(100svh-6.5rem)] lg:grid-cols-[20rem_minmax(0,1fr)]">
      <MasterListPane
        className={id ? "hidden lg:flex" : "flex h-[calc(100svh-7rem)] lg:h-auto"}
        header={
          canManage && (
            <Button
              onClick={() => setFormState({ open: true, account: null })}
              size="icon"
              className="size-9 shrink-0"
              aria-label="صندوق یا حسابِ تازه"
              title="صندوق یا حسابِ تازه"
            >
              <Plus className="size-4" />
            </Button>
          )
        }
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="جست‌وجوی حساب..."
        filters={<Totals data={query.data} includeInactive={includeInactive} onIncludeInactiveChange={setIncludeInactive} />}
        isLoading={query.isLoading}
        selectedId={id}
        items={visible.map((a) => ({
          id: a.id,
          title: a.title,
          subtitle: [BANK_ACCOUNT_KIND_LABELS[a.kind], a.bankName, !a.isActive && "غیرفعال"].filter(Boolean).join(" · "),
          icon: a.kind === BankAccountKindEnum.BANK ? <Landmark className="size-4" /> : <Wallet className="size-4" />,
          trailing: <span className={cn(Number(a.balance) < 0 && toneText("danger"))}>{signed(a.balance)}</span>,
          to: detailPath(a.id),
          menu: accountMenu(a),
        }))}
        emptyText={
          query.isError
            ? "فهرستِ حساب‌ها دریافت نشد."
            : term
              ? "حسابی پیدا نشد."
              : "هنوز صندوق یا حسابی تعریف نشده."
        }
        footerText={`${formatNumber(accounts.length)} حساب`}
      />

      <main className={id ? "flex min-h-[calc(100svh-7rem)] min-w-0 flex-col lg:min-h-0" : "hidden min-h-0 min-w-0 lg:flex"}>
        {query.isError ? (
          <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : accountMissing ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <Wallet className="size-8 text-muted-foreground/60" />
            <p className="font-medium">این حساب پیدا نشد یا غیرفعال شده است.</p>
            <div className="flex gap-2">
              {!includeInactive && (
                <Button variant="outline" size="sm" onClick={() => setIncludeInactive(true)}>
                  نمایشِ غیرفعال‌ها
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to={ROUTES.TREASURY_ACCOUNTS}>بازگشت به فهرست</Link>
              </Button>
            </div>
          </div>
        ) : account ? (
          <BankAccountStatement
            key={account.id}
            account={account}
            canManage={canManage}
            onEdit={() => setFormState({ open: true, account })}
            onDeactivate={() => setDeactivateTarget(account)}
            onTransfer={() => setTransferOpen(true)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <Wallet className="size-8 text-muted-foreground/60" />
            <p className="font-medium">یک صندوق یا حساب را از فهرست انتخاب کنید</p>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              مانده از مانده‌ی اول دوره و همه‌ی دریافت‌ها، پرداخت‌ها و انتقال‌ها حساب می‌شود. برای اینکه پولی در مانده بیاید،
              هنگامِ ثبتِ دریافت یا پرداخت حسابش را انتخاب کنید.
            </p>
            {canManage && activeAccounts.length > 1 && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight className="size-4" />
                انتقال بین حساب‌ها
              </Button>
            )}
          </div>
        )}
      </main>

      <BankAccountFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        account={formState.account}
        onSaved={(saved) => !formState.account && saved?.id && navigate(detailPath(saved.id))}
      />
      <BankTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={activeAccounts}
        fromBankAccountId={account?.isActive ? account.id : null}
      />
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`غیرفعال‌کردنِ «${deactivateTarget?.title ?? ""}»`}
        description="گردش و مانده‌اش سرِ جایش می‌ماند و در گزارش‌ها دیده می‌شود، ولی دیگر برای دریافت و پرداختِ تازه انتخاب نمی‌شود. حسابی که کارتخوانِ فعالی به آن واریز می‌کند غیرفعال نمی‌شود."
        confirmLabel="غیرفعال‌کردن"
        pendingLabel="در حال انجام..."
        isPending={deactivate.isPending}
        onConfirm={() =>
          deactivate.mutate(deactivateTarget.id, {
            onSuccess: () => {
              setDeactivateTarget(null);
              if (!includeInactive) navigate(ROUTES.TREASURY_ACCOUNTS, { replace: true });
            },
          })
        }
      />
    </div>
  );
}
