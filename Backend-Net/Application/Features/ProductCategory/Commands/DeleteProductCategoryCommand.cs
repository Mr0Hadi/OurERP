using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;

namespace Application.Features.ProductCategory.Commands
{
    public class DeleteProductCategoryCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteProductCategoryCommandHandler : IRequestHandler<DeleteProductCategoryCommand, ResponseDto>
    {
        private readonly IProductCategoryRepository _productCategoryRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteProductCategoryCommandHandler(IProductCategoryRepository productCategoryRepository, IUnitOfWork unitOfWork)
        {
            _productCategoryRepository = productCategoryRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteProductCategoryCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var productCategory = await _productCategoryRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("دسته‌بندی محصول مورد نظر یافت نشد.");

            productCategory.IsActive = false;

            _productCategoryRepository.Update(productCategory);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "دسته‌بندی محصول با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
