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
    /// Replaces a user's permission list with the one sent, the same wholesale contract
    /// Attachments and PaymentDetails already have - the client sends the final set.
    ///
    /// "Wholesale" is scoped to what the caller may manage, which matters: permissions the caller
    /// cannot see are left on the target untouched, rather than being deleted for not appearing
    /// in a list the caller was never shown. Without that, an ordinary administrator saving the
    /// super user's page would silently strip them of the permissions they could not see.
    /// </summary>
    public class UpdateUserPermissionsCommand : IRequest<ResponseDto>
    {
        public int UserId { get; set; }

        /// <summary>The final set. An empty list revokes everything the caller may manage.</summary>
        public List<PermissionEnum> Permissions { get; set; } = new();
    }

    public class UpdateUserPermissionsCommandValidator : AbstractValidator<UpdateUserPermissionsCommand>
    {
        public UpdateUserPermissionsCommandValidator()
        {
            RuleFor(x => x.UserId)
                .GreaterThan(0)
                .WithMessage(Validation.RequiredMessage("شناسه کاربر"));

            RuleFor(x => x.Permissions)
                .NotNull()
                .WithMessage(Validation.RequiredMessage("لیست دسترسی‌ها"));

            RuleForEach(x => x.Permissions)
                .Must(permission => Enum.IsDefined(permission))
                .WithMessage("دسترسی انتخاب‌شده معتبر نیست.");
        }
    }

    public class UpdateUserPermissionsCommandHandler : IRequestHandler<UpdateUserPermissionsCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateUserPermissionsCommandHandler(IWMSDbContext context, IPermissionService permissionService,
            IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _permissionService = permissionService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateUserPermissionsCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _context.Users
                .Include(x => x.Permissions)
                .FirstOrDefaultAsync(x => x.Id == request.UserId && x.IsActive, cancellationToken);

            if (user == null) throw new NotFoundCustomException("کاربر با این شناسه یافت نشد.");

            var actorId = Convert.ToInt32(_userContextService.GetUserId());
            var held = await _permissionService.GetUserPermissionsAsync(actorId, cancellationToken);
            var manageable = PermissionExtensions.ManageableBy(held).ToHashSet();

            var requested = request.Permissions.Distinct().ToHashSet();

            // Deliberately not "this permission is restricted": naming it would confirm that a
            // permission the caller is not allowed to see exists at all.
            if (requested.Any(permission => !manageable.Contains(permission)))
                throw new ValidationCustomException("یکی از دسترسی‌های انتخاب‌شده معتبر نیست یا اجازه واگذاری آن را ندارید.");

            // The one unrecoverable mistake: dropping your own key to this very screen leaves
            // nobody able to hand it back without direct database access.
            if (request.UserId == actorId
                && !requested.Contains(PermissionEnum.PermissionManage)
                && user.Permissions.Any(x => x.Permission == PermissionEnum.PermissionManage))
                throw new ValidationCustomException("نمی‌توانید دسترسی «مدیریت دسترسی‌های کاربران» را از خودتان بگیرید.");

            // The final list: what was requested plus the rows the caller cannot manage. The change
            // tracker diffs it against the snapshot taken at load - a dropped row is an orphan of a
            // required FK and is deleted, a new one is inserted. Kept rows must be the SAME tracked
            // instances (hence the lookup), both so GrantedAt/GrantedBy survive and so no second
            // instance with the same (UserId, Permission) key is ever attached.
            user.Permissions = requested
                .Select(permission => user.Permissions.FirstOrDefault(x => x.Permission == permission)
                    ?? new Domain.Entities.UserPermission
                    {
                        Permission = permission,
                        GrantedAt = DateTime.Now,
                        GrantedByUserId = actorId > 0 ? actorId : null
                    })
                .Concat(user.Permissions.Where(x => !manageable.Contains(x.Permission)))
                .ToList();

            var changes = _context.ChangeTracker.Entries<Domain.Entities.UserPermission>().ToList();
            var addedCount = changes.Count(x => x.State == EntityState.Added);
            var removedCount = changes.Count(x => x.State == EntityState.Deleted);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Takes effect on the target's very next request, not when their token expires.
            _permissionService.Invalidate(request.UserId);

            res.Data = new
            {
                UserId = request.UserId,
                AddedCount = addedCount,
                RemovedCount = removedCount
            };
            res.Message = "دسترسی‌های کاربر با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
