using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// The manual status changes a sale allows: DELIVERED once everything ordered has shipped (SHIPPED), and CANCELLED
    /// while nothing has shipped and no installment plan is active. Every other status is set by the system - PROCESSING by
    /// the first payment, PARTIALLY_DELIVERED/SHIPPED by shipping, RETURNED by returns. CANCELLED is final.
    /// Payments stay on a cancelled sale; money given back to the customer is recorded with AddSalePayment (OUT).
    /// </summary>
    public class ChangeSaleStatusCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public SalesStatusEnum Status { get; set; }
    }

    public class ChangeSaleStatusCommandValidator : AbstractValidator<ChangeSaleStatusCommand>
    {
        public ChangeSaleStatusCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("فروش نامعتبر است.");
            RuleFor(x => x.Status)
                .Must(s => s is SalesStatusEnum.DELIVERED or SalesStatusEnum.CANCELLED)
                .WithMessage("وضعیت فروش را فقط می‌توان به تحویل‌شده یا لغوشده تغییر داد.");
        }
    }

    public class ChangeSaleStatusCommandHandler : IRequestHandler<ChangeSaleStatusCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public ChangeSaleStatusCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ChangeSaleStatusCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.Status is SalesStatusEnum.CANCELLED or SalesStatusEnum.RETURNED)
                throw new ValidationCustomException("فروش لغوشده یا مرجوع‌شده قابل تغییر وضعیت نیست.");

            if (request.Status == SalesStatusEnum.DELIVERED)
            {
                if (sale.Status != SalesStatusEnum.SHIPPED)
                    throw new ValidationCustomException("فقط فروشی که همه‌ی کالایش ارسال شده تحویل‌شده ثبت می‌شود.");
            }
            else
            {
                if (sale.Items.Any(i => i.ShippedQuantity > 0))
                    throw new ValidationCustomException("کالای این فروش ارسال شده و قابل لغو نیست؛ از مسیر مرجوعی اقدام کنید.");

                var hasActivePlan = await _context.SaleInstallmentPlans.AnyAsync(
                    x => x.SaleId == sale.Id && x.IsActive && x.Status == SaleInstallmentPlanStatusEnum.ACTIVE, cancellationToken);
                if (hasActivePlan)
                    throw new ValidationCustomException("این فروش قرارداد اقساطی فعال دارد؛ ابتدا قرارداد را لغو کنید.");
            }

            // Cancelling an issued invoice takes it (and any installment charge) off the customer's account; the payments
            // stay, so money received and not yet refunded shows as owed back to the customer.
            if (request.Status == SalesStatusEnum.CANCELLED)
                await PartyLedger.SaleCancelledAsync(_context, sale, DateTime.Now, cancellationToken);

            sale.Status = request.Status;
            sale.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, sale.Id, cancellationToken);
            res.Message = "وضعیت فروش با موفقیت تغییر کرد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
