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

            var department = await _context.Departments
                .Include(x => x.PermissionTemplate)
                .FirstOrDefaultAsync(x => x.Id == request.DepartmentId && x.IsActive, cancellationToken);

            if (department == null) throw new NotFoundCustomException("واحد با این شناسه یافت نشد.");

            var actorId = Convert.ToInt32(_userContextService.GetUserId());
            var held = await _permissionService.GetUserPermissionsAsync(actorId, cancellationToken);
            var manageable = PermissionExtensions.ManageableBy(held).ToHashSet();

            var requested = request.Permissions.Distinct().ToHashSet();

            // Same wording as UpdateUserPermissions, and for the same reason: naming the
            // permission would confirm a restricted one exists.
            if (requested.Any(permission => !manageable.Contains(permission)))
                throw new ValidationCustomException("یکی از دسترسی‌های انتخاب‌شده معتبر نیست یا اجازه واگذاری آن را ندارید.");

            // Same change-tracker sync as UpdateUserPermissions: the final list is diffed against the
            // snapshot taken at load, and kept rows reuse their tracked instance so no duplicate key
            // is attached.
            department.PermissionTemplate = requested
                .Select(permission => department.PermissionTemplate.FirstOrDefault(x => x.Permission == permission)
                    ?? new Domain.Entities.DepartmentPermissionTemplate { Permission = permission })
                .Concat(department.PermissionTemplate.Where(x => !manageable.Contains(x.Permission)))
                .ToList();

            var changes = _context.ChangeTracker.Entries<Domain.Entities.DepartmentPermissionTemplate>().ToList();
            var addedCount = changes.Count(x => x.State == EntityState.Added);
            var removedCount = changes.Count(x => x.State == EntityState.Deleted);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // No cache to invalidate: nothing reads a template when checking access.

            res.Data = new
            {
                DepartmentId = request.DepartmentId,
                AddedCount = addedCount,
                RemovedCount = removedCount
            };
            res.Message = "الگوی دسترسی واحد با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
