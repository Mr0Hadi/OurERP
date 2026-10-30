using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.User.Query
{
    /// <summary>
    /// Every user's id and display name, for "seller", "purchaser" and "recorded by" filters (frontend-requests 21.4). Open to
    /// every signed-in user: it is what any document already shows next to a name, unlike GetUserList (UserView), which
    /// carries placement, roles and contact details. Not paged; active users first.
    /// </summary>
    public class GetUserOptionsQuery : IRequest<ResponseDto>
    {
        /// <summary>False (default) = active users only; true = deactivated ones too, for filtering old documents.</summary>
        public bool IncludeInactive { get; set; }
    }

    public class UserOptionDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class GetUserOptionsQueryHandler : IRequestHandler<GetUserOptionsQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetUserOptionsQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetUserOptionsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Users.AsQueryable();
            if (!request.IncludeInactive)
                query = query.Where(x => x.IsActive);

            res.Data = await query
                .OrderByDescending(x => x.IsActive)
                .ThenBy(x => x.FirstName)
                .ThenBy(x => x.LastName)
                .ThenBy(x => x.Id)
                .Select(x => new UserOptionDto { Id = x.Id, FullName = x.FirstName + " " + x.LastName, IsActive = x.IsActive })
                .ToListAsync(cancellationToken);
            res.Message = "لیست کاربران با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
