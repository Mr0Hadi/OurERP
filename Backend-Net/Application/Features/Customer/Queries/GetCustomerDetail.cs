using Application.Common.Contracts.Repositories;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Customer.Dtos;
using AutoMapper;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Customer.Queries
{
    public class GetCustomerDetail : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetCustomerDetailHandler : IRequestHandler<GetCustomerDetail, ResponseDto>
    {
        private readonly ICustomerRepository _customerRepository;
        private readonly IMapper _mapper;
        public GetCustomerDetailHandler(ICustomerRepository customerRepository, IMapper mapper)
        {
            _customerRepository = customerRepository;
            _mapper = mapper;
        }
        public async Task<ResponseDto> Handle(GetCustomerDetail request, CancellationToken cancellationToken)
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
