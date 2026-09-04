using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.User.Dto;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.User.Query
{
    public class GetUserListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? FullName { get; set; }
        public int? PersonelCode { get; set; }
        public int? DepartmentId { get; set; }
        public int? TeamId { get; set; }
        public bool? IsActive { get; set; }
    }

    public class GetUserListQueryHandler : IRequestHandler<GetUserListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetUserListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetUserListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrEmpty(request.FullName))
            {
                query = query.Where(x =>
                    x.FirstName.Contains(request.FullName) ||
                    x.LastName.Contains(request.FullName));
            }

            if (request.DepartmentId.HasValue)
            {
                query = query.Where(x => x.DepartmentId == request.DepartmentId.Value);
            }

            if (request.PersonelCode.HasValue)
            {
                query = query.Where(x => x.PersonelCode == request.PersonelCode.Value);
            }

            if (request.TeamId.HasValue)
            {
                query = query.Where(x => x.TeamId == request.TeamId.Value);
            }

            if (request.IsActive.HasValue)
            {
                query = query.Where(x => x.IsActive == request.IsActive.Value);
            }

            var paged = await query.Select(x => new UserListDto
            {
                Id = x.Id,
                FirstName = x.FirstName,
                LastName = x.LastName,
                Username = x.Username,
                PersonelCode = x.PersonelCode,
                DepartmentId = x.DepartmentId,
                DepartmentName = x.Department.Name,
                TeamId = x.TeamId,
                TeamName = x.Team != null ? x.Team.Name : null,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                UserList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست کارمندان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
