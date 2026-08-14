using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.ProductCode;
using Application.Common.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Barcode.Queries
{
    /// <summary>
    /// Renders a single already-known code (a Product.BarCode or ProductUnit.Barcode, normally
    /// obtained from ScanBarcodeQuery/GetProductDetail/GetProductUnitList first) as a printable
    /// vector SVG. Does not touch the database - this is pure rendering of a payload the caller
    /// already resolved, so it stays a fast, cache-friendly image endpoint.
    /// </summary>
    public class GetBarcodeSvgQuery : IRequest<FileResponseDto>
    {
        public string Code { get; set; } = string.Empty;
        public decimal? ModuleWidthMm { get; set; }
        public decimal? BarHeightMm { get; set; }
        public bool ShowHumanReadable { get; set; } = true;
    }

    public class GetBarcodeSvgQueryValidator : AbstractValidator<GetBarcodeSvgQuery>
    {
        public GetBarcodeSvgQueryValidator()
        {
            RuleFor(x => x.Code).NotEmpty().WithMessage(Validation.RequiredMessage("بارکد"));
        }
    }

    public class GetBarcodeSvgQueryHandler : IRequestHandler<GetBarcodeSvgQuery, FileResponseDto>
    {
        private readonly IProductCodeService _productCodeService;
        private readonly IBarcodeRenderer _barcodeRenderer;

        public GetBarcodeSvgQueryHandler(IProductCodeService productCodeService, IBarcodeRenderer barcodeRenderer)
        {
            _productCodeService = productCodeService;
            _barcodeRenderer = barcodeRenderer;
        }

        public Task<FileResponseDto> Handle(GetBarcodeSvgQuery request, CancellationToken cancellationToken)
        {
            var reference = _productCodeService.Parse(request.Code);
            if (reference.Kind == BarcodeReferenceKindEnum.UNKNOWN)
                throw new ValidationCustomException("بارکد وارد شده معتبر نیست.");

            var options = new BarcodeRenderOptions { ShowHumanReadable = request.ShowHumanReadable };
            if (request.ModuleWidthMm.HasValue)
                options.ModuleWidthMm = request.ModuleWidthMm.Value;
            if (request.BarHeightMm.HasValue)
                options.BarHeightMm = request.BarHeightMm.Value;

            var svg = _barcodeRenderer.RenderCode128Svg(reference.NormalizedPayload, request.Code, options);
            var bytes = System.Text.Encoding.UTF8.GetBytes(svg);

            return Task.FromResult(new FileResponseDto
            {
                Content = bytes,
                FileName = $"{reference.NormalizedPayload}.svg",
                ContentType = "image/svg+xml",
            });
        }
    }
}
