using Application.Common.Contracts.Repositories;
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
        public GetCustomerDetailQueryHandler(ICustomerRepository customerRepository, IMapper mapper)
        {
            _customerRepository = customerRepository;
            _mapper = mapper;
        }
        public async Task<ResponseDto> Handle(GetCustomerDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var customer = await _customerRepository.GetByIdAsync(request.Id) ?? throw new NotFoundCustomException("مشتری با اطلاعات مورد نظر یافت نشد.");

            res.Data = _mapper.Map<CustomerDto>(customer);
            res.Message = "اطلاعات مشتری با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();

            return res;
        }
    }
}
