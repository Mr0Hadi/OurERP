using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Soft-deletes a sale that is still a PROFORMA. An issued invoice is cancelled (ChangeSaleStatus), never deleted.
    /// A proforma has no payments by definition (the first one issues the invoice), but it may carry an installment plan
    /// awaiting its down payment - that plan is deleted first, through its own command.
    /// </summary>
    public class DeleteSaleCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteSaleCommandHandler : IRequestHandler<DeleteSaleCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteSaleCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.Status != SalesStatusEnum.PROFORMA)
                throw new ValidationCustomException("فقط پیش‌فاکتور حذف می‌شود؛ فروش صادرشده را لغو کنید.");

            var hasPlan = await _context.SaleInstallmentPlans.AnyAsync(x => x.SaleId == sale.Id && x.IsActive, cancellationToken);
            if (hasPlan)
                throw new ValidationCustomException("این پیش‌فاکتور قرارداد اقساطی دارد؛ ابتدا قرارداد را حذف کنید.");

            sale.IsActive = false;
            sale.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { sale.Id };
            res.Message = "فروش با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
