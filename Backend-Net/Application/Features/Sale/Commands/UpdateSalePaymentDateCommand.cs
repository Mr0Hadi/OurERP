using Application.Common.Contracts.UserContextService;
using Application.Common.Sales;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Common.Audit;
using Domain.Enums;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Sets or clears the payment due date, in any status: a deadline agreed with the customer can move after the
    /// invoice is issued without the invoice itself changing. On a PROFORMA it is part of the terms the customer approves,
    /// so a change sends an approved proforma back to DRAFT, as UpdateSale does.
    /// </summary>
    [AuditAction(AuditActionEnum.UpdateSalePaymentDate)]
    public class UpdateSalePaymentDateCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public DateTime? PaymentDate { get; set; }
    }

    public class UpdateSalePaymentDateCommandValidator : AbstractValidator<UpdateSalePaymentDateCommand>
    {
        public UpdateSalePaymentDateCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("فروش نامعتبر است.");
        }
    }

    public class UpdateSalePaymentDateCommandHandler : IRequestHandler<UpdateSalePaymentDateCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IUserContextService _userContextService;

        public UpdateSalePaymentDateCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork, ISaleReturnCalculationService saleReturnCalculationService, IUserContextService userContextService)
        {
            _userContextService = userContextService;
            _context = context;
            _objectStorageService = objectStorageService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateSalePaymentDateCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (request.PaymentDate.HasValue && sale.InvoiceDate.HasValue && request.PaymentDate.Value < sale.InvoiceDate.Value)
                throw new ValidationCustomException("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");

            if (sale.Status == SalesStatusEnum.PROFORMA && sale.PaymentDate != request.PaymentDate)
            {
                var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
                await SaleProformaPipeline.ResetByEditAsync(_context, sale, userId, "ویرایش: مهلت پرداخت", cancellationToken);
            }

            sale.PaymentDate = request.PaymentDate;
            sale.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, _saleReturnCalculationService, sale.Id, cancellationToken);
            res.Message = "مهلت پرداخت فروش با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
