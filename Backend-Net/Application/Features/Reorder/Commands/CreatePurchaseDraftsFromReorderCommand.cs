using Application.Common.Audit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Reorder.Commands
{
    /// <summary>
    /// Turns chosen reorder suggestions into draft purchases (PROFORMA), one per supplier, by sending CreatePurchaseCommand for each
    /// - its validators, line maths and tax included - inside one transaction (all or nothing). The buyer can still edit every
    /// draft before the supplier's invoice comes. Answers with the new purchases' ids per supplier.
    /// </summary>
    [AuditAction(AuditActionEnum.CreatePurchaseDraftsFromReorder)]
    public class CreatePurchaseDraftsFromReorderCommand : IRequest<ResponseDto>
    {
        public List<ReorderDraftLineInput> Lines { get; set; } = new();
    }

    public class ReorderDraftLineInput
    {
        public int ProductId { get; set; }
        public int SupplierId { get; set; }
        public int Quantity { get; set; }

        /// <summary>The suggestion's lastUnitPrice, or what the buyer negotiated.</summary>
        public UInt64 UnitPrice { get; set; }
    }

    public class CreatePurchaseDraftsFromReorderCommandValidator : AbstractValidator<CreatePurchaseDraftsFromReorderCommand>
    {
        public CreatePurchaseDraftsFromReorderCommandValidator()
        {
            RuleFor(x => x.Lines).NotEmpty().WithMessage("هیچ کالایی انتخاب نشده است.");
            RuleFor(x => x.Lines).Must(l => l.Select(i => (i.SupplierId, i.ProductId)).Distinct().Count() == l.Count)
                .WithMessage("هر کالا برای هر تامین‌کننده فقط یک‌بار می‌آید.");
            RuleForEach(x => x.Lines).ChildRules(l =>
            {
                l.RuleFor(x => x.SupplierId).GreaterThan(0).WithMessage("برای هر کالا تامین‌کننده را انتخاب کنید.");
                l.RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("کالا نامعتبر است.");
                l.RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("تعداد سفارش باید از صفر بیشتر باشد.");
            });
        }
    }

    public class CreatePurchaseDraftsFromReorderCommandHandler : IRequestHandler<CreatePurchaseDraftsFromReorderCommand, ResponseDto>
    {
        private readonly IMediator _mediator;
        private readonly IUnitOfWork _unitOfWork;

        public CreatePurchaseDraftsFromReorderCommandHandler(IMediator mediator, IUnitOfWork unitOfWork)
        {
            _mediator = mediator;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreatePurchaseDraftsFromReorderCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var created = await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                var result = new List<object>();
                foreach (var group in request.Lines.GroupBy(l => l.SupplierId))
                {
                    var response = await _mediator.Send(new CreatePurchaseCommand
                    {
                        SupplierId = group.Key,
                        Status = PurchaseStatusEnum.PROFORMA,
                        PaymentType = PaymentTypeEnum.CASH,
                        InvoiceNumber = string.Empty,
                        Description = "پیش‌فاکتور از پیشنهاد خرید",
                        ProductItemList = group.Select(l => new CreatePurchaseItemDto { ProductId = l.ProductId, Quantity = l.Quantity, UnitPrice = l.UnitPrice }).ToList(),
                    }, ct);
                    var id = response.Data?.GetType().GetProperty("Id")?.GetValue(response.Data);
                    result.Add(new { SupplierId = group.Key, PurchaseId = id });
                }
                return result;
            }, cancellationToken);

            res.Data = created;
            res.Message = $"{created.Count} پیش‌فاکتور خرید ساخته شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
