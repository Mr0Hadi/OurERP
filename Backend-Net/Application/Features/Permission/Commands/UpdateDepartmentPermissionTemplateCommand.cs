using Application.Common.Contracts.Context;
using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Permission.Commands
{
    /// <summary>
    /// Replaces a department's suggested permission set - the same wholesale-within-what-you-may-
    /// manage contract as <see cref="UpdateUserPermissionsCommand"/>, for the same reason: rows the
    /// caller cannot see are left alone rather than dropped for not appearing in their list.
    ///
    /// Changes nobody's access. Users hold only their own rows; the template is a suggestion
    /// the admin applies by hand on the user's screen.
    /// </summary>
    public class UpdateDepartmentPermissionTemplateCommand : IRequest<ResponseDto>
    {
        public int DepartmentId { get; set; }

        /// <summary>The final set. An empty list clears the template.</summary>
        public List<PermissionEnum> Permissions { get; set; } = new();
    }

    public class UpdateDepartmentPermissionTemplateCommandValidator : AbstractValidator<UpdateDepartmentPermissionTemplateCommand>
    {
        public UpdateDepartmentPermissionTemplateCommandValidator()
        {
            RuleFor(x => x.DepartmentId)
                .GreaterThan(0)
                .WithMessage(Validation.RequiredMessage("شناسه واحد"));

            RuleFor(x => x.Permissions)
                .NotNull()
                .WithMessage(Validation.RequiredMessage("لیست دسترسی‌ها"));

            RuleForEach(x => x.Permissions)
                .Must(permission => Enum.IsDefined(permission))
                .WithMessage("دسترسی انتخاب‌شده معتبر نیست.");
        }
    }

    public class UpdateDepartmentPermissionTemplateCommandHandler : IRequestHandler<UpdateDepartmentPermissionTemplateCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateDepartmentPermissionTemplateCommandHandler(IWMSDbContext context, IPermissionService permissionService,
            IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _permissionService = permissionService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateDepartmentPermissionTemplateCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var exists = await _context.Departments
                .AnyAsync(x => x.Id == request.DepartmentId && x.IsActive, cancellationToken);

            if (!exists) throw new NotFoundCustomException("واحد با این شناسه یافت نشد.");

            var actorId = Convert.ToInt32(_userContextService.GetUserId());
            var held = await _permissionService.GetUserPermissionsAsync(actorId, cancellationToken);
            var manageable = PermissionExtensions.ManageableBy(held).ToHashSet();

            var requested = request.Permissions.Distinct().ToHashSet();

            // Same wording as UpdateUserPermissions, and for the same reason: naming the
            // permission would confirm a restricted one exists.
            if (requested.Any(permission => !manageable.Contains(permission)))
                throw new ValidationCustomException("یکی از دسترسی‌های انتخاب‌شده معتبر نیست یا اجازه واگذاری آن را ندارید.");

            var existing = await _context.DepartmentPermissionTemplates
                .Where(x => x.DepartmentId == request.DepartmentId)
                .ToListAsync(cancellationToken);

            var toRemove = existing
                .Where(x => manageable.Contains(x.Permission) && !requested.Contains(x.Permission))
                .ToList();

            var alreadyIn = existing.Select(x => x.Permission).ToHashSet();

            var toAdd = requested
                .Where(permission => !alreadyIn.Contains(permission))
                .Select(permission => new Domain.Entities.DepartmentPermissionTemplate
                {
                    DepartmentId = request.DepartmentId,
                    Permission = permission
                })
                .ToList();

            _context.DepartmentPermissionTemplates.RemoveRange(toRemove);
            await _context.DepartmentPermissionTemplates.AddRangeAsync(toAdd, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // No cache to invalidate: nothing reads a template when checking access.

            res.Data = new
            {
                DepartmentId = request.DepartmentId,
                AddedCount = toAdd.Count,
                RemovedCount = toRemove.Count
            };
            res.Message = "الگوی دسترسی واحد با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
