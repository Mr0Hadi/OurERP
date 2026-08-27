using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Extensions;
using Domain.Entities;
using FluentValidation;
using MediatR;

namespace Application.Features.Team.Commands
{
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
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreateTeamCommandHandler(ITeamRepository teamRepository, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _teamRepository = teamRepository;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateTeamCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var team = _mapper.Map<Domain.Entities.Team>(request);
            await _teamRepository.AddAsync(team, cancellationToken);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "تیم جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
