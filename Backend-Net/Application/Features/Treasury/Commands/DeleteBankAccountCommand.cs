using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Treasury.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Treasury.Commands
{
    /// <summary>
    /// Deactivates an account (soft delete): its history and statement stay, it just can't be chosen for new money. Refused
    /// while a card reader still settles into it - point the device at another account first.
    /// </summary>
    [AuditAction(AuditActionEnum.DeleteBankAccount)]
    public class DeleteBankAccountCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteBankAccountCommandHandler : IRequestHandler<DeleteBankAccountCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteBankAccountCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteBankAccountCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var account = await _context.BankAccounts.FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("صندوق/حساب بانکی مورد نظر یافت نشد.");

            var device = await _context.PosTerminals.Where(x => x.BankAccountId == account.Id && x.IsActive).Select(x => x.Name).FirstOrDefaultAsync(cancellationToken);
            if (device != null)
                throw new ValidationCustomException($"کارتخوان «{device}» به این حساب واریز می‌کند؛ ابتدا حساب آن را عوض کنید.");

            account.IsActive = false;
            account.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { account.Id };
            res.Message = "صندوق/حساب بانکی غیرفعال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
