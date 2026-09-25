using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Sets or clears the payment due date, in any status: a deadline agreed with the customer can move after the
    /// invoice is issued without the invoice itself changing.
    /// </summary>
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
        private readonly IUnitOfWork _unitOfWork;

        public UpdateSalePaymentDateCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateSalePaymentDateCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (request.PaymentDate.HasValue && sale.InvoiceDate.HasValue && request.PaymentDate.Value < sale.InvoiceDate.Value)
                throw new ValidationCustomException("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");

            sale.PaymentDate = request.PaymentDate;
            sale.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, sale.Id, cancellationToken);
            res.Message = "مهلت پرداخت فروش با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
