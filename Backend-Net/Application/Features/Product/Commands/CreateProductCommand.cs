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

namespace Application.Features.Product.Commands
{
    public class CreateProductCommand : IRequest<ResponseDto>
    {
        public string Name { get; set; }
        public string Code { get; set; }
        public string BarCode { get; set; }
        public string Brand { get; set; }
        public ProductUnitEnum Unit { get; set; }
        public int PurchasePrice { get; set; }
        public int RetailPrice { get; set; }
        public int WholeSalePrice { get; set; }
        public int Tax { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ProductCategoryId { get; set; }
    }

    public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
    {
        public CreateProductCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام محصول"));
            RuleFor(x => x.Code).NotEmpty().WithMessage(Validation.RequiredMessage("کد محصول"));
            RuleFor(x => x.BarCode).NotEmpty().WithMessage(Validation.RequiredMessage("بارکد محصول"));
            RuleFor(x => x.Brand).NotEmpty().WithMessage(Validation.RequiredMessage("برند محصول"));
            RuleFor(x => x.PurchasePrice).GreaterThan(0).WithMessage("قیمت خرید باید بزرگتر از صفر باشد.");
            RuleFor(x => x.RetailPrice).GreaterThan(0).WithMessage("قیمت فروش باید بزرگتر از صفر باشد.");
            RuleFor(x => x.WholeSalePrice).GreaterThan(0).WithMessage("قیمت عمده فروشی باید بزرگتر از صفر باشد.");
            RuleFor(x => x.Tax).GreaterThanOrEqualTo(0).WithMessage("مالیات نمی‌تواند منفی باشد.");
            RuleFor(x => x.Stock).GreaterThanOrEqualTo(0).WithMessage("موجودی نمی‌تواند منفی باشد.");
            RuleFor(x => x.LowStockThreshold).GreaterThanOrEqualTo(0).WithMessage("حداقل موجودی نمی‌تواند منفی باشد.");
            RuleFor(x => x.ProductCategoryId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه دسته‌بندی محصول"));
        }
    }

    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, ResponseDto>
    {
        private readonly IProductRepository _productRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreateProductCommandHandler(IProductRepository productRepository, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _productRepository = productRepository;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var product = _mapper.Map<Domain.Entities.Product>(request);
            await _productRepository.AddAsync(product);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "محصول با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
