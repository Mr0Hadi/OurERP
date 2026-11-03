using Application.Common.Contracts.Context;
using Application.Common.Credit;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Customer.Dtos;
using AutoMapper;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Customer.Queries
{
    public class GetCustomerDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetCustomerDetailQueryHandler : IRequestHandler<GetCustomerDetailQuery, ResponseDto>
    {
        private readonly ICustomerRepository _customerRepository;
        private readonly IMapper _mapper;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IWMSDbContext _context;
        public GetCustomerDetailQueryHandler(ICustomerRepository customerRepository, IMapper mapper, IObjectStorageService objectStorageService, IWMSDbContext context)
        {
            _customerRepository = customerRepository;
            _mapper = mapper;
            _objectStorageService = objectStorageService;
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetCustomerDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var customer = await _customerRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("مشتری با اطلاعات مورد نظر یافت نشد.");

            var dto = _mapper.Map<CustomerDto>(customer);
            dto.ImageUrl = _objectStorageService.GetFixedUrl(dto.ImageKey);
            var exposure = await CreditLimitGuard.SavedExposureAsync(_context, customer.Id, cancellationToken);
            dto.LedgerBalance = exposure.LedgerBalance;
            dto.UnclearedCheques = exposure.UnclearedCheques;
            dto.CreditExposure = exposure.Total;
            dto.CreditAvailable = customer.CreditLimit.HasValue ? customer.CreditLimit.Value - exposure.Total : null;

            res.Data = dto;
            res.Message = "اطلاعات مشتری با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();

            return res;
        }
    }
}
