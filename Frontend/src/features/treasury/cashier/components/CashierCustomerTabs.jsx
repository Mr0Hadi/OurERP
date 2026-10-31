import { BookOpenText, CalendarClock, Package } from "lucide-react";

import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCustomerQuery } from "@/features/customers/services/queries";
import PartyStatementCard from "@/features/partyAccount/components/PartyStatementCard";
import { openingBalanceOf, partyBalanceOf } from "@/features/partyAccount/domain/partyBalance";
import CustomerInstallmentsCard from "@/features/sales/installments/components/CustomerInstallmentsCard";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * جزئیاتِ پیش‌فاکتور و مشتری برای صندوقدار، در تب تا صفحه شلوغ نشود: اقلام، گردشِ حساب (`PartyStatementView`)
 * و قراردادهای اقساطِ مشتری (`SaleInstallmentView`). تبِ بی‌دسترسی نمی‌آید؛ گردش و اقساط فقط با بازشدنِ تب
 * خوانده می‌شوند (Radix محتوای تبِ بسته را نمی‌سازد).
 */
export default function CashierCustomerTabs({ sale }) {
  const { allows } = usePermission();
  const canSeeStatement = allows("PartyStatementView");
  const canSeeInstallments = allows("SaleInstallmentView");
  // مانده‌ی اولیه‌ی دستیِ مشتری برای گردشِ حساب (همان کشِ `CashierCustomerCard`).
  const { data: customer } = useCustomerQuery(canSeeStatement && allows("CustomerView") ? sale.customerId : null);

  const trigger = "flex-1 gap-1.5 sm:flex-none";
  return (
    <Tabs defaultValue="items" className="gap-3">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="items" className={trigger}>
          <Package className="size-4" />
          اقلام ({formatNumber(sale.items.length)})
        </TabsTrigger>
        {canSeeStatement && (
          <TabsTrigger value="statement" className={trigger}>
            <BookOpenText className="size-4" />
            گردش حساب
          </TabsTrigger>
        )}
        {canSeeInstallments && (
          <TabsTrigger value="installments" className={trigger}>
            <CalendarClock className="size-4" />
            اقساط
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="items">
        <OrderItemsReadOnly title="اقلام پیش‌فاکتور" items={sale.items} totalAmount={sale.totalAmount} />
      </TabsContent>
      {canSeeStatement && (
        <TabsContent value="statement">
          <PartyStatementCard
            customerId={sale.customerId}
            totalBalance={customer ? partyBalanceOf(customer) : undefined}
            openingBalance={customer ? openingBalanceOf(customer) : 0}
          />
        </TabsContent>
      )}
      {canSeeInstallments && (
        <TabsContent value="installments">
          <CustomerInstallmentsCard customerId={sale.customerId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
