using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Customer.Commands
{
    public class UpdateCustomerCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string PostalCode { get; set; }
        public string? RefferalCode { get; set; }
        public UInt64? CreditLimit { get; set; }
        public string? EconomicCode { get; set; }
        public string? NationalId { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }
        public string? Description { get; set; }
        public UInt64? Balance { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }

        /// <summary>
        /// The ObjectKey returned by POST api/File/UploadImage (folder=CUSTOMERS), or the ImageKey
        /// read off the detail response to keep the existing image. Send null to clear it.
        /// </summary>
        public string? ImageUrl { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
    }

    public class UpdateCustomerCommandValidator : AbstractValidator<UpdateCustomerCommand>
    {
        public UpdateCustomerCommandValidator()
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

    public class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, ResponseDto>
    {
        private readonly ICustomerRepository _customerRepository;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateCustomerCommandHandler(IUnitOfWork unitOfWork, ICustomerRepository customerRepository, IObjectStorageService objectStorageService)
        {
            _unitOfWork = unitOfWork;
            _customerRepository = customerRepository;
            _objectStorageService = objectStorageService;
        }

        public async Task<ResponseDto> Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var customer = await _customerRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("مشتری با اطلاعات مورد نظر یافت نشد.");

            customer.FirstName = request.FirstName;
            customer.LastName = request.LastName;
            customer.PhoneNumber = request.PhoneNumber;
            customer.Address = request.Address;
            customer.Balance = request.Balance;
            customer.PostalCode = request.PostalCode;
            customer.BalanceType = request.BalanceType;
            customer.CreditLimit = request.CreditLimit;
            customer.RefferalCode = request.RefferalCode;
            customer.EconomicCode = request.EconomicCode;
            customer.NationalId = request.NationalId;
            customer.RegistrationNumber = request.RegistrationNumber;
            customer.Province = request.Province;
            customer.City = request.City;
            // The column stores the bucket object key, so a signed URL echoed back by the frontend
            // is stripped down rather than persisted verbatim.
            customer.ImageUrl = _objectStorageService.NormalizeKey(request.ImageUrl);
            customer.Longitude = request.Longitude;
            customer.Latitude = request.Latitude;
            customer.Description = request.Description;
            customer.UpdatedAt = DateTime.Now;

            _customerRepository.Update(customer);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "اطلاعات مشتری با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
