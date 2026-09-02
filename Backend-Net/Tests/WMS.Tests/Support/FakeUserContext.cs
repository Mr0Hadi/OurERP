using Application.Common.Contracts.UserContextService;
using NSubstitute;

namespace WMS.Tests.Support
{
    public static class FakeUserContext
    {
        public static IUserContextService WithUserId(int userId = 1)
        {
            var userContext = Substitute.For<IUserContextService>();
            userContext.GetUserId().Returns(userId.ToString());
            return userContext;
        }
    }
}
