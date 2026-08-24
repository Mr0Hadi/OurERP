using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;

namespace Application.Features.PosTerminal.Commands
{
    public class DeletePosTerminalCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeletePosTerminalCommandHandler : IRequestHandler<DeletePosTerminalCommand, ResponseDto>
    {
        private readonly IPosTerminalRepository _posTerminalRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DeletePosTerminalCommandHandler(IPosTerminalRepository posTerminalRepository, IUnitOfWork unitOfWork)
        {
            _posTerminalRepository = posTerminalRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeletePosTerminalCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var posTerminal = await _posTerminalRepository.GetByIdAsync(request.Id, cancellationToken)
                ?? throw new NotFoundCustomException("دستگاه کارتخوان مورد نظر یافت نشد.");

            posTerminal.IsActive = false;

            _posTerminalRepository.Update(posTerminal);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "دستگاه کارتخوان با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
