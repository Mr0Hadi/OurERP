using Application.Common.Contracts.Repositories;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Supplier.Dtos;
using AutoMapper;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Supplier.Queries
{
    public class GetSupplierDetail : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetSupplierDetailHandler : IRequestHandler<GetSupplierDetail, ResponseDto>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IMapper _mapper;
        public GetSupplierDetailHandler(ISupplierRepository supplierRepository, IMapper mapper)
        {
            _supplierRepository = supplierRepository;
            _mapper = mapper;
        }
        public async Task<ResponseDto> Handle(GetSupplierDetail request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var supplier = await _supplierRepository.GetByIdAsync(request.Id) ?? throw new NotFoundCustomException("تامین کننده با اطلاعات مورد نظر یافت نشد.");

            res.Data = _mapper.Map<SupplierDto>(supplier);
            res.Message = "اطلاعات تامین کننده با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();

            return res;
        }
    }
}
