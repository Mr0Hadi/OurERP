using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Takes back a payment row recorded by mistake. The row stays, marked VoidedAt, and leaves PaidAmount. An issued
    /// invoice stays issued even if its paid amount falls back to 0 - leaving PROFORMA is one-way.
    /// </summary>
    public class VoidSalePaymentCommand : IRequest<ResponseDto>
    {
        public int PaymentId { get; set; }
    }

    public class VoidSalePaymentCommandValidator : AbstractValidator<VoidSalePaymentCommand>
    {
        public VoidSalePaymentCommandValidator()
        {
            RuleFor(x => x.PaymentId).GreaterThan(0).WithMessage("پرداخت نامعتبر است.");
        }
    }

    public class VoidSalePaymentCommandHandler : IRequestHandler<VoidSalePaymentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public VoidSalePaymentCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(VoidSalePaymentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.PaymentDetails)
                .FirstOrDefaultAsync(x => x.IsActive && x.PaymentDetails.Any(p => p.Id == request.PaymentId), cancellationToken)
                ?? throw new NotFoundCustomException("پرداخت مورد نظر یافت نشد.");

            var payment = sale.PaymentDetails.First(p => p.Id == request.PaymentId);
            PaymentWriter.Void(payment);
            await PartyLedger.PaymentVoidedAsync(_context, payment, payment.VoidedAt!.Value, cancellationToken);
            sale.PaidAmount = DocumentPayments.NetPaid(sale.PaymentDetails, DocumentPayments.SaleDirection);
            sale.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, sale.Id, cancellationToken);
            res.Message = "پرداخت فروش ابطال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
