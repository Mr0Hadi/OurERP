using Application.Common.Contracts.Context;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.User.Query
{
    /// <summary>
    /// The signed-in user's dashboard layout, as the frontend saved it (frontend-requests 6.3): an opaque JSON string the
    /// server never interprets, or null when none was saved.
    /// </summary>
    public class GetMyDashboardLayoutQuery : IRequest<ResponseDto>
    {
    }

    public class GetMyDashboardLayoutQueryHandler : IRequestHandler<GetMyDashboardLayoutQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUserContextService _userContextService;

        public GetMyDashboardLayoutQueryHandler(IWMSDbContext context, IUserContextService userContextService)
        {
            _context = context;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(GetMyDashboardLayoutQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            if (!int.TryParse(_userContextService.GetUserId(), out var userId))
                throw new UnauthorizedCustomException("کاربر شناسایی نشد.");

            res.Data = new
            {
                Layout = await _context.Users.Where(x => x.Id == userId).Select(x => x.DashboardLayout).FirstOrDefaultAsync(cancellationToken),
            };
            res.Message = "چیدمان داشبورد با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
