using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Payments;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Application.Common.Audit;

namespace Application.Features.PosTerminal.Commands
{
    [AuditAction(AuditActionEnum.UpdatePosTerminal)]
    public class UpdatePosTerminalCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public PosVendorEnum Vendor { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
        public string? ComPort { get; set; }
        public string? TerminalId { get; set; }
        public string? MerchantId { get; set; }
        public string? BankCode { get; set; }

        /// <summary>The bank account this device settles into; card payments taken on it land there unless they name another.</summary>
        public int? BankAccountId { get; set; }
    }

    public class UpdatePosTerminalCommandValidator : AbstractValidator<UpdatePosTerminalCommand>
    {
        public UpdatePosTerminalCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام دستگاه"));
            RuleFor(x => x.Vendor).IsInEnum().WithMessage(Validation.RequiredMessage("سازنده دستگاه"));
            RuleFor(x => x.Host).NotEmpty().WithMessage(Validation.RequiredMessage("آدرس دستگاه"));
            RuleFor(x => x.Port).GreaterThan(0).WithMessage(Validation.RequiredMessage("پورت دستگاه"));
            RuleFor(x => x.BankCode).MaximumLength(32).WithMessage("کد بانک بیش از حد طولانی است.");
        }
    }

    public class UpdatePosTerminalCommandHandler : IRequestHandler<UpdatePosTerminalCommand, ResponseDto>
    {
        private readonly IPosTerminalRepository _posTerminalRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IWMSDbContext _context;

        public UpdatePosTerminalCommandHandler(IPosTerminalRepository posTerminalRepository, IUnitOfWork unitOfWork, IWMSDbContext context)
        {
            _posTerminalRepository = posTerminalRepository;
            _unitOfWork = unitOfWork;
            _context = context;
        }

        public async Task<ResponseDto> Handle(UpdatePosTerminalCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            await BankAccountChecks.EnsureActiveAsync(_context, request.BankAccountId, cancellationToken);

            var posTerminal = await _posTerminalRepository.GetByIdAsync(request.Id, cancellationToken)
                ?? throw new NotFoundCustomException("دستگاه کارتخوان مورد نظر یافت نشد.");

            posTerminal.Name = request.Name;
            posTerminal.Vendor = request.Vendor;
            posTerminal.Host = request.Host;
            posTerminal.Port = request.Port;
            posTerminal.ComPort = request.ComPort;
            posTerminal.TerminalId = request.TerminalId;
            posTerminal.MerchantId = request.MerchantId;
            posTerminal.BankCode = request.BankCode;
            posTerminal.BankAccountId = request.BankAccountId;

            _posTerminalRepository.Update(posTerminal);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "اطلاعات دستگاه کارتخوان با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
