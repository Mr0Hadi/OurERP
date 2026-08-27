using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Documents;
using Application.Common.Dtos;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Invoice.Queries
{
    /// <summary>
    /// A credit note only ever covers a return's MONEY_OUT effects (money owed back to the
    /// customer - a refund or store credit, regardless of payment Method). GOODS_IN/GOODS_OUT
    /// settle in goods, not money, so they have no place on this document; MONEY_IN (the customer
    /// paying us, e.g. an upcharge on a replacement) is the opposite direction and also excluded.
    /// One printed line per effect, not per product, so the paper trail matches the individual
    /// AddClaimResolutionCommand calls it was built from.
    /// </summary>
    public class GetSaleReturnCreditNotePdfQuery : IRequest<FileResponseDto>
    {
        public int SaleReturnId { get; set; }
    }

    public class GetSaleReturnCreditNotePdfQueryHandler : IRequestHandler<GetSaleReturnCreditNotePdfQuery, FileResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly IPdfDocumentService _pdfDocumentService;
        private readonly IConfiguration _configuration;

        public GetSaleReturnCreditNotePdfQueryHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, IPdfDocumentService pdfDocumentService, IConfiguration configuration)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _pdfDocumentService = pdfDocumentService;
            _configuration = configuration;
        }

        public async Task<FileResponseDto> Handle(GetSaleReturnCreditNotePdfQuery request, CancellationToken cancellationToken)
        {
            var saleReturn = await _saleReturnQueryService.WithReturnGraph(_context.SaleReturns)
                .Include(x => x.Sale!)
                    .ThenInclude(x => x.Customer)
                .FirstOrDefaultAsync(x => x.Id == request.SaleReturnId, cancellationToken)
                    ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            var sale = saleReturn.Sale!;
            var customer = sale.Customer;

            var settledEffects = saleReturn.Claims
                .SelectMany(claim => claim.Resolutions.SelectMany(r => r.Effects.Select(e => (claim, effect: e))))
                .Where(x => x.effect.Kind == ReturnEffectKindEnum.MONEY_OUT)
                .ToList();

            if (settledEffects.Count == 0)
                throw new ValidationCustomException("این مرجوعی هیچ اثر مالی (استرداد یا اعتبار فروشگاهی) ندارد.");

            var lines = settledEffects.Select((x, index) =>
            {
                var amount = x.effect.Amount ?? 0;
                var methodLabel = x.effect.Method == ReturnPaymentMethodEnum.STORE_CREDIT ? " (اعتبار فروشگاهی)" : " (استرداد وجه)";
                return new InvoiceLineModel
                {
                    RowNumber = index + 1,
                    ProductCode = x.claim.Product?.Code ?? string.Empty,
                    ProductName = (x.claim.Product?.Name ?? string.Empty) + methodLabel,
                    Quantity = x.claim.Quantity,
                    UnitPrice = x.claim.UnitPrice,
                    DiscountAmount = 0,
                    TaxAmount = 0,
                    LineTotal = amount,
                };
            }).ToList();

            var grandTotal = lines.Aggregate(0UL, (sum, l) => sum + l.LineTotal);

            var model = new InvoiceDocumentModel
            {
                Title = "برگه اعتباری مرجوعی",
                DocumentNumber = saleReturn.ReturnNumber,
                DocumentDate = saleReturn.UpdatedAt,
                StatusText = saleReturn.Status.ToString(),
                Description = $"مرجوعی مربوط به فاکتور فروش شماره {sale.InvoiceNumber}",
                Company = _configuration.GetSection("Company").Get<CompanyInfo>() ?? new CompanyInfo(),
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

            var bytes = await _pdfDocumentService.RenderInvoiceAsync(model, cancellationToken);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"credit-note-{saleReturn.ReturnNumber}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
