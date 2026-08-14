using Application.Common.Contracts.UserContextService;
using Application.Features.User.Command;
using Application.Features.User.Dto;
using Application.Features.User.Query;
using Common.Exceptions;
using Common.Extensions;
using NSubstitute;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class UserHandlerTests
    {
        [Fact]
        public async Task CreateUser_UnknownRole_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.RoleRepository, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "newuser",
                Password = "Test@1234",
                PersonelCode = "1001",
                RoleId = 999,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateUser_DuplicateUsername_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var existing = Seed.User(role, department, team, username: "taken");
            scope.Context.Users.Add(existing);
            scope.Context.SaveChanges();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.RoleRepository, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "taken",
                Password = "Test@1234",
                PersonelCode = "1002",
                RoleId = role.Id,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateUser_StillThrows_BecauseCommandNeverCollectsDepartmentOrTeam()
        {
            // FisrtName->FirstName mapping and PersonelCode are both fixed and covered by
            // CreateUser_MissingPersonelCode_FailsValidation / MappingProfileTests. This handler
            // still can't succeed end-to-end though: User.DepartmentId/TeamId are required
            // (non-nullable, no default) FKs that CreateUserCommand has no properties for, so they
            // map to 0 and SaveChanges fails on the FK constraint. Same class of gap as
            // PersonelCode was, left undecided here since it's the same "what should the API
            // contract collect" product question, out of scope for this pass.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            scope.Context.Roles.Add(role);
            scope.Context.SaveChanges();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.RoleRepository, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<Microsoft.EntityFrameworkCore.DbUpdateException>(() => handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "brandnew",
                Password = "Test@1234",
                PersonelCode = "1003",
                RoleId = role.Id,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateUser_MissingPersonelCode_FailsValidation()
        {
            var validator = new CreateUserCommandValidator();

            var result = validator.Validate(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "brandnew",
                Password = "Test@1234",
                PersonelCode = "",
                RoleId = 1,
            });

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task UpdateUser_DuplicateUsernameOnAnotherUser_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user1 = Seed.User(role, department, team, username: "user1");
            var user2 = Seed.User(role, department, team, username: "user2");
            scope.Context.Users.AddRange(user1, user2);
            scope.Context.SaveChanges();

            var handler = new UpdateUserCommandHandler(scope.UserRepository, scope.RoleRepository, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UpdateUserCommand
            {
                Id = user2.Id,
                FirstName = "کاربر",
                LastName = "تست",
                Username = "user1", // already taken by user1
                RoleId = role.Id,
                IsActive = true,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdateUser_SameUsernameOnSameUser_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(role, department, team, username: "same");
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new UpdateUserCommandHandler(scope.UserRepository, scope.RoleRepository, scope.UnitOfWork, TestMapper.Instance);
            await handler.Handle(new UpdateUserCommand
            {
                Id = user.Id,
                FirstName = "جدید",
                LastName = "تست",
                Username = "same",
                RoleId = role.Id,
                IsActive = false,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var updated = verify.Users.Single(x => x.Id == user.Id);
            Assert.Equal("جدید", updated.FirstName);
            Assert.False(updated.IsActive);
        }

        [Fact]
        public async Task DeleteUser_SetsIsActiveFalse()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(role, department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new DeleteUserCommandHandler(scope.UserRepository, scope.UnitOfWork);
            await handler.Handle(new DeleteUserCommand { Id = user.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.Users.Single(x => x.Id == user.Id).IsActive);
        }

        [Fact]
        public async Task ChangePassword_WrongOldPassword_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(role, department, team, password: "Correct@1234");
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var userContext = Substitute.For<IUserContextService>();
            userContext.GetUserId().Returns(user.Id.ToString());

            var handler = new ChangePasswordCommandHandler(scope.UserRepository, userContext, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ChangePasswordCommand
            {
                OldPassword = "Wrong@1234",
                Password = "New@12345",
                RePassword = "New@12345",
            }, CancellationToken.None));
        }

        [Fact]
        public async Task ChangePassword_CorrectOldPassword_UpdatesHash()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(role, department, team, password: "Correct@1234");
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var userContext = Substitute.For<IUserContextService>();
            userContext.GetUserId().Returns(user.Id.ToString());

            var handler = new ChangePasswordCommandHandler(scope.UserRepository, userContext, scope.UnitOfWork);
            await handler.Handle(new ChangePasswordCommand
            {
                OldPassword = "Correct@1234",
                Password = "New@12345",
                RePassword = "New@12345",
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal("New@12345".ToHashSHA256(), verify.Users.Single(x => x.Id == user.Id).PasswordHash);
        }

        [Fact]
        public async Task UpdateUserInfo_UpdatesNamesForCurrentUser()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(role, department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var userContext = Substitute.For<IUserContextService>();
            userContext.GetUserId().Returns(user.Id.ToString());

            var handler = new UpdateUserInfoCommandHandler(scope.UserRepository, scope.UnitOfWork, userContext);
            await handler.Handle(new UpdateUserInfoCommand { FirstName = "نام جدید", LastName = "فامیل جدید" }, CancellationToken.None);

            using var verify = db.NewContext();
            var updated = verify.Users.Single(x => x.Id == user.Id);
            Assert.Equal("نام جدید", updated.FirstName);
        }

        [Fact]
        public async Task GetUserInfo_ReturnsCurrentUserDto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var role = Seed.Role();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(role, department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var userContext = Substitute.For<IUserContextService>();
            userContext.GetUserId().Returns(user.Id.ToString());

            var handler = new GetUserInfoQueryHandler(userContext, scope.UserRepository, TestMapper.Instance);
            var res = await handler.Handle(new GetUserInfoQuery(), CancellationToken.None);

            var dto = Assert.IsType<UserInfoDto>(res.Data);
            Assert.Equal(user.Username, dto.Username);
        }

        [Fact]
        public async Task GetUserUpdate_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new GetUserUpdateQueryHandler(scope.UserRepository, TestMapper.Instance);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new GetUserUpdateQuery { Id = 999 }, CancellationToken.None));
        }
    }
}
