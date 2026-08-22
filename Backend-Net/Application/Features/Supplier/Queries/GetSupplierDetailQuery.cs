using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Supplier.Dtos;
using AutoMapper;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Supplier.Queries
{
    public class GetSupplierDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetSupplierDetailQueryHandler : IRequestHandler<GetSupplierDetailQuery, ResponseDto>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IMapper _mapper;
        private readonly IObjectStorageService _objectStorageService;
        public GetSupplierDetailQueryHandler(ISupplierRepository supplierRepository, IMapper mapper, IObjectStorageService objectStorageService)
        {
            _supplierRepository = supplierRepository;
            _mapper = mapper;
            _objectStorageService = objectStorageService;
        }
        public async Task<ResponseDto> Handle(GetSupplierDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var supplier = await _supplierRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("تامین کننده با اطلاعات مورد نظر یافت نشد.");

            var dto = _mapper.Map<SupplierDto>(supplier);
            dto.ImageUrl = _objectStorageService.GetPresignedUrl(dto.ImageKey);

            res.Data = dto;
            res.Message = "اطلاعات تامین کننده با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();

            return res;
        }
    }
}
