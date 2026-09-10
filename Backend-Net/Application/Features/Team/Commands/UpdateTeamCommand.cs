using Application.Common.Contracts.OrgStructure;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Team.Commands
{
    /// <summary>
    /// <see cref="HeadId"/>/<see cref="DeputyId"/> carry the team's final state: whoever is named is
    /// moved into this team (and its department) and given the role, releasing any slot they held
    /// elsewhere; whoever is dropped stays on as a plain member of the team. All of it runs through
    /// <see cref="IOrgRoleService.AssignAsync"/>, so the user list/detail pages see the same thing
    /// this page just wrote.
    /// </summary>
    public class UpdateTeamCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int? HeadId { get; set; }
        public int? DeputyId { get; set; }
    }

    public class UpdateTeamCommandValidator : AbstractValidator<UpdateTeamCommand>
    {
        public UpdateTeamCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام تیم"));
            RuleFor(x => x.HeadId).GreaterThan(0).When(x => x.HeadId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه سرپرست"));
            RuleFor(x => x.DeputyId).GreaterThan(0).When(x => x.DeputyId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه معاون"));
            RuleFor(x => x)
                .Must(x => !x.HeadId.HasValue || !x.DeputyId.HasValue || x.HeadId != x.DeputyId)
                .WithMessage("معاون نمی‌تواند همان مدیر باشد")
                .OverridePropertyName(nameof(UpdateTeamCommand.DeputyId));
        }
    }

    public class UpdateTeamCommandHandler : IRequestHandler<UpdateTeamCommand, ResponseDto>
    {
        private readonly ITeamRepository _teamRepository;
        private readonly IUserRepository _userRepository;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateTeamCommandHandler(ITeamRepository teamRepository, IUserRepository userRepository, IOrgRoleService orgRoleService, IUnitOfWork unitOfWork)
        {
            _teamRepository = teamRepository;
            _userRepository = userRepository;
            _orgRoleService = orgRoleService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateTeamCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var team = await _teamRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("تیم مورد نظر یافت نشد.");

            // Final state first, then the assignments - AssignAsync releases the user's slots
            // before writing the new one, and would otherwise clear what we had just set.
            team.HeadId = request.HeadId;
            team.DeputyId = request.DeputyId;

            if (request.HeadId.HasValue)
            {
                var head = await _userRepository.GetByIdAsync(request.HeadId.Value, cancellationToken) ?? throw new NotFoundCustomException("سرپرست انتخاب شده یافت نشد");
                await _orgRoleService.AssignAsync(head, team.DepartmentId, team.Id, OrgRoleEnum.TEAM_HEAD, cancellationToken);
                _userRepository.Update(head);
            }

            if (request.DeputyId.HasValue)
            {
                var deputy = await _userRepository.GetByIdAsync(request.DeputyId.Value, cancellationToken) ?? throw new NotFoundCustomException("معاون انتخاب شده یافت نشد");
                await _orgRoleService.AssignAsync(deputy, team.DepartmentId, team.Id, OrgRoleEnum.TEAM_DEPUTY, cancellationToken);
                _userRepository.Update(deputy);
            }

            team.Name = request.Name;

            _teamRepository.Update(team);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "اطلاعات تیم با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
