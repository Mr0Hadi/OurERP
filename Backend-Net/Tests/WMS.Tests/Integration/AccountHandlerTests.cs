using Application.Common.Contracts.Environment;
using Application.Common.Contracts.Token;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Features.Account.Command;
using Common.Exceptions;
using Common.Extensions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class AccountHandlerTests
    {
        private static IConfiguration MakeConfiguration() => new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:RefreshTokenDurationInMinutes"] = "120",
            })
            .Build();

        [Fact]
        public async Task Login_UnknownUsername_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new LoginUserCommandHandler(
                scope.UserRepository, Substitute.For<ITokenService>(), scope.UnitOfWork, MakeConfiguration(),
                new MemoryCache(new MemoryCacheOptions()), TestMapper.Instance, Substitute.For<IEnvironmentService>());

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new LoginUserCommand { Username = "nobody", Password = "x" }, CancellationToken.None));
        }

        [Fact]
        public async Task Login_WrongPassword_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team, password: "Correct@1234");
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new LoginUserCommandHandler(
                scope.UserRepository, Substitute.For<ITokenService>(), scope.UnitOfWork, MakeConfiguration(),
                new MemoryCache(new MemoryCacheOptions()), TestMapper.Instance, Substitute.For<IEnvironmentService>());

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new LoginUserCommand { Username = user.Username, Password = "Wrong@1234" }, CancellationToken.None));
        }

        [Fact]
        public async Task Login_InactiveUser_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team, password: "Correct@1234");
            user.IsActive = false;
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new LoginUserCommandHandler(
                scope.UserRepository, Substitute.For<ITokenService>(), scope.UnitOfWork, MakeConfiguration(),
                new MemoryCache(new MemoryCacheOptions()), TestMapper.Instance, Substitute.For<IEnvironmentService>());

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None));
        }

        [Fact]
        public async Task Login_ValidCredentials_IssuesTokenAndStoresRefreshToken()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team, password: "Correct@1234");
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var tokenService = Substitute.For<ITokenService>();
            tokenService.SetTokenAsync(Arg.Any<Application.Features.User.Dto.TokenUserInfoDto>())
                .Returns(new TokenDto { AccessToken = "access-token", RefreshToken = "refresh-token" });

            var handler = new LoginUserCommandHandler(
                scope.UserRepository, tokenService, scope.UnitOfWork, MakeConfiguration(),
                new MemoryCache(new MemoryCacheOptions()), TestMapper.Instance, Substitute.For<IEnvironmentService>());

            var res = await handler.Handle(new LoginUserCommand { Username = user.Username, Password = "Correct@1234" }, CancellationToken.None);

            var data = Assert.IsType<TokenDto>(res.Data);
            Assert.Equal("access-token", data.AccessToken);

            using var verify = db.NewContext();
            Assert.Equal("refresh-token", verify.Users.Single(x => x.Id == user.Id).RefreshToken);
        }

        [Fact]
        public async Task LogoutUserById_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new LogoutUserByIdCommandHandler(new MemoryCache(new MemoryCacheOptions()), scope.UserRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new LogoutUserByIdCommand { UserId = 999 }, CancellationToken.None));
        }

        [Fact]
        public async Task LogoutUserById_ExistingUser_ClearsAndPersistsRefreshToken()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            user.RefreshToken = "some-refresh-token";
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(30);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new LogoutUserByIdCommandHandler(new MemoryCache(new MemoryCacheOptions()), scope.UserRepository, scope.UnitOfWork);
            await handler.Handle(new LogoutUserByIdCommand { UserId = user.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            var updated = verify.Users.Single(x => x.Id == user.Id);
            Assert.Null(updated.RefreshToken);
            Assert.Null(updated.ExpireRefreshToken);
        }

        [Fact]
        public async Task ForgetPassword_UnknownUsername_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new ForgetPasswordCommandHandler(scope.UserRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new ForgetPasswordCommand { Username = "nobody", Password = "New@1234", RePassword = "New@1234" }, CancellationToken.None));
        }

        [Fact]
        public async Task ForgetPassword_KnownUsername_UpdatesPasswordHash()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team, password: "Old@1234");
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new ForgetPasswordCommandHandler(scope.UserRepository, scope.UnitOfWork);
            await handler.Handle(new ForgetPasswordCommand { Username = user.Username, Password = "New@12345", RePassword = "New@12345" }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal("New@12345".ToHashSHA256(), verify.Users.Single(x => x.Id == user.Id).PasswordHash);
        }

        [Fact]
        public async Task UserRefreshToken_TokenNotExpiredYet_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var tokenService = Substitute.For<ITokenService>();
            tokenService.GetTokenInfo("access-token").Returns(new TokenInfoDto { Id = "1", IsExpired = false, Username = "x" });

            var handler = new UserRefreshTokenCommandHandler(MakeConfiguration(), tokenService, scope.UserRepository, scope.UnitOfWork, TestMapper.Instance, new MemoryCache(new MemoryCacheOptions()));

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UserRefreshTokenCommand { AccessToken = "access-token", RefreshToken = "refresh-token" }, CancellationToken.None));
        }

        [Fact]
        public async Task UserRefreshToken_InvalidAccessToken_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var tokenService = Substitute.For<ITokenService>();
            tokenService.GetTokenInfo("bad-token").Returns((TokenInfoDto?)null);

            var handler = new UserRefreshTokenCommandHandler(MakeConfiguration(), tokenService, scope.UserRepository, scope.UnitOfWork, TestMapper.Instance, new MemoryCache(new MemoryCacheOptions()));

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UserRefreshTokenCommand { AccessToken = "bad-token", RefreshToken = "refresh-token" }, CancellationToken.None));
        }

        [Fact]
        public async Task UserRefreshToken_MismatchedRefreshToken_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            user.RefreshToken = "the-real-refresh-token";
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(30);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var tokenService = Substitute.For<ITokenService>();
            tokenService.GetTokenInfo("expired-access-token").Returns(new TokenInfoDto { Id = user.Id.ToString(), IsExpired = true, Username = user.Username });

            var handler = new UserRefreshTokenCommandHandler(MakeConfiguration(), tokenService, scope.UserRepository, scope.UnitOfWork, TestMapper.Instance, new MemoryCache(new MemoryCacheOptions()));

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UserRefreshTokenCommand { AccessToken = "expired-access-token", RefreshToken = "wrong-refresh-token" }, CancellationToken.None));
        }

        [Fact]
        public async Task UserRefreshToken_ValidExpiredAccessTokenAndMatchingRefreshToken_IssuesNewToken()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            user.RefreshToken = "the-real-refresh-token";
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(30);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var tokenService = Substitute.For<ITokenService>();
            tokenService.GetTokenInfo("expired-access-token").Returns(new TokenInfoDto { Id = user.Id.ToString(), IsExpired = true, Username = user.Username });
            tokenService.SetTokenAsync(Arg.Any<Application.Features.User.Dto.TokenUserInfoDto>())
                .Returns(new TokenDto { AccessToken = "new-access-token", RefreshToken = "new-refresh-token" });

            var handler = new UserRefreshTokenCommandHandler(MakeConfiguration(), tokenService, scope.UserRepository, scope.UnitOfWork, TestMapper.Instance, new MemoryCache(new MemoryCacheOptions()));
            var res = await handler.Handle(new UserRefreshTokenCommand { AccessToken = "expired-access-token", RefreshToken = "the-real-refresh-token" }, CancellationToken.None);

            var data = Assert.IsType<TokenDto>(res.Data);
            Assert.Equal("new-access-token", data.AccessToken);

            using var verify = db.NewContext();
            Assert.Equal("new-refresh-token", verify.Users.Single(x => x.Id == user.Id).RefreshToken);
        }
    }
}
