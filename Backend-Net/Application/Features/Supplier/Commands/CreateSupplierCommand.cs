using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Supplier.Commands
{
    public class CreateSupplierCommand : IRequest<ResponseDto>
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string CompanyName { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string PostalCode { get; set; }

        /// <summary>
        /// The ObjectKey returned by POST api/File/UploadImage (folder=SUPPLIERS). A full signed
        /// URL is also accepted and normalized back down to the key - see IObjectStorageService.
        /// </summary>
        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public UInt64? Balance { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }
        public decimal? longitude { get; set; }
        public decimal? latitude { get; set; }
    }

    public class CreateSupplierCommandValidator : AbstractValidator<CreateSupplierCommand>
    {
        public CreateSupplierCommandValidator()
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

    public class CreateSupplierCommandHandler : IRequestHandler<CreateSupplierCommand, ResponseDto>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IMapper _mapper;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;
        public CreateSupplierCommandHandler(ISupplierRepository supplierRepository, IMapper mapper, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _supplierRepository = supplierRepository;
            _mapper = mapper;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }
        public async Task<ResponseDto> Handle(CreateSupplierCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var newSupplier = _mapper.Map<Domain.Entities.Supplier>(request);

            // The column stores the bucket object key, never a URL - signed URLs expire.
            newSupplier.ImageUrl = _objectStorageService.NormalizeKey(request.ImageUrl);

            await _supplierRepository.AddAsync(newSupplier, cancellationToken);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "تامین کننده جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
