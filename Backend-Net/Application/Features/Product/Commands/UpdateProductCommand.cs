using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
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

namespace Application.Features.Product.Commands
{
    public class UpdateProductCommand : IRequest<ResponseDto>
    {
        // Code/BarCode are immutable after creation (they end up printed on physical labels) -
        // see docs/product-code-barcode-invoice-design.fa.md 1.11.
        public int Id { get; set; }
        public string Name { get; set; }
        public string Brand { get; set; }
        public ProductUnitEnum Unit { get; set; }
        public UInt64 PurchasePrice { get; set; }
        public UInt64 RetailPrice { get; set; }
        public UInt64 WholeSalePrice { get; set; }
        public int Tax { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }

        /// <summary>
        /// The ObjectKey returned by POST api/File/UploadImage (folder=PRODUCTS), or the ImageKey
        /// read off the detail response to keep the existing image. Send null to clear it.
        /// </summary>
        public string? ImageUrl { get; set; }
        public int ProductCategoryId { get; set; }

    }

    public class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
    {
        public UpdateProductCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام محصول"));
            RuleFor(x => x.Brand).NotEmpty().WithMessage(Validation.RequiredMessage("برند محصول"));
            RuleFor(x => x.PurchasePrice).Must(p => p > 0).WithMessage("قیمت خرید باید بزرگتر از صفر باشد.");
            RuleFor(x => x.RetailPrice).Must(r => r > 0).WithMessage("قیمت فروش باید بزرگتر از صفر باشد.");
            RuleFor(x => x.WholeSalePrice).Must(w => w > 0).WithMessage("قیمت عمده فروشی باید بزرگتر از صفر باشد.");
            RuleFor(x => x.Tax).GreaterThanOrEqualTo(0).WithMessage("مالیات نمی‌تواند منفی باشد.");
            RuleFor(x => x.Stock).GreaterThanOrEqualTo(0).WithMessage("موجودی نمی‌تواند منفی باشد.");
            RuleFor(x => x.LowStockThreshold).GreaterThanOrEqualTo(0).WithMessage("حداقل موجودی نمی‌تواند منفی باشد.");
            RuleFor(x => x.ProductCategoryId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه دسته‌بندی محصول"));
        }
    }

    public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, ResponseDto>
    {
        private readonly IProductRepository _productRepository;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;
        public UpdateProductCommandHandler(IProductRepository productRepository, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _productRepository = productRepository;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }
        public async Task<ResponseDto> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var product = await _productRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new ValidationCustomException("محصول مورد نظر یافت نشد.");

            product.Name = request.Name;
            product.Brand = request.Brand;
            product.Unit = request.Unit;
            product.PurchasePrice = request.PurchasePrice;
            product.RetailPrice = request.RetailPrice;
            product.WholeSalePrice = request.WholeSalePrice;
            product.Tax = request.Tax;
            product.LowStockThreshold = request.LowStockThreshold;
            // The column stores the bucket object key, so a signed URL echoed back by the frontend
            // is stripped down rather than persisted verbatim.
            product.ImageUrl = _objectStorageService.NormalizeKey(request.ImageUrl);
            product.UpdatedAt = DateTime.Now;

            // Stock is reconciled against ProductUnit rows rather than overwritten blind -
            // see docs/product-code-barcode-invoice-design.fa.md 1.6, option B.
            if (request.Stock != product.Stock)
            {
                var diff = request.Stock - product.Stock;
                await _productUnitService.ReconcileStockAsync(product, request.Stock, cancellationToken);

                if (diff > 0)
                    await _inventoryCostingService.RecordManualAdjustmentInAsync(product, diff, request.PurchasePrice, product.UpdatedAt, cancellationToken);
                else
                    await _inventoryCostingService.RecordManualAdjustmentOutAsync(product, -diff, product.UpdatedAt, cancellationToken);
            }
            product.Stock = request.Stock;

            _productRepository.Update(product);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "محصول با موفقیت آپدیت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
