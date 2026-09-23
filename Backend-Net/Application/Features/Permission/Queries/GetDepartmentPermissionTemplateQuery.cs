using Application.Common.Contracts.Context;
using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Permission.Mappings;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Permission.Queries
{
    /// <summary>
    /// A department's suggested permission set, for two screens: the department page where the
    /// template is edited, and the user page where it is offered to the admin as a shortcut.
    ///
    /// Filtered exactly like <see cref="GetUserPermissionsQuery"/> - a restricted permission the
    /// caller does not hold is left out of both the template and the catalogue, so applying a
    /// template can never put something on the user screen that saving would then reject.
    /// </summary>
    public class GetDepartmentPermissionTemplateQuery : IRequest<ResponseDto>
    {
        public int DepartmentId { get; set; }
    }

    public class GetDepartmentPermissionTemplateQueryValidator : AbstractValidator<GetDepartmentPermissionTemplateQuery>
    {
        public GetDepartmentPermissionTemplateQueryValidator()
        {
            RuleFor(x => x.DepartmentId)
                .GreaterThan(0)
                .WithMessage(Validation.RequiredMessage("شناسه واحد"));
        }
    }

    public class GetDepartmentPermissionTemplateQueryHandler : IRequestHandler<GetDepartmentPermissionTemplateQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;

        public GetDepartmentPermissionTemplateQueryHandler(IWMSDbContext context, IPermissionService permissionService, IUserContextService userContextService)
        {
            _context = context;
            _permissionService = permissionService;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(GetDepartmentPermissionTemplateQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var department = await _context.Departments
                .AsNoTracking()
                .Where(x => x.Id == request.DepartmentId && x.IsActive)
                .Select(x => new { x.Id, x.Name })
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("واحد با این شناسه یافت نشد.");

            var actorId = Convert.ToInt32(_userContextService.GetUserId());
            var held = await _permissionService.GetUserPermissionsAsync(actorId, cancellationToken);
            var visible = PermissionExtensions.ManageableBy(held).ToHashSet();

            var template = await _context.DepartmentPermissionTemplates
                .AsNoTracking()
                .Where(x => x.DepartmentId == request.DepartmentId)
                .Select(x => x.Permission)
                .ToListAsync(cancellationToken);

            // Declaration order, like the catalogue, rather than whatever order SQL returns.
            var permissions = PermissionExtensions.All
                .Where(permission => template.Contains(permission) && visible.Contains(permission))
                .ToList();

            res.Data = new
            {
                DepartmentId = department.Id,
                DepartmentName = department.Name,
                Permissions = permissions.Select(x => x.ToDto()).ToList(),
                PermissionNames = permissions.Select(x => x.ToString()).ToList(),
                PermissionGroups = visible.ToGroupedDtos()
            };
            res.Message = "الگوی دسترسی واحد با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
