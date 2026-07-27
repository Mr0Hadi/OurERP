using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Customer.Commands
{
    public class CreateCustomerCommand : IRequest<ResponseDto>
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string PostalCode { get; set; }
        public string? RefferalCode { get; set; }
        public UInt64 CreditLimit { get; set; }
        public string? Description { get; set; }
        public UInt64? Balance { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }
        public string? ImageUrl { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
    }

    public class CreateCustomerCommandValidation : AbstractValidator<CreateCustomerCommand>
    {
        public CreateCustomerCommandValidation()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty()
                .WithMessage(Validation.RequiredMessage("نام"))
                .Must(Validation.IsPersianText)
                .WithMessage("نام باید تنها شامل حروف فارسی باشد.");
            RuleFor(x => x.LastName).NotEmpty()
                .WithMessage(Validation.RequiredMessage("نام خانوادگی"))
                .Must(Validation.IsPersianText)
                .WithMessage("نام خانوادگی باید تنها شامل حروف فارسی باشد.");
            RuleFor(x => x.PhoneNumber).NotEmpty()
                .WithMessage(Validation.RequiredMessage("شماره تماس"))
                .Must(Validation.IsMobileNumber)
                .WithMessage("شماره تماس وارد شده صحیح نمی باشد.");
            RuleFor(x => x.Address).NotEmpty()
                .WithMessage(Validation.RequiredMessage("آدرس"));
            RuleFor(x => x.PostalCode).NotEmpty()
                .WithMessage(Validation.RequiredMessage("کد پستی"));
        }
    }

    public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, ResponseDto>
    {
        private readonly ICustomerRepository _customerRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;
        public CreateCustomerCommandHandler(ICustomerRepository customerRepository, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _customerRepository = customerRepository;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }
        public async Task<ResponseDto> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var newCustomer = _mapper.Map<Domain.Entities.Customer>(request);

            await _customerRepository.AddAsync(newCustomer);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "مشتری جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
