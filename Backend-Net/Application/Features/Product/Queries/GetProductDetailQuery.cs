using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Product.Dtos;
using AutoMapper;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Product.Queries
{
    public class GetProductDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetProductDetailQueryHandler : IRequestHandler<GetProductDetailQuery, ResponseDto>
    {
        private readonly IProductRepository _productRepository;
        private readonly IMapper _mapper;
        private readonly IObjectStorageService _objectStorageService;
        public GetProductDetailQueryHandler(IProductRepository productRepository, IMapper mapper, IObjectStorageService objectStorageService)
        {
            _productRepository = productRepository;
            _mapper = mapper;
            _objectStorageService = objectStorageService;
        }
        public async Task<ResponseDto> Handle(GetProductDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var data = await _productRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("محصول مورد نظر یافت نشد.");
            var dto = _mapper.Map<ProductDto>(data);
            dto.ImageUrl = _objectStorageService.GetPresignedUrl(dto.ImageKey);

            res.Data = dto;

            res.Message = "اطلاعات محصول با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
