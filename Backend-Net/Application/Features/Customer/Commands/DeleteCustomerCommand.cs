using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Customer.Commands
{
    public class DeleteCustomerCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteCustomerCommandHandler : IRequestHandler<DeleteCustomerCommand, ResponseDto>
    {
        private readonly ICustomerRepository _customerRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteCustomerCommandHandler(ICustomerRepository customerRepository, IUnitOfWork unitOfWork)
        {
            _customerRepository = customerRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteCustomerCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var customer = await _customerRepository.GetByIdAsync(request.Id) ?? throw new NotFoundCustomException("مشتری با اطلاعات مورد نظر یافت نشد.");

            customer.IsActive = false;

            _customerRepository.Update(customer);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "مشتری با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
