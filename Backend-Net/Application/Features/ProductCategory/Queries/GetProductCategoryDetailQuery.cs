using Application.Common.Contracts.Repositories;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.ProductCategory.Dtos;
using AutoMapper;
using Common.Exceptions;
using MediatR;

namespace Application.Features.ProductCategory.Queries
{
    public class GetProductCategoryDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetProductCategoryDetailQueryHandler : IRequestHandler<GetProductCategoryDetailQuery, ResponseDto>
    {
        private readonly IProductCategoryRepository _productCategoryRepository;
        private readonly IMapper _mapper;
        public GetProductCategoryDetailQueryHandler(IProductCategoryRepository productCategoryRepository, IMapper mapper)
        {
            _productCategoryRepository = productCategoryRepository;
            _mapper = mapper;
        }
        public async Task<ResponseDto> Handle(GetProductCategoryDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var data = await _productCategoryRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("دسته‌بندی محصول مورد نظر یافت نشد.");
            res.Data = _mapper.Map<ProductCategoryDto>(data);

            res.Message = "اطلاعات دسته‌بندی محصول با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
