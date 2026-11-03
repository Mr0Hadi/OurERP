using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.User.Command
{
    /// <summary>
    /// Saves the signed-in user's dashboard layout (frontend-requests 6.3). The value belongs to the frontend: the server
    /// only caps its length; null or blank clears it. Always the caller's own row, never another user's.
    /// </summary>
    [AuditAction(AuditActionEnum.SaveMyDashboardLayout)]
    public class SaveMyDashboardLayoutCommand : IRequest<ResponseDto>
    {
        public const int MaxLength = 4000;

        public string? Layout { get; set; }
    }

    public class SaveMyDashboardLayoutCommandValidator : AbstractValidator<SaveMyDashboardLayoutCommand>
    {
        public SaveMyDashboardLayoutCommandValidator()
        {
            RuleFor(x => x.Layout).MaximumLength(SaveMyDashboardLayoutCommand.MaxLength)
                .WithMessage("چیدمان داشبورد بیش از حد بزرگ است.");
        }
    }

    public class SaveMyDashboardLayoutCommandHandler : IRequestHandler<SaveMyDashboardLayoutCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public SaveMyDashboardLayoutCommandHandler(IWMSDbContext context, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(SaveMyDashboardLayoutCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            if (!int.TryParse(_userContextService.GetUserId(), out var userId))
                throw new UnauthorizedCustomException("کاربر شناسایی نشد.");

            var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("کاربر یافت نشد.");

            user.DashboardLayout = string.IsNullOrWhiteSpace(request.Layout) ? null : request.Layout;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { Layout = user.DashboardLayout };
            res.Message = "چیدمان داشبورد ذخیره شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
