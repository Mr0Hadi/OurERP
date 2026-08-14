using Application.Common.Contracts.Repositories;
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
        public GetProductDetailQueryHandler(IProductRepository productRepository, IMapper mapper)
        {
            _productRepository = productRepository;
            _mapper = mapper;
        }
        public async Task<ResponseDto> Handle(GetProductDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var data = await _productRepository.GetByIdAsync(request.Id) ?? throw new NotFoundCustomException("محصول مورد نظر یافت نشد.");
            res.Data = _mapper.Map<ProductDto>(data);

            res.Message = "اطلاعات محصول با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
