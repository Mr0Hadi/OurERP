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

namespace Application.Features.Supplier.Commands
{
    public class UpdateSupplierCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string CompanyName { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string PostalCode { get; set; }
        public string? EconomicCode { get; set; }
        public string? NationalId { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }

        /// <summary>
        /// The ObjectKey returned by POST api/File/UploadImage (folder=SUPPLIERS), or the ImageKey
        /// read off the detail response to keep the existing image. Send null to clear it.
        /// </summary>
        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public UInt64? Balance { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
    }

    public class UpdateSupplierCommandValidator : AbstractValidator<UpdateSupplierCommand>
    {
        public UpdateSupplierCommandValidator()
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
            RuleFor(x => x.CompanyName).NotEmpty()
                .WithMessage(Validation.RequiredMessage("نام شرکت"));
            RuleFor(x => x.Phone).NotEmpty()
                .WithMessage(Validation.RequiredMessage("شماره تماس"))
                .Must(Validation.IsMobileNumber)
                .WithMessage("شماره تماس وارد شده صحیح نمی باشد.");
            RuleFor(x => x.Address).NotEmpty()
                .WithMessage(Validation.RequiredMessage("آدرس"));
            RuleFor(x => x.PostalCode).NotEmpty()
                .WithMessage(Validation.RequiredMessage("کد پستی"));
        }
    }

    public class UpdateSupplierCommandHandler : IRequestHandler<UpdateSupplierCommand, ResponseDto>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateSupplierCommandHandler(IUnitOfWork unitOfWork, ISupplierRepository supplierRepository, IObjectStorageService objectStorageService)
        {
            _unitOfWork = unitOfWork;
            _supplierRepository = supplierRepository;
            _objectStorageService = objectStorageService;
        }

        public async Task<ResponseDto> Handle(UpdateSupplierCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var supplier = await _supplierRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("تامین کننده با اطلاعات مورد نظر یافت نشد.");

            supplier.FirstName = request.FirstName;
            supplier.LastName = request.LastName;
            supplier.CompanyName = request.CompanyName;
            supplier.Address = request.Address;
            supplier.Phone = request.Phone;
            supplier.EconomicCode = request.EconomicCode;
            supplier.NationalId = request.NationalId;
            supplier.RegistrationNumber = request.RegistrationNumber;
            supplier.Province = request.Province;
            supplier.City = request.City;
            supplier.Balance = request.Balance;
            supplier.PostalCode = request.PostalCode;
            supplier.BalanceType = request.BalanceType;
            // The column stores the bucket object key, so a signed URL echoed back by the frontend
            // is stripped down rather than persisted verbatim.
            supplier.ImageUrl = _objectStorageService.NormalizeKey(request.ImageUrl);
            supplier.Longitude = request.Longitude;
            supplier.Latitude = request.Latitude;
            supplier.Description = request.Description;
            supplier.UpdatedAt = DateTime.Now;

            _supplierRepository.Update(supplier);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "اطلاعات تامین کننده با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
