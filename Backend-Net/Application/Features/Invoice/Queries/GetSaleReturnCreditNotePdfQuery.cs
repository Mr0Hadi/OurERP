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
    /// A credit note only ever covers the money-settled decisions on a return - REFUND (paid back)
    /// and STORE_CREDIT (owed as credit). REPLACEMENT settles in goods, not money, so it has no
    /// place on this document; NO_COMPENSATION lines simply never reach this handler because there
    /// is nothing owed. One printed line per decision, not per product, so the paper trail matches
    /// the individual AddSaleReturnDecisionCommand calls it was built from.
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

            var settledDecisions = saleReturn.Claims
                .SelectMany(claim => claim.InspectionItems.Select(item => (claim, item)))
                .SelectMany(x => x.item.Decisions
                    .Where(d => d.DecisionType == SaleReturnDecisionTypeEnum.REFUND || d.DecisionType == SaleReturnDecisionTypeEnum.STORE_CREDIT)
                    .Select(d => (x.claim, decision: d)))
                .ToList();

            if (settledDecisions.Count == 0)
                throw new ValidationCustomException("این مرجوعی هیچ تصمیم مالی‌شده‌ای (استرداد یا اعتبار فروشگاهی) ندارد.");

            var lines = settledDecisions.Select((x, index) =>
            {
                var amount = x.decision.RefundAmount ?? (ulong)x.decision.Quantity * x.claim.UnitPrice;
                return new InvoiceLineModel
                {
                    RowNumber = index + 1,
                    ProductCode = x.claim.Product?.Code ?? string.Empty,
                    ProductName = (x.claim.Product?.Name ?? string.Empty) +
                        (x.decision.DecisionType == SaleReturnDecisionTypeEnum.STORE_CREDIT ? " (اعتبار فروشگاهی)" : " (استرداد وجه)"),
                    Quantity = x.decision.Quantity,
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
