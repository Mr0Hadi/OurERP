using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Team.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Team.Queries
{
    public enum TeamListSortEnum
    {
        ID = 0,
        NAME = 1,
        DEPARTMENT_NAME = 2,
        HEAD_NAME = 3,
        USER_COUNT = 4,
    }

    public class GetTeamListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Name { get; set; }
        public int? DepartmentId { get; set; }
        public TeamListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetTeamListQueryHandler : IRequestHandler<GetTeamListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetTeamListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetTeamListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Teams.Where(x => x.IsActive).AsQueryable();

            if (!string.IsNullOrEmpty(request.Name))
            {
                query = query.Where(x => x.Name.Contains(request.Name));
            }

            if (request.DepartmentId.HasValue)
            {
                query = query.Where(x => x.DepartmentId == request.DepartmentId.Value);
            }

            var projected = query.Select(x => new TeamListDto
            {
                Id = x.Id,
                Name = x.Name,
                DepartmentName = x.Department.Name,
                HeadName = x.Head != null ? x.Head.FirstName + " " + x.Head.LastName : null,
                DeputyName = x.Deputy != null ? x.Deputy.FirstName + " " + x.Deputy.LastName : null,
                UserCount = x.Users.Count(u => u.IsActive)
            });

            // Sorted on the projection so the count is sortable too. Default: alphabetical.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                TeamListSortEnum.ID => projected.SortBy(x => x.Id, direction),
                TeamListSortEnum.DEPARTMENT_NAME => projected.SortBy(x => x.DepartmentName, direction),
                TeamListSortEnum.HEAD_NAME => projected.SortBy(x => x.HeadName, direction),
                TeamListSortEnum.USER_COUNT => projected.SortBy(x => x.UserCount, direction),
                _ => projected.SortBy(x => x.Name, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                TeamList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست تیم‌ها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
