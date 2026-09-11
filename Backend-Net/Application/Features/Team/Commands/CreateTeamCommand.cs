using Application.Common.Contracts.OrgStructure;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Team.Commands
{
    /// <summary>
    /// Naming a <see cref="HeadId"/>/<see cref="DeputyId"/> moves that user into the new team and
    /// <see cref="DepartmentId"/>, releasing any slot they held elsewhere - the FK and the user's own
    /// DepartmentId/TeamId are written together by <see cref="IOrgRoleService.AssignAsync"/>, so they
    /// can never disagree. No separate "move the user first" call is needed.
    /// </summary>
    public class CreateTeamCommand : IRequest<ResponseDto>
    {
        public string Name { get; set; }
        public int DepartmentId { get; set; }
        public int? HeadId { get; set; }
        public int? DeputyId { get; set; }
    }

    public class CreateTeamCommandValidator : AbstractValidator<CreateTeamCommand>
    {
        public CreateTeamCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام تیم"));
            RuleFor(x => x.DepartmentId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه دپارتمان"));
            RuleFor(x => x.HeadId).GreaterThan(0).When(x => x.HeadId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه سرپرست"));
            RuleFor(x => x.DeputyId).GreaterThan(0).When(x => x.DeputyId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه معاون"));
            RuleFor(x => x)
                .Must(x => !x.HeadId.HasValue || !x.DeputyId.HasValue || x.HeadId != x.DeputyId)
                .WithMessage("معاون نمی‌تواند همان مدیر باشد")
                .OverridePropertyName(nameof(CreateTeamCommand.DeputyId));
        }
    }

    public class CreateTeamCommandHandler : IRequestHandler<CreateTeamCommand, ResponseDto>
    {
        private readonly ITeamRepository _teamRepository;
        private readonly IUserRepository _userRepository;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreateTeamCommandHandler(ITeamRepository teamRepository, IUserRepository userRepository, IOrgRoleService orgRoleService, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _teamRepository = teamRepository;
            _userRepository = userRepository;
            _orgRoleService = orgRoleService;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateTeamCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            // Load the users before creating the team: a bad id must not leave an orphan team behind.
            Domain.Entities.User? head = null;
            Domain.Entities.User? deputy = null;

            if (request.HeadId.HasValue)
            {
                head = await _userRepository.GetByIdAsync(request.HeadId.Value, cancellationToken) ?? throw new NotFoundCustomException("سرپرست انتخاب شده یافت نشد");
            }

            if (request.DeputyId.HasValue)
            {
                deputy = await _userRepository.GetByIdAsync(request.DeputyId.Value, cancellationToken) ?? throw new NotFoundCustomException("معاون انتخاب شده یافت نشد");
            }

            var team = _mapper.Map<Domain.Entities.Team>(request);
            await _teamRepository.AddAsync(team, cancellationToken);

            // The roles can only be assigned once the team has an Id for User.TeamId to point at.
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            if (head != null)
            {
                await _orgRoleService.AssignAsync(head, team.DepartmentId, team.Id, OrgRoleEnum.TEAM_HEAD, cancellationToken);
                _userRepository.Update(head);
            }

            if (deputy != null)
            {
                await _orgRoleService.AssignAsync(deputy, team.DepartmentId, team.Id, OrgRoleEnum.TEAM_DEPUTY, cancellationToken);
                _userRepository.Update(deputy);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "تیم جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
