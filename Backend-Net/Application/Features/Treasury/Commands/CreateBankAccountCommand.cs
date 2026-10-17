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
    /// <summary>A new cash box or bank account. Answers with the account (balance = its opening balance).</summary>
    [AuditAction(AuditActionEnum.CreateBankAccount)]
    public class CreateBankAccountCommand : BankAccountInput, IRequest<ResponseDto>
    {
    }

    public class CreateBankAccountCommandValidator : AbstractValidator<CreateBankAccountCommand>
    {
        public CreateBankAccountCommandValidator()
        {
            Include(new BankAccountInputValidator());
        }
    }

    public class CreateBankAccountCommandHandler : IRequestHandler<CreateBankAccountCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CreateBankAccountCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateBankAccountCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            await BankAccountTitles.EnsureUniqueAsync(_context, request.Title, null, cancellationToken);

            var account = new BankAccount { IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now };
            request.ApplyTo(account);
            await _context.BankAccounts.AddAsync(account, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await BankAccountLedger.ReadAsync(_context, account.Id, cancellationToken);
            res.Message = "صندوق/حساب بانکی ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
