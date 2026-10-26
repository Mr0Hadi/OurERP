using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Common.Sales;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Commands;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// In-person sale, last step. An in-person sale runs the same pipeline as any other (docs/proforma-approval-pipeline.md):
    /// CreateSale, ApproveSaleProforma, CheckSaleWarehouse - back to back at the counter - so the units are scanned and reserved
    /// before the customer pays. This command then does the rest atomically: the payment (the full amount, or for an installment
    /// sale the plan with its down payment - either issues the invoice), shipping exactly the reserved units, and DELIVERED.
    /// A failure at any step leaves the proforma as it was.
    /// </summary>
    [AuditAction(AuditActionEnum.CompleteInPersonSale)]
    public class CompleteInPersonSaleCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }

        /// <summary>Money taken at the counter; must add up to the invoice total. Not sent for an installment sale.</summary>
        public List<InPersonPaymentDto> Payments { get; set; } = new();

        /// <summary>
        /// Installment sales only (<see cref="PaymentTypeEnum.INSTALLMENT"/>): the plan, with a down payment taken here. Its
        /// <c>SaleId</c> is ignored and set from <see cref="SaleId"/>.
        /// </summary>
        public CreateSaleInstallmentPlanCommand? InstallmentPlan { get; set; }

        public string? ShippingNote { get; set; }

        /// <summary>The official invoice date, not after today; omitted = the date on the proforma, else now.</summary>
        public DateTime? InvoiceDate { get; set; }
    }

    public class InPersonPaymentDto : PaymentInput
    {
    }

    public class CompleteInPersonSaleCommandValidator : AbstractValidator<CompleteInPersonSaleCommand>
    {
        public CompleteInPersonSaleCommandValidator()
        {
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage("فروش نامعتبر است.");
            RuleForEach(x => x.Payments).SetValidator(new PaymentInputValidator());
            RuleFor(x => x.InvoiceDate).Must(SaleInvoiceFinalizer.IsValidInvoiceDate).WithMessage(SaleInvoiceFinalizer.InvoiceDateMessage);
            RuleFor(x => x.InstallmentPlan!.DownPaymentAmount).GreaterThan(0UL)
                .When(x => x.InstallmentPlan != null)
                .WithMessage("در تحویل حضوری اقساطی، پیش‌پرداخت باید همان‌جا دریافت شود.");
            RuleFor(x => x.Payments).Empty()
                .When(x => x.InstallmentPlan != null)
                .WithMessage("پرداخت‌های فروش اقساطی از مسیر قرارداد اقساطی ثبت می‌شوند.");
        }
    }

    public class CompleteInPersonSaleCommandHandler : IRequestHandler<CompleteInPersonSaleCommand, ResponseDto>
    {
        private readonly IMediator _mediator;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CompleteInPersonSaleCommandHandler(IMediator mediator, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _mediator = mediator;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CompleteInPersonSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.Status != SalesStatusEnum.PROFORMA)
                throw new ValidationCustomException("این فروش از پیش‌فاکتور خارج شده است؛ تحویل حضوری فقط روی پیش‌فاکتور تأییدشده انجام می‌شود.");
            SaleProformaPipeline.EnsureReadyForPayment(sale);

            var installment = sale.PaymentType == PaymentTypeEnum.INSTALLMENT;
            if (installment && request.InstallmentPlan == null)
                throw new ValidationCustomException("برای فروش اقساطی، قرارداد اقساط باید همراه همین درخواست ثبت شود.");
            if (!installment && request.InstallmentPlan != null)
                throw new ValidationCustomException("قرارداد اقساط فقط برای فروش با روش پرداخت اقساطی فرستاده می‌شود.");
            if (!installment && request.Payments.Aggregate(0UL, (sum, p) => sum + p.Amount) != sale.TotalAmount)
                throw new ValidationCustomException("در تحویل حضوری پرداخت باید کامل و برابر جمع فاکتور باشد.");

            res.Data = await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                // The first payment (or the down payment) issues the invoice.
                if (installment)
                {
                    request.InstallmentPlan!.SaleId = sale.Id;
                    request.InstallmentPlan.InvoiceDate ??= request.InvoiceDate;
                    await _mediator.Send(request.InstallmentPlan, ct);
                }
                else
                {
                    foreach (var payment in request.Payments)
                    {
                        await _mediator.Send(new AddSalePaymentCommand
                        {
                            SaleId = sale.Id,
                            Direction = DocumentPayments.SaleDirection,
                            // Read by the first payment only - the one that issues the invoice.
                            InvoiceDate = request.InvoiceDate,
                            Type = payment.Type,
                            Amount = payment.Amount,
                            PaidAt = payment.PaidAt,
                            CheckNumber = payment.CheckNumber,
                            TransferRef = payment.TransferRef,
                            BankAccountId = payment.BankAccountId,
                            PosTerminalId = payment.PosTerminalId,
                            MaskedCardNumber = payment.MaskedCardNumber,
                            ApprovalCode = payment.ApprovalCode,
                            TraceNumber = payment.TraceNumber,
                        }, ct);
                    }
                }

                // The units were scanned and reserved at the warehouse check; shipping takes exactly those.
                await _mediator.Send(new ShipSaleCommand
                {
                    SaleId = sale.Id,
                    ShippingNote = request.ShippingNote ?? "تحویل حضوری به مشتری",
                    Items = sale.Items
                        .Where(line => line.Quantity > line.ShippedQuantity)
                        .Select(line => new ShipSaleItemDto { SaleItemId = line.Id, ShippedQuantity = line.Quantity - line.ShippedQuantity })
                        .ToList(),
                }, ct);

                var shipped = await _context.Sales
                    .Include(x => x.PaymentDetails)
                    .Include(x => x.PaymentAllocations).ThenInclude(a => a.PaymentDetail)
                    .FirstAsync(x => x.Id == sale.Id, ct);
                // The invoice was issued by the first payment, before the others existed: name the methods of all of them.
                SaleInvoiceFinalizer.ApplyPaymentType(shipped);
                shipped.Status = SalesStatusEnum.DELIVERED;
                shipped.UpdatedAt = DateTime.Now;
                await _unitOfWork.SaveChangesAsync(ct);

                return new CreatedSaleDto { Id = shipped.Id, InvoiceNumber = shipped.InvoiceNumber, Status = shipped.Status };
            }, cancellationToken);

            res.Message = "فروش حضوری با موفقیت تکمیل شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
