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
    /// Edits an account. Its movements are untouched; changing OpeningBalance/OpeningDate re-bases every balance computed from
    /// them (the change is in the audit log). Kind can change while the account has no movement only.
    /// </summary>
    [AuditAction(AuditActionEnum.UpdateBankAccount)]
    public class UpdateBankAccountCommand : BankAccountInput, IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class UpdateBankAccountCommandValidator : AbstractValidator<UpdateBankAccountCommand>
    {
        public UpdateBankAccountCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("حساب نامعتبر است.");
            Include(new BankAccountInputValidator());
        }
    }

    public class UpdateBankAccountCommandHandler : IRequestHandler<UpdateBankAccountCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateBankAccountCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateBankAccountCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var account = await _context.BankAccounts.FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("صندوق/حساب بانکی مورد نظر یافت نشد.");

            await BankAccountTitles.EnsureUniqueAsync(_context, request.Title, account.Id, cancellationToken);

            if (request.Kind != account.Kind
                && (await _context.PaymentDetails.AnyAsync(x => x.BankAccountId == account.Id, cancellationToken)
                    || await _context.BankAccountTransfers.AnyAsync(x => x.FromBankAccountId == account.Id || x.ToBankAccountId == account.Id, cancellationToken)))
                throw new ValidationCustomException("نوع حسابی که گردش دارد عوض نمی‌شود؛ حساب تازه‌ای بسازید.");

            request.ApplyTo(account);
            account.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await BankAccountLedger.ReadAsync(_context, account.Id, cancellationToken);
            res.Message = "صندوق/حساب بانکی ویرایش شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
