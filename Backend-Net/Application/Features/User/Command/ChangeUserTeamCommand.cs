using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.User.Command
{
    public class ChangeUserTeamCommand : IRequest<ResponseDto>
    {
        public int UserId { get; set; }
        public int DepartmentId { get; set; }
        public int? TeamId { get; set; }
        public bool IsHead { get; set; }
    }

    public class ChangeUserTeamCommandValidator : AbstractValidator<ChangeUserTeamCommand>
    {
        public ChangeUserTeamCommandValidator()
        {
            RuleFor(x => x.UserId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه کاربر"));
            RuleFor(x => x.DepartmentId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه واحد"));
            RuleFor(x => x.TeamId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه تیم")).When(x => x.TeamId.HasValue);
        }
    }

    public class ChangeUserTeamCommandHandler : IRequestHandler<ChangeUserTeamCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly ITeamRepository _teamRepository;
        private readonly IUnitOfWork _unitOfWork;

        public ChangeUserTeamCommandHandler(IUserRepository userRepository, IDepartmentRepository departmentRepository, ITeamRepository teamRepository, IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _departmentRepository = departmentRepository;
            _teamRepository = teamRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ChangeUserTeamCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken) ?? throw new NotFoundCustomException("کاربر مورد نظر یافت نشد");

            var department = await _departmentRepository.GetByIdAsync(request.DepartmentId, cancellationToken) ?? throw new NotFoundCustomException("واحد انتخاب شده یافت نشد");

            Domain.Entities.Team? team = null;

            if (request.TeamId.HasValue)
            {
                team = await _teamRepository.GetByIdAsync(request.TeamId.Value, cancellationToken) ?? throw new NotFoundCustomException("تیم انتخاب شده یافت نشد");

                if (team.DepartmentId != request.DepartmentId)
                {
                    throw new ValidationCustomException("تیم انتخاب شده متعلق به این واحد نیست");
                }
            }

            if (user.TeamId.HasValue && user.TeamId != request.TeamId)
            {
                var previousTeam = await _teamRepository.GetByIdAsync(user.TeamId.Value, cancellationToken);

                if (previousTeam != null && previousTeam.HeadId == user.Id)
                {
                    previousTeam.HeadId = null;
                    _teamRepository.Update(previousTeam);
                }
            }

            user.DepartmentId = request.DepartmentId;
            user.TeamId = request.TeamId;
            user.UpdatedAt = DateTime.Now;
            _userRepository.Update(user);

            if (team != null)
            {
                if (request.IsHead)
                {
                    team.HeadId = user.Id;
                    _teamRepository.Update(team);
                }
                else if (team.HeadId == user.Id)
                {
                    team.HeadId = null;
                    _teamRepository.Update(team);
                }
            }

            await _unitOfWork.SaveChangesAsync();

            res.Message = "تیم کاربر با موفقیت بروزرسانی شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
