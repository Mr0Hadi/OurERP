using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.PosTerminal.Commands
{
    public class CreatePosTerminalCommand : IRequest<ResponseDto>
    {
        public string Name { get; set; }
        public PosVendorEnum Vendor { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
        public string? ComPort { get; set; }
        public string? TerminalId { get; set; }
        public string? MerchantId { get; set; }
    }

    public class CreatePosTerminalCommandValidator : AbstractValidator<CreatePosTerminalCommand>
    {
        public CreatePosTerminalCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام دستگاه"));
            RuleFor(x => x.Vendor).IsInEnum().WithMessage(Validation.RequiredMessage("سازنده دستگاه"));
            RuleFor(x => x.Host).NotEmpty().WithMessage(Validation.RequiredMessage("آدرس دستگاه"));
            RuleFor(x => x.Port).GreaterThan(0).WithMessage(Validation.RequiredMessage("پورت دستگاه"));
        }
    }

    public class CreatePosTerminalCommandHandler : IRequestHandler<CreatePosTerminalCommand, ResponseDto>
    {
        private readonly IPosTerminalRepository _posTerminalRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreatePosTerminalCommandHandler(IPosTerminalRepository posTerminalRepository, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _posTerminalRepository = posTerminalRepository;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreatePosTerminalCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var posTerminal = _mapper.Map<Domain.Entities.PosTerminal>(request);
            await _posTerminalRepository.AddAsync(posTerminal, cancellationToken);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "دستگاه کارتخوان جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
