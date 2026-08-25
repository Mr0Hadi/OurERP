using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PosTerminal.Dtos;
using Common.Extensions;
using MediatR;

namespace Application.Features.PosTerminal.Queries
{
    public class GetPosTerminalListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Name { get; set; }
    }

    public class GetPosTerminalListQueryHandler : IRequestHandler<GetPosTerminalListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetPosTerminalListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetPosTerminalListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.PosTerminals.Where(x => x.IsActive).AsQueryable();

            if (!string.IsNullOrEmpty(request.Name))
            {
                query = query.Where(x => x.Name.Contains(request.Name));
            }

            var paged = await query.Select(x => new PosTerminalListDto
            {
                Id = x.Id,
                Name = x.Name,
                Vendor = x.Vendor,
                Host = x.Host,
                Port = x.Port
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                PosTerminalList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست دستگاه‌های کارتخوان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
