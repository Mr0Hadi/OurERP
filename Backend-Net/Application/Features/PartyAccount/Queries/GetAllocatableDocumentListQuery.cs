using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Features.PartyAccount.Dtos;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PartyAccount.Queries
{
    /// <summary>
    /// The invoices of one customer or supplier that an on-account payment can be applied to right now: active, not
    /// cancelled, still owing money, and taking ordinary payments (PaymentAllocator's rules). Oldest due date first - the
    /// usual order to settle them in. Not paged: one party's open invoices.
    /// </summary>
    public class GetAllocatableDocumentListQuery : IRequest<ResponseDto>
    {
        /// <summary>Exactly one of CustomerId / SupplierId.</summary>
        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }
    }

    public class GetAllocatableDocumentListQueryValidator : AbstractValidator<GetAllocatableDocumentListQuery>
    {
        public GetAllocatableDocumentListQueryValidator()
        {
            RuleFor(x => x).Must(x => x.CustomerId.HasValue != x.SupplierId.HasValue)
                .WithMessage("دقیقاً یکی از مشتری یا تامین‌کننده را مشخص کنید.");
        }
    }

    public class GetAllocatableDocumentListQueryHandler : IRequestHandler<GetAllocatableDocumentListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetAllocatableDocumentListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetAllocatableDocumentListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var now = DateTime.Now;
            List<AllocatableDocumentDto> documents;

            if (request.CustomerId.HasValue)
            {
                documents = await _context.Sales.AsNoTracking()
                    .Where(x => x.CustomerId == request.CustomerId && x.IsActive && x.Status != SalesStatusEnum.CANCELLED
                        && x.TotalAmount > x.PaidAmount)
                    // An installment sale's money goes through its plan unless the plan was cancelled (SalePaymentRules).
                    .Where(x => x.PaymentType != PaymentTypeEnum.INSTALLMENT
                        || (_context.SaleInstallmentPlans.Any(p => p.SaleId == x.Id && p.Status == SaleInstallmentPlanStatusEnum.CANCELLED)
                            && !_context.SaleInstallmentPlans.Any(p => p.SaleId == x.Id && p.IsActive && p.Status != SaleInstallmentPlanStatusEnum.CANCELLED)))
                    // A proforma only once it is ready for payment (SaleProformaPipeline.EnsureReadyForPayment).
                    .Where(x => x.Status != SalesStatusEnum.PROFORMA
                        || (x.ProformaStage == SaleProformaStageEnum.WAREHOUSE_CHECKED && (x.ReservationExpiresAt == null || x.ReservationExpiresAt > now)))
                    .Select(x => new AllocatableDocumentDto
                    {
                        SaleId = x.Id,
                        InvoiceNumber = x.InvoiceNumber,
                        InvoiceDate = x.InvoiceDate,
                        PaymentDate = x.PaymentDate,
                        IsProforma = x.Status == SalesStatusEnum.PROFORMA,
                        PayableAmount = x.TotalAmount,
                        PaidAmount = x.PaidAmount,
                    })
                    .ToListAsync(cancellationToken);
            }
            else
            {
                var purchases = await _context.Purchases.AsNoTracking()
                    .Include(x => x.Items)
                    .Where(x => x.SupplierId == request.SupplierId && x.IsActive && x.Status != PurchaseStatusEnum.CANCELLED
                        && x.TotalAmount > x.PaidAmount)
                    .ToListAsync(cancellationToken);

                documents = purchases.Select(x => new AllocatableDocumentDto
                {
                    PurchaseId = x.Id,
                    InvoiceNumber = x.InvoiceNumber,
                    InvoiceDate = x.InvoiceDate,
                    PaymentDate = x.PaymentDate,
                    IsProforma = x.Status == PurchaseStatusEnum.PROFORMA,
                    PayableAmount = PaymentAllocator.PayableAmount(x),
                    PaidAmount = x.PaidAmount,
                }).ToList();
            }

            foreach (var document in documents)
                document.RemainingAmount = document.PayableAmount > document.PaidAmount ? document.PayableAmount - document.PaidAmount : 0;

            res.Data = documents
                .Where(x => x.RemainingAmount > 0)
                .OrderBy(x => x.PaymentDate ?? x.InvoiceDate ?? DateTime.MaxValue)
                .ThenBy(x => x.SaleId ?? x.PurchaseId)
                .ToList();
            res.Message = "فاکتورهای باز ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
