using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Team.Dtos;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Team.Queries
{
    public class GetTeamDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetTeamDetailQueryHandler : IRequestHandler<GetTeamDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetTeamDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetTeamDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var dto = await _context.Teams
                .Where(x => x.Id == request.Id)
                .Select(x => new TeamDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    DepartmentId = x.DepartmentId,
                    DepartmentName = x.Department.Name,
                    HeadId = x.HeadId,
                    HeadName = x.Head != null ? x.Head.FirstName + " " + x.Head.LastName : null
                })
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("تیم مورد نظر یافت نشد.");

            res.Data = dto;
            res.Message = "اطلاعات تیم با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
