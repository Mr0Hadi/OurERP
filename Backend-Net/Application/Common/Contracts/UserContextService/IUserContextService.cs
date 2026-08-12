using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Common.Contracts.UserContextService
{
    public interface IUserContextService
    {
        string? GetUserId();
        string? GetAccessToken();
        bool IsAdmin();
    }
}
