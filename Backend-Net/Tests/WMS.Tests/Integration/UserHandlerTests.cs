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
        public async Task CreateUser_UnknownDepartment_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "newuser",
                Password = "Test@1234",
                PersonelCode = "1001",
                DepartmentId = 999,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateUser_UnknownTeam_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            scope.Context.Departments.Add(department);
            scope.Context.SaveChanges();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "newuser",
                Password = "Test@1234",
                PersonelCode = "1001",
                DepartmentId = department.Id,
                TeamId = 999,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateUser_TeamBelongsToDifferentDepartment_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var otherDepartment = Seed.Department("واحد دیگر");
            var team = Seed.Team(otherDepartment);
            scope.Context.Departments.AddRange(department, otherDepartment);
            scope.Context.Teams.Add(team);
            scope.Context.SaveChanges();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "newuser",
                Password = "Test@1234",
                PersonelCode = "1001",
                DepartmentId = department.Id,
                TeamId = team.Id,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateUser_DuplicateUsername_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var existing = Seed.User(department, team, username: "taken");
            scope.Context.Users.Add(existing);
            scope.Context.SaveChanges();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "taken",
                Password = "Test@1234",
                PersonelCode = "1002",
                DepartmentId = department.Id,
                TeamId = team.Id,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateUser_ValidDepartmentAndTeam_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            scope.Context.Departments.Add(department);
            scope.Context.Teams.Add(team);
            scope.Context.SaveChanges();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork, TestMapper.Instance);

            await handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "brandnew",
                Password = "Test@1234",
                PersonelCode = "1003",
                DepartmentId = department.Id,
                TeamId = team.Id,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var created = verify.Users.Single(x => x.Username == "brandnew");
            Assert.Equal(team.Id, created.TeamId);
            Assert.Equal(department.Id, created.DepartmentId);
        }

        [Fact]
        public async Task CreateUser_DepartmentOnlyNoTeam_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            scope.Context.Departments.Add(department);
            scope.Context.SaveChanges();

            var handler = new CreateUserCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork, TestMapper.Instance);

            await handler.Handle(new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "departmenthead",
                Password = "Test@1234",
                PersonelCode = "1004",
                DepartmentId = department.Id,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var created = verify.Users.Single(x => x.Username == "departmenthead");
            Assert.Null(created.TeamId);
            Assert.Equal(department.Id, created.DepartmentId);
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
            });

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task UpdateUser_DuplicateUsernameOnAnotherUser_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user1 = Seed.User(department, team, username: "user1");
            var user2 = Seed.User(department, team, username: "user2");
            scope.Context.Users.AddRange(user1, user2);
            scope.Context.SaveChanges();

            var handler = new UpdateUserCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UpdateUserCommand
            {
                Id = user2.Id,
                FirstName = "کاربر",
                LastName = "تست",
                Username = "user1", // already taken by user1
                DepartmentId = department.Id,
                TeamId = team.Id,
                IsActive = true,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdateUser_SameUsernameOnSameUser_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team, username: "same");
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new UpdateUserCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork);
            await handler.Handle(new UpdateUserCommand
            {
                Id = user.Id,
                FirstName = "جدید",
                LastName = "تست",
                Username = "same",
                DepartmentId = department.Id,
                TeamId = team.Id,
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
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
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
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team, password: "Correct@1234");
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
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team, password: "Correct@1234");
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
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
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
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
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

        [Fact]
        public async Task ChangeUserTeam_MakesUserHead_SetsTeamHeadAndDepartment()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var oldTeam = Seed.Team(department, "تیم قدیم");
            var newTeam = Seed.Team(department, "تیم جدید");
            var user = Seed.User(department, oldTeam);
            scope.Context.Teams.AddRange(oldTeam, newTeam);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new ChangeUserTeamCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork);
            await handler.Handle(new ChangeUserTeamCommand
            {
                UserId = user.Id,
                DepartmentId = department.Id,
                TeamId = newTeam.Id,
                IsHead = true,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var updatedUser = verify.Users.Single(x => x.Id == user.Id);
            var updatedNewTeam = verify.Teams.Single(x => x.Id == newTeam.Id);
            Assert.Equal(newTeam.Id, updatedUser.TeamId);
            Assert.Equal(department.Id, updatedUser.DepartmentId);
            Assert.Equal(user.Id, updatedNewTeam.HeadId);
        }

        [Fact]
        public async Task ChangeUserTeam_MovingAwayFromHeadTeam_ClearsPreviousTeamHead()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var oldTeam = Seed.Team(department, "تیم قدیم");
            var newTeam = Seed.Team(department, "تیم جدید");
            var user = Seed.User(department, oldTeam);
            scope.Context.Teams.AddRange(oldTeam, newTeam);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            oldTeam.HeadId = user.Id;
            scope.Context.SaveChanges();

            var handler = new ChangeUserTeamCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork);
            await handler.Handle(new ChangeUserTeamCommand
            {
                UserId = user.Id,
                DepartmentId = department.Id,
                TeamId = newTeam.Id,
                IsHead = false,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var updatedOldTeam = verify.Teams.Single(x => x.Id == oldTeam.Id);
            var updatedNewTeam = verify.Teams.Single(x => x.Id == newTeam.Id);
            Assert.Null(updatedOldTeam.HeadId);
            Assert.NotEqual(user.Id, updatedNewTeam.HeadId);
        }

        [Fact]
        public async Task ChangeUserTeam_UnknownTeam_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            var handler = new ChangeUserTeamCommandHandler(scope.UserRepository, scope.DepartmentRepository, scope.TeamRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new ChangeUserTeamCommand
            {
                UserId = user.Id,
                DepartmentId = department.Id,
                TeamId = 999,
                IsHead = false,
            }, CancellationToken.None));
        }
    }
}
