using Domain.Entities;
using Domain.Enums;

namespace Application.Common.Sales
{
    /// <summary>
    /// تولید سطرهای قسط از روی پارامترهای یک پلن. محاسبه‌ی خالصِ درون‌حافظه‌ای است، پس طبق
    /// قانون async پروژه همگام می‌ماند (بدون Task، بدون Task.Run). هم Create و هم Update پلن
    /// از همین‌جا استفاده می‌کنند تا قاعده‌ی «باقیمانده‌ی رُند روی قسط آخر» یک‌جا تعریف شود.
    /// </summary>
    public static class InstallmentSchedule
    {
        /// <summary>مبلغ پایه‌ی هر قسط با تقسیم صحیح؛ باقیمانده به قسط آخر منتقل می‌شود.</summary>
        public static UInt64 BaseInstallmentAmount(UInt64 financedAmount, int installmentCount)
        {
            if (installmentCount <= 0)
                return 0UL;

            return financedAmount / (UInt64)installmentCount;
        }

        /// <summary>
        /// سود اقساط: round(قیمت نقدی × درصد / ۱۰۰)، نیم به بالا - همان قاعده‌ی گردکردنِ مبالغ فاکتور (InvoiceLineMath).
        /// سرور حساب می‌کند؛ مبلغ قابل پرداخت = قیمت نقدی + همین عدد.
        /// </summary>
        public static UInt64 ChargeAmount(UInt64 cashAmount, decimal markupPercentage)
        {
            var charge = Math.Round(cashAmount * markupPercentage / 100m, MidpointRounding.AwayFromZero);

            return (UInt64)Math.Max(0m, charge);
        }

        /// <summary>
        /// سطرهای قسط را می‌سازد: <paramref name="count"/> سطر با فاصله‌ی ثابت ماهانه از
        /// <paramref name="firstDueDate"/>، شماره‌گذاری از <paramref name="startNumber"/>.
        /// باقیمانده‌ی تقسیم صحیح روی سطر آخر می‌نشیند، نه سطر اول - این‌طور همه‌ی اقساط
        /// جز آخری عدد گرد و یکسانی دارند که برای مشتری قابل‌فهم است.
        /// </summary>
        public static List<SaleInstallment> Build(UInt64 financedAmount, int count, DateTime firstDueDate, int startNumber = 1)
        {
            var installments = new List<SaleInstallment>();
            if (count <= 0)
                return installments;

            var now = DateTime.Now;
            var baseAmount = BaseInstallmentAmount(financedAmount, count);

            for (var index = 0; index < count; index++)
            {
                // قسط آخر باقیمانده‌ی رُند را هم برمی‌دارد.
                var amount = index == count - 1
                    ? financedAmount - baseAmount * (UInt64)(count - 1)
                    : baseAmount;

                installments.Add(new SaleInstallment
                {
                    Number = startNumber + index,
                    DueDate = firstDueDate.AddMonths(index),
                    Amount = amount,
                    Status = SaleInstallmentStatusEnum.PENDING,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            return installments;
        }
    }
}
