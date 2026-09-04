using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Department.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Department.Queries
{
    public class GetDepartmentListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Name { get; set; }
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
            var query = _context.Departments.Where(x => x.IsActive).AsQueryable();

            if (!string.IsNullOrEmpty(request.Name))
            {
                query = query.Where(x => x.Name.Contains(request.Name));
            }

            var paged = await query.Select(x => new DepartmentListDto
            {
                Id = x.Id,
                Name = x.Name,
                HeadName = x.Head != null ? x.Head.FirstName + " " + x.Head.LastName : null,
                DeputyName = x.Deputy != null ? x.Deputy.FirstName + " " + x.Deputy.LastName : null,
                TeamCount = x.Teams.Count,
                UserCount = x.Users.Count
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

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
