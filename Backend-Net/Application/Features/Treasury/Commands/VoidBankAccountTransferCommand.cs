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
    /// <summary>Voids a transfer recorded by mistake (VoidedAt); both balances go back. Record it again if it was only wrong.</summary>
    [AuditAction(AuditActionEnum.VoidBankAccountTransfer)]
    public class VoidBankAccountTransferCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class VoidBankAccountTransferCommandHandler : IRequestHandler<VoidBankAccountTransferCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public VoidBankAccountTransferCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(VoidBankAccountTransferCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var transfer = await _context.BankAccountTransfers.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
                ?? throw new NotFoundCustomException("انتقال مورد نظر یافت نشد.");
            if (transfer.VoidedAt != null)
                throw new ValidationCustomException("این انتقال قبلاً ابطال شده است.");

            transfer.VoidedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await BankAccountTransferReader.ReadAsync(_context, transfer.Id, cancellationToken);
            res.Message = "انتقال ابطال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
