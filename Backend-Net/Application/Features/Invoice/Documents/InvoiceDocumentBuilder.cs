using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Queries;
using Application.Common.Settings;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Invoice.Documents
{
    /// <summary>
    /// The one place each official document's content is built. The PDF endpoints render it and the print-data endpoints
    /// (docs/frontend-requests.fa.md section 27) return it as JSON, so a document printed in the browser and the archived PDF
    /// can never disagree. Every amount is a stored one - nothing here computes money of its own.
    /// </summary>
    public static class InvoiceDocumentBuilder
    {
        public static async Task<InvoiceDocumentModel> SaleInvoiceAsync(IWMSDbContext context, int saleId, CancellationToken cancellationToken)
        {
            var company = await SystemSettingValues.CompanyAsync(context, cancellationToken);
            var sale = await context.Sales.AsNoTracking()
                .Include(x => x.Customer)
                .Include(x => x.Items)
                    .ThenInclude(x => x.Product)
                .Include(x => x.InstallmentPlan)
                .FirstOrDefaultAsync(x => x.Id == saleId, cancellationToken)
                    ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            // The document prints what is stored on each line (InvoiceLineMath) - it computes nothing of its own, so the
            // PDF, the API and Sale.TotalAmount can never disagree.
            var lines = sale.Items.OrderBy(i => i.Id).Select((item, index) => new InvoiceLineModel
            {
                RowNumber = index + 1,
                ProductCode = item.Product.Code,
                ProductName = item.Product.Name,
                Quantity = item.Quantity,
                Unit = item.Product.Unit.GetDescription(),
                UnitPrice = item.UnitPrice,
                GrossAmount = item.GrossAmount,
                DiscountAmount = item.DiscountAmount,
                NetAmount = item.NetAmount,
                TaxPercent = item.TaxPercent,
                TaxAmount = item.TaxAmount,
                LineTotal = item.TotalAmount,
            }).ToList();

            var plan = sale.InstallmentPlan is { IsActive: true } ? sale.InstallmentPlan : null;
            var isProforma = sale.Status == SalesStatusEnum.PROFORMA;

            var model = new InvoiceDocumentModel
            {
                Title = isProforma ? "پیش‌فاکتور فروش" : "فاکتور فروش",
                IsProforma = isProforma,
                DocumentNumber = sale.InvoiceNumber,
                // پیش‌فاکتور هنوز تاریخ فاکتور رسمی ندارد؛ تاریخ ثبت سند چاپ می‌شود.
                DocumentDate = sale.InvoiceDate ?? sale.CreatedAt,
                PaymentDueDate = sale.PaymentDate,
                StatusText = sale.Status.GetDescription(),
                Description = sale.Description,
                Company = company,
                CounterpartyLabel = "خریدار",
                Counterparty = new PartyInfo
                {
                    Name = $"{sale.Customer.FirstName} {sale.Customer.LastName}",
                    PhoneNumber = sale.Customer.PhoneNumber,
                    Address = sale.Customer.Address,
                    PostalCode = sale.Customer.PostalCode,
                    EconomicCode = sale.Customer.EconomicCode,
                    NationalId = sale.Customer.NationalId,
                    RegistrationNumber = sale.Customer.RegistrationNumber,
                    Province = sale.Customer.Province,
                    City = sale.Customer.City,
                },
                Lines = lines,
                SubTotal = sale.Items.Aggregate(0UL, (sum, l) => sum + l.GrossAmount),
                TotalDiscount = sale.Items.Aggregate(0UL, (sum, l) => sum + l.DiscountAmount),
                TotalTax = sale.Items.Aggregate(0UL, (sum, l) => sum + l.TaxAmount),
                GrandTotal = sale.TotalAmount,
                InstallmentChargeAmount = plan?.InstallmentChargeAmount,
                PayableAmount = plan?.TotalAmount,
                PaidAmount = sale.PaidAmount,
            };
            model.Balance = (long)(model.PayableAmount ?? model.GrandTotal) - (long)model.PaidAmount;
            return model;
        }

        /// <summary>
        /// A credit note only ever covers a return's MONEY_OUT effects (money owed back to the customer, regardless of payment
        /// Method). GOODS_IN/GOODS_OUT settle in goods, not money, so they have no place on this document; MONEY_IN (the customer
        /// paying us, e.g. an upcharge on a replacement) is the opposite direction and also excluded. One printed line per effect,
        /// not per product, so the paper trail matches the individual AddClaimResolutionCommand calls it was built from.
        /// </summary>
        public static async Task<InvoiceDocumentModel> SaleReturnCreditNoteAsync(IWMSDbContext context, int saleReturnId, CancellationToken cancellationToken)
        {
            var company = await SystemSettingValues.CompanyAsync(context, cancellationToken);
            var saleReturn = await context.SaleReturns.AsNoTracking()
                .WhereNotDeleted()
                .WithReturnGraph()
                .Include(x => x.Sale!)
                    .ThenInclude(x => x.Customer)
                .FirstOrDefaultAsync(x => x.Id == saleReturnId, cancellationToken)
                    ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            var sale = saleReturn.Sale!;
            var customer = sale.Customer;

            var settledEffects = saleReturn.Claims
                .SelectMany(claim => claim.Resolutions.SelectMany(r => r.Effects.Select(e => (claim, effect: e))))
                .Where(x => x.effect.Direction == ReturnEffectDirectionEnum.MONEY_OUT)
                .ToList();

            if (settledEffects.Count == 0)
                throw new ValidationCustomException("این مرجوعی هیچ اثر مالی (استرداد وجه) ندارد.");

            var lines = settledEffects.Select((x, index) =>
            {
                var amount = x.effect.Amount ?? 0;
                return ReturnLine(index, x.claim.Product, x.claim.Product?.Name + " (استرداد وجه)", x.claim.Quantity, x.claim.UnitPrice, amount);
            }).ToList();

            var grandTotal = lines.Aggregate(0UL, (sum, l) => sum + l.LineTotal);

            return new InvoiceDocumentModel
            {
                Title = "برگه اعتباری مرجوعی",
                DocumentNumber = saleReturn.ReturnNumber,
                DocumentDate = saleReturn.UpdatedAt,
                StatusText = saleReturn.Status.GetDescription(),
                Description = saleReturn.Description,
                Notes = new() { $"مرجوعی مربوط به فاکتور فروش شماره {sale.InvoiceNumber}".ToPersianDigits() },
                Company = company,
                CounterpartyLabel = "مشتری",
                Counterparty = new PartyInfo
                {
                    Name = $"{customer.FirstName} {customer.LastName}",
                    PhoneNumber = customer.PhoneNumber,
                    Address = customer.Address,
                    PostalCode = customer.PostalCode,
                    EconomicCode = customer.EconomicCode,
                    NationalId = customer.NationalId,
                    RegistrationNumber = customer.RegistrationNumber,
                    Province = customer.Province,
                    City = customer.City,
                },
                Lines = lines,
                SubTotal = grandTotal,
                TotalDiscount = 0,
                TotalTax = 0,
                GrandTotal = grandTotal,
                PaidAmount = 0,
                Balance = -(long)grandTotal,
            };
        }

        /// <summary>
        /// The sheet that travels with goods going back to a supplier, and that purchasing keeps to follow up the money. Unlike
        /// the sale-side credit note it is printed for every purchase return, whatever its decisions: the claims are the goods,
        /// so the claims are the lines (one per claim, priced at the claim's unit price). What was decided for them does not fit
        /// the line table, so it goes into the notes as one line per effect kind.
        ///
        /// "پرداخت شده" is money the supplier has already paid back (applied MONEY_IN) and "مانده" is money still expected from
        /// them (pending MONEY_IN) - not the invoice meaning of those two boxes, since a return has no payable of its own.
        /// </summary>
        public static async Task<InvoiceDocumentModel> PurchaseReturnAsync(IWMSDbContext context, int purchaseReturnId, CancellationToken cancellationToken)
        {
            var company = await SystemSettingValues.CompanyAsync(context, cancellationToken);
            var purchaseReturn = await context.PurchaseReturns.AsNoTracking()
                .WhereNotDeleted()
                .Include(x => x.Purchase!).ThenInclude(x => x.Supplier)
                .WithReturnGraph()
                .FirstOrDefaultAsync(x => x.Id == purchaseReturnId, cancellationToken)
                    ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            var purchase = purchaseReturn.Purchase!;
            var supplier = purchase.Supplier;

            var lines = purchaseReturn.Claims
                .OrderBy(c => c.Id)
                .Select((claim, index) => ReturnLine(index, claim.Product, $"{claim.Product?.Name} ({claim.Problem.GetDescription()})",
                    claim.Quantity, claim.UnitPrice, checked((ulong)claim.Quantity * claim.UnitPrice)))
                .ToList();

            var grandTotal = lines.Aggregate(0UL, (sum, l) => checked(sum + l.LineTotal));

            var effects = purchaseReturn.Claims
                .SelectMany(c => c.Resolutions)
                .SelectMany(r => r.Effects)
                .Where(e => e.Status != ReturnEffectStatusEnum.VOID)
                .ToList();

            var moneyIn = effects.Where(e => e.Direction == ReturnEffectDirectionEnum.MONEY_IN).ToList();
            var received = moneyIn.Where(e => e.Status == ReturnEffectStatusEnum.APPLIED).Aggregate(0UL, (s, e) => checked(s + (e.Amount ?? 0)));
            var expected = moneyIn.Where(e => e.Status == ReturnEffectStatusEnum.PENDING).Aggregate(0UL, (s, e) => checked(s + (e.Amount ?? 0)));

            return new InvoiceDocumentModel
            {
                Title = "برگه مرجوعی به تامین‌کننده",
                DocumentNumber = purchaseReturn.ReturnNumber,
                DocumentDate = purchaseReturn.ReturnDate,
                StatusText = purchaseReturn.Status.GetDescription(),
                Description = purchaseReturn.Description,
                Notes = PurchaseReturnSummary(purchase.InvoiceNumber, effects, purchaseReturn.Claims.SelectMany(c => c.Resolutions).Any(r => r.IsWriteOff), company.Currency),
                Company = company,
                CounterpartyLabel = "تامین‌کننده",
                Counterparty = new PartyInfo
                {
                    Name = supplier.CompanyName,
                    PhoneNumber = supplier.Phone,
                    Address = supplier.Address,
                    PostalCode = supplier.PostalCode,
                    EconomicCode = supplier.EconomicCode,
                    NationalId = supplier.NationalId,
                    RegistrationNumber = supplier.RegistrationNumber,
                    Province = supplier.Province,
                    City = supplier.City,
                },
                Lines = lines,
                SubTotal = grandTotal,
                TotalDiscount = 0,
                TotalTax = 0,
                GrandTotal = grandTotal,
                PaidAmount = received,
                Balance = (long)expected,
            };
        }

        /// <summary>A return sheet line: a return carries no discount or tax of its own, so gross = net = the line total.</summary>
        private static InvoiceLineModel ReturnLine(int index, Domain.Entities.Product? product, string name, int quantity, ulong unitPrice, ulong total) => new()
        {
            RowNumber = index + 1,
            ProductCode = product?.Code ?? string.Empty,
            ProductName = name,
            Quantity = quantity,
            Unit = product?.Unit.GetDescription() ?? "عدد",
            UnitPrice = unitPrice,
            GrossAmount = total,
            DiscountAmount = 0,
            NetAmount = total,
            TaxPercent = 0,
            TaxAmount = 0,
            LineTotal = total,
        };

        /// <summary>One line per effect kind that occurs, "done of total" for goods and "received / expected" for money.</summary>
        private static List<string> PurchaseReturnSummary(string invoiceNumber, List<Domain.Entities.PurchaseReturnEffect> effects, bool hasWriteOff, string currency)
        {
            var parts = new List<string> { $"مرجوعی فاکتور خرید شماره {invoiceNumber}" };

            void Goods(ReturnEffectDirectionEnum direction, string label)
            {
                var of = effects.Where(e => e.Direction == direction).ToList();
                if (of.Count == 0)
                    return;
                parts.Add($"{label}: {of.Sum(e => e.AppliedQuantity)} از {of.Sum(e => e.Quantity)} عدد انجام شده");
            }

            void Money(ReturnEffectDirectionEnum direction, string label)
            {
                var of = effects.Where(e => e.Direction == direction).ToList();
                if (of.Count == 0)
                    return;
                var applied = of.Where(e => e.Status == ReturnEffectStatusEnum.APPLIED).Aggregate(0UL, (s, e) => checked(s + (e.Amount ?? 0)));
                var pending = of.Where(e => e.Status == ReturnEffectStatusEnum.PENDING).Aggregate(0UL, (s, e) => checked(s + (e.Amount ?? 0)));
                var methods = string.Join("، ", of.Where(e => e.Method.HasValue).Select(e => e.Method!.Value.GetDescription()).Distinct());
                parts.Add($"{label}: {applied:N0} {currency} انجام شده، {pending:N0} {currency} در انتظار" + (methods.Length > 0 ? $" ({methods})" : string.Empty));
            }

            Goods(ReturnEffectDirectionEnum.GOODS_OUT, "کالای عودت‌شده به تامین‌کننده");
            Goods(ReturnEffectDirectionEnum.GOODS_IN, "کالای جایگزین از تامین‌کننده");
            Goods(ReturnEffectDirectionEnum.GOODS_RELEASE, "آزادسازی از قرنطینه");
            Goods(ReturnEffectDirectionEnum.GOODS_SCRAP, "اسقاط");
            Money(ReturnEffectDirectionEnum.MONEY_IN, "دریافت وجه از تامین‌کننده");
            Money(ReturnEffectDirectionEnum.MONEY_OUT, "پرداخت وجه به تامین‌کننده");
            if (hasWriteOff)
                parts.Add("بخشی از ادعا بدون جبران بسته شد");

            return parts.Select(p => p.ToPersianDigits()).ToList();
        }
    }
}
