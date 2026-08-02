using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReceiving.Commands
{
    public class RemoveReceiptDiscrepancyCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class RemoveReceiptDiscrepancyCommandValidator : AbstractValidator<RemoveReceiptDiscrepancyCommand>
    {
        public RemoveReceiptDiscrepancyCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("شناسه مغایرت معتبر نیست.");
        }
    }

    public class RemoveReceiptDiscrepancyCommandHandler : IRequestHandler<RemoveReceiptDiscrepancyCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveReceiptDiscrepancyCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemoveReceiptDiscrepancyCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var discrepancy = await _context.Set<ReceiptDiscrepancy>()
                .Include(x => x.Decisions)
                .FirstOrDefaultAsync(x => x.Id == request.Id) ?? throw new NotFoundCustomException("مغایرت مورد نظر یافت نشد.");

            if (discrepancy.Decisions.Any())
                throw new ValidationCustomException("این مغایرت دارای تصمیم ثبت‌شده است و قابل حذف نیست.");

            var receipt = await _context.PurchaseReceipts
                .Include(x => x.Purchase)
                .FirstOrDefaultAsync(x => x.Id == discrepancy.PurchaseReceiptId) ?? throw new NotFoundCustomException("رسید خرید مورد نظر یافت نشد.");

            _context.Set<ReceiptDiscrepancy>().Remove(discrepancy);

            var remaining = await _context.Set<ReceiptDiscrepancy>()
                .Where(x => x.PurchaseReceiptId == receipt.Id && x.Id != discrepancy.Id)
                .ToListAsync();

            PurchaseReceivingStatusUpdater.UpdateStatuses(receipt, receipt.Purchase, remaining);

            await _unitOfWork.SaveChangesAsync();

            res.Message = "مغایرت با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
