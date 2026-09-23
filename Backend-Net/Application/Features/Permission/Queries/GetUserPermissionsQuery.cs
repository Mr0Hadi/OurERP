using Application.Common.Contracts.Context;
using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Permission.Dtos;
using Application.Features.Permission.Mappings;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Permission.Queries
{
    /// <summary>
    /// What one user holds, for the admin's edit screen. Restricted permissions the caller does
    /// not hold themselves are filtered out of the answer as well as out of the catalogue - so
    /// the ordinary administrator opening the super user's page sees an ordinary user.
    /// </summary>
    public class GetUserPermissionsQuery : IRequest<ResponseDto>
    {
        public int UserId { get; set; }
    }

    public class GetUserPermissionsQueryValidator : AbstractValidator<GetUserPermissionsQuery>
    {
        public GetUserPermissionsQueryValidator()
        {
            RuleFor(x => x.UserId)
                .GreaterThan(0)
                .WithMessage(Validation.RequiredMessage("شناسه کاربر"));
        }
    }

    public class GetUserPermissionsQueryHandler : IRequestHandler<GetUserPermissionsQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;

        public GetUserPermissionsQueryHandler(IWMSDbContext context, IPermissionService permissionService, IUserContextService userContextService)
        {
            _context = context;
            _permissionService = permissionService;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(GetUserPermissionsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _context.Users
                .AsNoTracking()
                .Where(x => x.Id == request.UserId && x.IsActive)
                .Select(x => new { x.Id, FullName = x.FirstName + " " + x.LastName })
                .FirstOrDefaultAsync(cancellationToken);

            if (user == null) throw new NotFoundCustomException("کاربر با این شناسه یافت نشد.");

            var actorId = Convert.ToInt32(_userContextService.GetUserId());
            var held = await _permissionService.GetUserPermissionsAsync(actorId, cancellationToken);
            var visible = PermissionExtensions.ManageableBy(held).ToHashSet();

            var rows = await _context.UserPermissions
                .AsNoTracking()
                .Where(x => x.UserId == request.UserId)
                .Select(x => new UserPermissionDto
                {
                    Permission = x.Permission,
                    GrantedAt = x.GrantedAt,
                    GrantedByFullName = x.GrantedBy != null ? x.GrantedBy.FirstName + " " + x.GrantedBy.LastName : null
                })
                .ToListAsync(cancellationToken);

            // Name/Title come off the enum's attributes, which SQL cannot read - same reason
            // signed image URLs are built after the query materialises.
            foreach (var row in rows)
            {
                row.Name = row.Permission.ToString();
                row.Title = row.Permission.GetDescription();
            }

            res.Data = new
            {
                UserId = user.Id,
                user.FullName,
                Permissions = rows.Where(x => visible.Contains(x.Permission)).ToList(),
                // The same catalogue GetPermissionList returns, so the edit screen can render
                // checkboxes without a second call.
                PermissionGroups = visible.ToGroupedDtos()
            };
            res.Message = "دسترسی‌های کاربر با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
