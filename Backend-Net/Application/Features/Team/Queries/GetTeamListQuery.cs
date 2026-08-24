using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Team.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Team.Queries
{
    public class GetTeamListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Name { get; set; }
        public int? DepartmentId { get; set; }
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
            var query = _context.Teams.AsQueryable();

            if (!string.IsNullOrEmpty(request.Name))
            {
                query = query.Where(x => x.Name.Contains(request.Name));
            }

            if (request.DepartmentId.HasValue)
            {
                query = query.Where(x => x.DepartmentId == request.DepartmentId.Value);
            }

            var paged = await query.Select(x => new TeamListDto
            {
                Id = x.Id,
                Name = x.Name,
                DepartmentName = x.Department.Name,
                HeadName = x.Head != null ? x.Head.FirstName + " " + x.Head.LastName : null,
                UserCount = x.Users.Count
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

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
