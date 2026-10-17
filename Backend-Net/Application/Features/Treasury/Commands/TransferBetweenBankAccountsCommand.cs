using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Treasury.Dtos;
using Application.Features.Treasury.Queries;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Treasury.Commands
{
    /// <summary>
    /// Money moved between two of our own accounts - cash box deposited at the bank, bank to bank. Not a payment: no party, no
    /// party-ledger row, no effect on any invoice; the two balances move by the same amount. A balance is allowed to go
    /// negative (the statement then shows a missing entry) rather than block recording what happened.
    /// </summary>
    [AuditAction(AuditActionEnum.TransferBetweenBankAccounts)]
    public class TransferBetweenBankAccountsCommand : IRequest<ResponseDto>
    {
        public int FromBankAccountId { get; set; }
        public int ToBankAccountId { get; set; }
        public UInt64 Amount { get; set; }

        /// <summary>Now when omitted.</summary>
        public DateTime? TransferredAt { get; set; }
        public string? TransferRef { get; set; }
        public string? Description { get; set; }
    }

    public class TransferBetweenBankAccountsCommandValidator : AbstractValidator<TransferBetweenBankAccountsCommand>
    {
        public TransferBetweenBankAccountsCommandValidator()
        {
            RuleFor(x => x.FromBankAccountId).GreaterThan(0).WithMessage("حساب مبدأ را انتخاب کنید.");
            RuleFor(x => x.ToBankAccountId).GreaterThan(0).WithMessage("حساب مقصد را انتخاب کنید.");
            RuleFor(x => x.ToBankAccountId).NotEqual(x => x.FromBankAccountId).WithMessage("حساب مبدأ و مقصد نمی‌توانند یکی باشند.");
            RuleFor(x => x.Amount).GreaterThan(0UL).WithMessage("مبلغ انتقال باید از صفر بیشتر باشد.");
            RuleFor(x => x.TransferRef).MaximumLength(64).WithMessage("شماره پیگیری حداکثر ۶۴ نویسه است.");
            RuleFor(x => x.Description).MaximumLength(500).WithMessage("توضیح حداکثر ۵۰۰ نویسه است.");
        }
    }

    public class TransferBetweenBankAccountsCommandHandler : IRequestHandler<TransferBetweenBankAccountsCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public TransferBetweenBankAccountsCommandHandler(IWMSDbContext context, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(TransferBetweenBankAccountsCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var active = await _context.BankAccounts
                .CountAsync(x => (x.Id == request.FromBankAccountId || x.Id == request.ToBankAccountId) && x.IsActive, cancellationToken);
            if (active != 2)
                throw new ValidationCustomException("حساب مبدأ یا مقصد یافت نشد یا غیرفعال است.");

            var transfer = new BankAccountTransfer
            {
                FromBankAccountId = request.FromBankAccountId,
                ToBankAccountId = request.ToBankAccountId,
                Amount = request.Amount,
                TransferredAt = request.TransferredAt ?? DateTime.Now,
                TransferRef = string.IsNullOrWhiteSpace(request.TransferRef) ? null : request.TransferRef.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                RecordedAt = DateTime.Now,
                RecordedByUserId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : null,
            };
            await _context.BankAccountTransfers.AddAsync(transfer, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await BankAccountTransferReader.ReadAsync(_context, transfer.Id, cancellationToken);
            res.Message = "انتقال بین حساب‌ها ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
