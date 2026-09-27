using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Dtos;
using Application.Common.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Invoice.Queries
{
    /// <summary>
    /// The sheet that travels with goods going back to a supplier, and that purchasing keeps to follow up
    /// the money. Unlike the sale-side credit note it is printed for every purchase return, whatever its
    /// decisions: the claims are the goods, so the claims are the lines (one per claim, priced at the
    /// claim's unit price). What was decided for them does not fit the shared invoice layout's line
    /// table, so it goes into the notes as one summary per effect kind.
    ///
    /// "پرداخت شده" is money the supplier has already paid back (applied MONEY_IN) and "مانده" is money
    /// still expected from them (pending MONEY_IN) - not the invoice meaning of those two boxes, since
    /// a return has no payable of its own.
    /// </summary>
    public class GetPurchaseReturnPdfQuery : IRequest<FileResponseDto>
    {
        public int PurchaseReturnId { get; set; }
    }

    public class GetPurchaseReturnPdfQueryHandler : IRequestHandler<GetPurchaseReturnPdfQuery, FileResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPdfDocumentService _pdfDocumentService;
        private readonly IConfiguration _configuration;

        public GetPurchaseReturnPdfQueryHandler(IWMSDbContext context, IPdfDocumentService pdfDocumentService, IConfiguration configuration)
        {
            _context = context;
            _pdfDocumentService = pdfDocumentService;
            _configuration = configuration;
        }

        public async Task<FileResponseDto> Handle(GetPurchaseReturnPdfQuery request, CancellationToken cancellationToken)
        {
            var purchaseReturn = await _context.PurchaseReturns
                .AsNoTracking()
                .WhereNotDeleted()
                .Include(x => x.Purchase!).ThenInclude(x => x.Supplier)
                .WithReturnGraph()
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseReturnId, cancellationToken)
                    ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            var purchase = purchaseReturn.Purchase!;
            var supplier = purchase.Supplier;

            var lines = purchaseReturn.Claims
                .OrderBy(c => c.Id)
                .Select((claim, index) => new InvoiceLineModel
                {
                    RowNumber = index + 1,
                    ProductCode = claim.Product?.Code ?? string.Empty,
                    ProductName = $"{claim.Product?.Name} ({claim.Problem.GetDescription()})",
                    Quantity = claim.Quantity,
                    UnitPrice = claim.UnitPrice,
                    DiscountAmount = 0,
                    TaxAmount = 0,
                    LineTotal = checked((ulong)claim.Quantity * claim.UnitPrice),
                })
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

            var model = new InvoiceDocumentModel
            {
                Title = "برگه مرجوعی به تامین‌کننده",
                DocumentNumber = purchaseReturn.ReturnNumber,
                DocumentDate = purchaseReturn.ReturnDate,
                StatusText = purchaseReturn.Status.GetDescription(),
                Description = BuildSummary(purchase.InvoiceNumber, effects, purchaseReturn.Claims.SelectMany(c => c.Resolutions).Any(r => r.IsWriteOff), _configuration),
                Company = _configuration.GetSection("Company").Get<CompanyInfo>() ?? new CompanyInfo(),
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

            var bytes = await _pdfDocumentService.RenderInvoiceAsync(model, cancellationToken);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"purchase-return-{purchaseReturn.ReturnNumber}.pdf",
                ContentType = "application/pdf",
            };
        }

        /// <summary>One sentence per effect kind that occurs, "done of total" for goods and "received / expected" for money.</summary>
        private static string BuildSummary(string invoiceNumber, List<Domain.Entities.PurchaseReturnEffect> effects, bool hasWriteOff, IConfiguration configuration)
        {
            var currency = configuration.GetSection("Company").Get<CompanyInfo>()?.Currency ?? "ریال";
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

            return string.Join(" | ", parts).ToPersianDigits();
        }
    }
}
