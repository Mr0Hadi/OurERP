using Application.Common.Contracts.Token;
using Application.Common.Dtos;
using Application.Features.Account.Command;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class AccountHandlerTests
    {
        private static IConfiguration MakeConfiguration() => TestSessions.Configuration;

        private static LoginUserCommandHandler LoginHandler(TestScope scope, IUserSessionService? sessions = null)
            => new(scope.UserRepository, sessions ?? TestSessions.Create(), scope.UnitOfWork, MakeConfiguration());

        private static Domain.Entities.User SeedUser(TestScope scope, string username = "tester", string password = "Correct@1234")
        {
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team, username, password);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();
            return user;
        }

        [Fact]
        public async Task Login_UnknownUsername_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            await Assert.ThrowsAsync<NotFoundCustomException>(() => LoginHandler(scope).Handle(new LoginUserCommand { Username = "nobody", Password = "x" }, CancellationToken.None));
        }

        [Fact]
        public async Task Login_WrongPassword_ThrowsNotFound_AndCountsTheFailure()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => LoginHandler(scope).Handle(new LoginUserCommand { Username = user.Username, Password = "Wrong@1234" }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Equal(1, verify.Users.Single(x => x.Id == user.Id).FailedLoginCount);
        }

        [Fact]
        public async Task Login_InactiveUser_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.IsActive = false;
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => LoginHandler(scope).Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None));
        }

        [Fact]
        public async Task Login_ValidCredentials_IssuesTokenAndStoresRefreshToken()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            var sessions = TestSessions.Create();

            var res = await LoginHandler(scope, sessions).Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None);

            var data = Assert.IsType<TokenDto>(res.Data);
            Assert.False(data.MustChangePassword);
            Assert.True(sessions.IsCurrent(user.Id, data.AccessToken));

            using var verify = db.NewContext();
            Assert.Equal(data.RefreshToken, verify.Users.Single(x => x.Id == user.Id).RefreshToken);
        }

        [Fact]
        public async Task Login_Twice_TheSecondLoginEndsTheFirstSession()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            var sessions = TestSessions.Create();
            var handler = LoginHandler(scope, sessions);

            var first = Assert.IsType<TokenDto>((await handler.Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None)).Data);
            var second = Assert.IsType<TokenDto>((await handler.Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None)).Data);

            Assert.False(sessions.IsCurrent(user.Id, first.AccessToken));
            Assert.True(sessions.IsCurrent(user.Id, second.AccessToken));
        }

        [Fact]
        public async Task Login_TenthWrongPassword_LocksTheAccount_AndEvenTheRightPasswordIsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            var handler = LoginHandler(scope);
            var wrong = new LoginUserCommand { Username = user.Username, Password = "Wrong@1234" };

            for (var i = 0; i < LoginUserCommandHandler.DefaultMaxFailedAttempts - 1; i++)
                await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(wrong, CancellationToken.None));

            var locked = await Assert.ThrowsAsync<TooManyRequestsCustomException>(() => handler.Handle(wrong, CancellationToken.None));
            Assert.Equal(429, locked.StatusCode);
            Assert.Contains("قفل", locked.Error);

            await Assert.ThrowsAsync<TooManyRequestsCustomException>(() => handler.Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None));

            using var verify = db.NewContext();
            var stored = verify.Users.Single(x => x.Id == user.Id);
            Assert.NotNull(stored.LockoutEnd);
            Assert.True(stored.LockoutEnd > DateTime.Now.AddMinutes(LoginUserCommandHandler.DefaultLockoutMinutes - 1));
        }

        [Fact]
        public async Task Login_FewAttemptsLeft_WarnsHowManyRemain()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.FailedLoginCount = LoginUserCommandHandler.DefaultMaxFailedAttempts - 3;
            scope.Context.SaveChanges();

            var ex = await Assert.ThrowsAsync<NotFoundCustomException>(() => LoginHandler(scope).Handle(new LoginUserCommand { Username = user.Username, Password = "Wrong@1234" }, CancellationToken.None));

            Assert.Contains("2 بار دیگر", ex.Error);
        }

        [Fact]
        public async Task Login_AfterTheLockoutExpires_SucceedsAndClearsTheCounter()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.FailedLoginCount = 4;
            user.LockoutEnd = DateTime.Now.AddSeconds(-1);
            scope.Context.SaveChanges();

            await LoginHandler(scope).Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None);

            using var verify = db.NewContext();
            var stored = verify.Users.Single(x => x.Id == user.Id);
            Assert.Equal(0, stored.FailedLoginCount);
            Assert.Null(stored.LockoutEnd);
        }

        [Fact]
        public async Task Login_AfterAPasswordReset_TellsTheClientToChangeIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.MustChangePassword = true;
            scope.Context.SaveChanges();

            var tokenService = TestSessions.CountingTokenService();
            var res = await LoginHandler(scope, TestSessions.Create(tokenService)).Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None);

            Assert.True(Assert.IsType<TokenDto>(res.Data).MustChangePassword);
            await tokenService.Received().SetTokenAsync(Arg.Is<Application.Features.User.Dto.TokenUserInfoDto>(x => x.MustChangePassword));
        }

        [Fact]
        public async Task Logout_EndsTheSessionAndClearsTheRefreshToken()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            var sessions = TestSessions.Create();
            var tokens = Assert.IsType<TokenDto>((await LoginHandler(scope, sessions).Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None)).Data);

            var handler = new LogoutUserCommandHandler(sessions, FakeUserContext.WithUserId(user.Id), scope.UserRepository, scope.UnitOfWork);
            await handler.Handle(new LogoutUserCommand(), CancellationToken.None);

            Assert.False(sessions.IsCurrent(user.Id, tokens.AccessToken));
            using var verify = db.NewContext();
            Assert.Null(verify.Users.Single(x => x.Id == user.Id).RefreshToken);
        }

        [Fact]
        public async Task LogoutUserById_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new LogoutUserByIdCommandHandler(TestSessions.Create(), scope.PermissionService, FakeUserContext.WithUserId(1), scope.UserRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new LogoutUserByIdCommand { UserId = 999 }, CancellationToken.None));
        }

        [Fact]
        public async Task LogoutUserById_ExistingUser_ClearsAndPersistsRefreshToken()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.RefreshToken = "some-refresh-token";
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(30);
            scope.Context.SaveChanges();

            var handler = new LogoutUserByIdCommandHandler(TestSessions.Create(), scope.PermissionService, FakeUserContext.WithUserId(user.Id + 1000), scope.UserRepository, scope.UnitOfWork);
            await handler.Handle(new LogoutUserByIdCommand { UserId = user.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            var updated = verify.Users.Single(x => x.Id == user.Id);
            Assert.Null(updated.RefreshToken);
            Assert.Null(updated.ExpireRefreshToken);
        }

        [Fact]
        public async Task LogoutUserById_TargetHoldsAPermissionTheActorLacks_IsForbidden()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var actor = SeedUser(scope, "actor");
            var admin = SeedUser(scope, "admin");
            Seed.GrantAllPermissions(scope.Context, admin.Id);
            scope.Context.UserPermissions.Add(new Domain.Entities.UserPermission { UserId = actor.Id, Permission = PermissionEnum.UserUpdate, GrantedAt = DateTime.Now });
            scope.Context.SaveChanges();

            var handler = new LogoutUserByIdCommandHandler(TestSessions.Create(), scope.PermissionService, FakeUserContext.WithUserId(actor.Id), scope.UserRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<ForbiddenCustomException>(() => handler.Handle(new LogoutUserByIdCommand { UserId = admin.Id }, CancellationToken.None));
        }

        [Fact]
        public async Task UserRefreshToken_TokenNotExpiredYet_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            var sessions = TestSessions.Create();
            var tokens = await sessions.IssueAsync(user);

            var tokenService = Substitute.For<ITokenService>();
            tokenService.GetTokenInfo(tokens.AccessToken).Returns(new TokenInfoDto { Id = user.Id.ToString(), IsExpired = false, Username = user.Username });

            // Still the current session - refreshing it early is pointless.
            var handler = new UserRefreshTokenCommandHandler(tokenService, sessions, scope.UserRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UserRefreshTokenCommand { AccessToken = tokens.AccessToken, RefreshToken = tokens.RefreshToken }, CancellationToken.None));
        }

        [Fact]
        public async Task UserRefreshToken_NotExpiredButUnknownToServer_IssuesNewToken()
        {
            // After a restart no session is current: CachingMiddleware rejects the still-unexpired
            // token, so refusing to refresh it would lock the user out for good.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.RefreshToken = "the-real-refresh-token";
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(30);
            scope.Context.SaveChanges();

            var tokenService = TestSessions.CountingTokenService();
            tokenService.GetTokenInfo("live-access-token").Returns(new TokenInfoDto { Id = user.Id.ToString(), IsExpired = false, Username = user.Username });
            var sessions = TestSessions.Create(tokenService);

            var handler = new UserRefreshTokenCommandHandler(tokenService, sessions, scope.UserRepository, scope.UnitOfWork);
            var res = await handler.Handle(new UserRefreshTokenCommand { AccessToken = "live-access-token", RefreshToken = "the-real-refresh-token" }, CancellationToken.None);

            var data = Assert.IsType<TokenDto>(res.Data);
            Assert.True(sessions.IsCurrent(user.Id, data.AccessToken));
        }

        [Fact]
        public async Task UserRefreshToken_InvalidAccessToken_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var tokenService = Substitute.For<ITokenService>();
            tokenService.GetTokenInfo("bad-token").Returns((TokenInfoDto?)null);

            var handler = new UserRefreshTokenCommandHandler(tokenService, TestSessions.Create(), scope.UserRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UserRefreshTokenCommand { AccessToken = "bad-token", RefreshToken = "refresh-token" }, CancellationToken.None));
        }

        [Fact]
        public async Task UserRefreshToken_MismatchedRefreshToken_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.RefreshToken = "the-real-refresh-token";
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(30);
            scope.Context.SaveChanges();

            var tokenService = Substitute.For<ITokenService>();
            tokenService.GetTokenInfo("expired-access-token").Returns(new TokenInfoDto { Id = user.Id.ToString(), IsExpired = true, Username = user.Username });

            var handler = new UserRefreshTokenCommandHandler(tokenService, TestSessions.Create(), scope.UserRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UserRefreshTokenCommand { AccessToken = "expired-access-token", RefreshToken = "wrong-refresh-token" }, CancellationToken.None));
        }

        [Fact]
        public async Task UserRefreshToken_AfterLogout_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.RefreshToken = null;
            user.ExpireRefreshToken = null;
            scope.Context.SaveChanges();

            var tokenService = Substitute.For<ITokenService>();
            tokenService.GetTokenInfo("old-access-token").Returns(new TokenInfoDto { Id = user.Id.ToString(), IsExpired = true, Username = user.Username });

            var handler = new UserRefreshTokenCommandHandler(tokenService, TestSessions.Create(), scope.UserRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UserRefreshTokenCommand { AccessToken = "old-access-token", RefreshToken = "anything" }, CancellationToken.None));
        }

        [Fact]
        public async Task UserRefreshToken_ValidExpiredAccessTokenAndMatchingRefreshToken_IssuesNewToken()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = SeedUser(scope);
            user.RefreshToken = "the-real-refresh-token";
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(30);
            scope.Context.SaveChanges();

            var tokenService = TestSessions.CountingTokenService();
            tokenService.GetTokenInfo("expired-access-token").Returns(new TokenInfoDto { Id = user.Id.ToString(), IsExpired = true, Username = user.Username });

            var handler = new UserRefreshTokenCommandHandler(tokenService, TestSessions.Create(tokenService), scope.UserRepository, scope.UnitOfWork);
            var res = await handler.Handle(new UserRefreshTokenCommand { AccessToken = "expired-access-token", RefreshToken = "the-real-refresh-token" }, CancellationToken.None);

            var data = Assert.IsType<TokenDto>(res.Data);

            using var verify = db.NewContext();
            Assert.Equal(data.RefreshToken, verify.Users.Single(x => x.Id == user.Id).RefreshToken);
        }
    }
}
