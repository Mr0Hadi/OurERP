using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Treasury.Dtos;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Treasury.Queries
{
    /// <summary>The one projection of a transfer; what both transfer commands answer with.</summary>
    public static class BankAccountTransferReader
    {
        public static async Task<BankAccountTransferDto> ReadAsync(IWMSDbContext context, int id, CancellationToken cancellationToken) =>
            await context.BankAccountTransfers.AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new BankAccountTransferDto
                {
                    Id = x.Id,
                    FromBankAccountId = x.FromBankAccountId,
                    FromBankAccountTitle = x.FromBankAccount.Title,
                    ToBankAccountId = x.ToBankAccountId,
                    ToBankAccountTitle = x.ToBankAccount.Title,
                    Amount = x.Amount,
                    TransferredAt = x.TransferredAt,
                    TransferRef = x.TransferRef,
                    Description = x.Description,
                    VoidedAt = x.VoidedAt,
                    RecordedAt = x.RecordedAt,
                    RecordedByUserId = x.RecordedByUserId,
                })
                .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundCustomException("انتقال مورد نظر یافت نشد.");
    }
}
