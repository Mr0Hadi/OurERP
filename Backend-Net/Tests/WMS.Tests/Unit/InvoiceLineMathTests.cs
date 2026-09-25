using Application.Common.Documents;
using Application.Common.Sales;
using Domain.Entities;
using Domain.Enums;

namespace WMS.Tests.Unit
{
    public class InvoiceLineMathTests
    {
        private static SaleItem Line(int quantity, ulong unitPrice, int discount, int taxPercent, TaxCategoryEnum category = TaxCategoryEnum.TAXABLE)
        {
            var line = new SaleItem { Quantity = quantity, UnitPrice = unitPrice, Discount = discount };
            InvoiceLineMath.Stamp(line, new Product { Tax = taxPercent, TaxCategory = category });
            return line;
        }

        [Fact]
        public void WorkedExample_RoundsDiscountAndTaxPerLine()
        {
            // 3 x 333,333 = 999,999; 7% = 69,999.93 -> 70,000; net 929,999; 10% = 92,999.9 -> 93,000.
            var line = Line(3, 333_333, 7, 10);

            Assert.Equal(999_999UL, line.GrossAmount);
            Assert.Equal(70_000UL, line.DiscountAmount);
            Assert.Equal(929_999UL, line.NetAmount);
            Assert.Equal(93_000UL, line.TaxAmount);
            Assert.Equal(1_022_999UL, line.TotalAmount);
            Assert.Equal(TaxCategoryEnum.TAXABLE, line.TaxCategory);
            Assert.Equal(10, line.TaxPercent);
        }

        [Fact]
        public void HalfARial_RoundsUp_NotToEven()
        {
            // 250 x 1% = 2.5 -> 3 (banker's rounding would give 2).
            var line = Line(1, 250, 1, 0);

            Assert.Equal(3UL, line.DiscountAmount);
            Assert.Equal(247UL, line.TotalAmount);
        }

        [Fact]
        public void ExemptProduct_CarriesNoTax_WhateverItsRate()
        {
            var line = Line(2, 1_000, 0, 9, TaxCategoryEnum.EXEMPT);

            Assert.Equal(0, line.TaxPercent);
            Assert.Equal(0UL, line.TaxAmount);
            Assert.Equal(2_000UL, line.TotalAmount);
        }

        [Fact]
        public void Recompute_KeepsTheLinesOwnSnapshot()
        {
            var line = Line(1, 1_000, 0, 10);
            line.Quantity = 3;

            InvoiceLineMath.Recompute(line);

            Assert.Equal(10, line.TaxPercent);
            Assert.Equal(3_300UL, line.TotalAmount);
        }

        [Fact]
        public void DocumentTotal_IsThePlainSumOfLineTotals()
        {
            var lines = new[] { Line(3, 333_333, 7, 10), Line(1, 250, 1, 0) };

            Assert.Equal(1_022_999UL + 247UL, InvoiceLineMath.DocumentTotal(lines));
        }

        [Fact]
        public void InstallmentCharge_RoundsHalfUp()
        {
            Assert.Equal(2_000_000UL, InstallmentSchedule.ChargeAmount(10_000_000, 20m));
            Assert.Equal(1UL, InstallmentSchedule.ChargeAmount(5, 10m)); // 0.5 -> 1
        }
    }
}
