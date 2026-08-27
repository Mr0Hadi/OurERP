using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Team.Commands
{
    public class DeleteTeamCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteTeamCommandHandler : IRequestHandler<DeleteTeamCommand, ResponseDto>
    {
        private readonly ITeamRepository _teamRepository;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteTeamCommandHandler(ITeamRepository teamRepository, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _teamRepository = teamRepository;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteTeamCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var team = await _teamRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("تیم مورد نظر یافت نشد.");

            var hasActiveUsers = await _context.Users.AnyAsync(x => x.TeamId == request.Id && x.IsActive, cancellationToken);
            if (hasActiveUsers)
            {
                throw new ValidationCustomException("این تیم دارای کارمند فعال است و قابل حذف نیست.");
            }

            team.IsActive = false;

            _teamRepository.Update(team);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "تیم با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
