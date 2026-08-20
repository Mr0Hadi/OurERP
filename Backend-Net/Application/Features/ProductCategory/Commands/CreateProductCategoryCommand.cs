using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Extensions;
using Domain.Entities;
using FluentValidation;
using MediatR;

namespace Application.Features.ProductCategory.Commands
{
    public class CreateProductCategoryCommand : IRequest<ResponseDto>
    {
        public string Name { get; set; }
    }

    public class CreateProductCategoryCommandValidator : AbstractValidator<CreateProductCategoryCommand>
    {
        public CreateProductCategoryCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام دسته‌بندی"));
        }
    }

    public class CreateProductCategoryCommandHandler : IRequestHandler<CreateProductCategoryCommand, ResponseDto>
    {
        private readonly IProductCategoryRepository _productCategoryRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreateProductCategoryCommandHandler(IProductCategoryRepository productCategoryRepository, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _productCategoryRepository = productCategoryRepository;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateProductCategoryCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var productCategory = _mapper.Map<Domain.Entities.ProductCategory>(request);
            await _productCategoryRepository.AddAsync(productCategory, cancellationToken);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "دسته‌بندی محصول با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
