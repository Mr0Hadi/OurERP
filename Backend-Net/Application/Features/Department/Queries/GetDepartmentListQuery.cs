using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Department.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Department.Queries
{
    public enum DepartmentListSortEnum
    {
        ID = 0,
        NAME = 1,
        HEAD_NAME = 2,
        TEAM_COUNT = 3,
        USER_COUNT = 4,
    }

    public class GetDepartmentListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Name { get; set; }
        public string? HeadName { get; set; }
        public DepartmentListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetDepartmentListQueryHandler : IRequestHandler<GetDepartmentListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetDepartmentListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetDepartmentListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Departments.Where(x => x.IsActive).AsQueryable().AsNoTracking();

            if (!string.IsNullOrEmpty(request.Name))
            {
                query = query.Where(x => x.Name.Contains(request.Name));
            }

            if (!string.IsNullOrEmpty(request.HeadName))
            {
                query = query.Where(x => x.Head != null && (x.Head.FirstName + " " + x.Head.LastName).Contains(request.HeadName));
            }

            var projected = query.Select(x => new DepartmentListDto
            {
                Id = x.Id,
                Name = x.Name,
                HeadName = x.Head != null ? x.Head.FirstName + " " + x.Head.LastName : null,
                DeputyName = x.Deputy != null ? x.Deputy.FirstName + " " + x.Deputy.LastName : null,
                TeamCount = x.Teams.Count(t => t.IsActive),
                UserCount = x.Users.Count(u => u.IsActive)
            });

            // Sorted on the projection so the counts are sortable too. Default: alphabetical.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                DepartmentListSortEnum.ID => projected.SortBy(x => x.Id, direction),
                DepartmentListSortEnum.HEAD_NAME => projected.SortBy(x => x.HeadName, direction),
                DepartmentListSortEnum.TEAM_COUNT => projected.SortBy(x => x.TeamCount, direction),
                DepartmentListSortEnum.USER_COUNT => projected.SortBy(x => x.UserCount, direction),
                _ => projected.SortBy(x => x.Name, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                DepartmentList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست دپارتمان‌ها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
