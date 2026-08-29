using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
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

namespace Application.Features.Product.Commands
{
    public class CreateProductCommand : IRequest<ResponseDto>
    {
        // Code/BarCode are NOT settable here - they are auto-generated after the row gets an
        // Id (see the handler). The frontend should gray this field out ("به‌صورت خودکار تولید
        // می‌شود") rather than send anything - see docs/product-code-barcode-invoice-design.fa.md 1.11.
        public string Name { get; set; }
        public string Brand { get; set; }
        public ProductUnitEnum Unit { get; set; }
        public int PurchasePrice { get; set; }
        public int RetailPrice { get; set; }
        public int WholeSalePrice { get; set; }
        public int Tax { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }

        /// <summary>
        /// The ObjectKey returned by POST api/File/UploadImage (folder=PRODUCTS). A full signed
        /// URL is also accepted and normalized back down to the key - see IObjectStorageService.
        /// </summary>
        public string? ImageObjectKey { get; set; }
        public int ProductCategoryId { get; set; }
    }

    public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
    {
        public CreateProductCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام محصول"));
            RuleFor(x => x.Brand).NotEmpty().WithMessage(Validation.RequiredMessage("برند محصول"));
            RuleFor(x => x.PurchasePrice).GreaterThan(0).WithMessage("قیمت خرید باید بزرگتر از صفر باشد.");
            RuleFor(x => x.RetailPrice).GreaterThan(0).WithMessage("قیمت فروش باید بزرگتر از صفر باشد.");
            RuleFor(x => x.WholeSalePrice).GreaterThan(0).WithMessage("قیمت عمده فروشی باید بزرگتر از صفر باشد.");
            RuleFor(x => x.Tax).GreaterThanOrEqualTo(0).WithMessage("مالیات نمی‌تواند منفی باشد.");
            RuleFor(x => x.Stock).GreaterThanOrEqualTo(0).WithMessage("موجودی نمی‌تواند منفی باشد.");
            RuleFor(x => x.LowStockThreshold).GreaterThanOrEqualTo(0).WithMessage("حداقل موجودی نمی‌تواند منفی باشد.");
            RuleFor(x => x.ProductCategoryId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه دسته‌بندی محصول"));
            RuleFor(x => x.Unit).IsInEnum().WithMessage("واحد محصول نامعتبر است.");
        }
    }

    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, ResponseDto>
    {
        private readonly IProductRepository _productRepository;
        private readonly IMapper _mapper;
        private readonly IProductCodeService _productCodeService;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public CreateProductCommandHandler(IProductRepository productRepository, IMapper mapper, IProductCodeService productCodeService, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _productRepository = productRepository;
            _mapper = mapper;
            _productCodeService = productCodeService;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var product = _mapper.Map<Domain.Entities.Product>(request);
            product.CreatedAt = DateTime.Now;
            product.UpdatedAt = DateTime.Now;

            // The column stores the bucket object key, never a URL - signed URLs expire.
            product.ImageUrl = _objectStorageService.NormalizeKey(request.ImageObjectKey);

            // Code/BarCode are NOT NULL and only computable once the row has an Id, so the first
            // save needs a placeholder. A Guid rather than "" so a concurrent create can't collide
            // on the unique Code index during the window between the two saves.
            var placeholder = Guid.NewGuid().ToString("N");
            product.Code = placeholder;
            product.BarCode = placeholder;

            await _productRepository.AddAsync(product, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Code needs the row's Id, which only exists after the first SaveChanges - see
            // docs/product-code-barcode-invoice-design.fa.md 1.4.
            product.Code = _productCodeService.BuildProductCode(product.Id, product.CreatedAt);
            product.BarCode = _productCodeService.ToPayload(product.Code);

            if (product.Stock > 0)
            {
                await _productUnitService.MintAsync(product, product.Stock, null, cancellationToken);
                await _inventoryCostingService.RecordOpeningBalanceAsync(product, product.Stock, product.PurchasePrice, product.CreatedAt, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { product.Id, product.Code, product.BarCode };
            res.Message = "محصول با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
