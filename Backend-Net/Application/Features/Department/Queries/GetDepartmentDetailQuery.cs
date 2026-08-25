using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Department.Dtos;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Department.Queries
{
    public class GetDepartmentDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetDepartmentDetailQueryHandler : IRequestHandler<GetDepartmentDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetDepartmentDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetDepartmentDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var dto = await _context.Departments
                .Where(x => x.Id == request.Id)
                .Select(x => new DepartmentDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    HeadId = x.HeadId,
                    HeadName = x.Head != null ? x.Head.FirstName + " " + x.Head.LastName : null
                })
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("دپارتمان مورد نظر یافت نشد.");

            res.Data = dto;
            res.Message = "اطلاعات دپارتمان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
