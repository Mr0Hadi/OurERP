using Application.Common.Dtos;
using Application.Features.User.Command;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Password reset by a manager, the forced change that follows it, session revocation, and the
    /// rule that nobody may act on an account holding a permission they lack.
    /// </summary>
    public class UserSecurityTests
    {
        private sealed record Fixture(Domain.Entities.User Manager, Domain.Entities.User Employee, Domain.Entities.User Admin, Domain.Entities.Department Department, Domain.Entities.Team Team);

        // Manager holds UserUpdate only; employee holds nothing; admin holds everything.
        private static Fixture SeedPeople(TestScope scope)
        {
            var department = Seed.Department();
            var team = Seed.Team(department);
            var manager = Seed.User(department, team, "manager");
            var employee = Seed.User(department, team, "employee", "Old@12345");
            var admin = Seed.User(department, team, "admin");
            scope.Context.Users.AddRange(manager, employee, admin);
            scope.Context.SaveChanges();

            scope.Context.UserPermissions.Add(new Domain.Entities.UserPermission { UserId = manager.Id, Permission = PermissionEnum.UserUpdate, GrantedAt = DateTime.Now });
            scope.Context.SaveChanges();
            Seed.GrantAllPermissions(scope.Context, admin.Id);

            return new Fixture(manager, employee, admin, department, team);
        }

        private static ResetUserPasswordCommandHandler ResetHandler(TestScope scope, int actorId, Infrastructure.Services.UserSessionService? sessions = null)
            => new(scope.UserRepository, scope.PermissionService, FakeUserContext.WithUserId(actorId), sessions ?? TestSessions.Create(), scope.UnitOfWork);

        private static ResetUserPasswordCommand Reset(int userId) => new() { UserId = userId, Password = "Temp@12345", RePassword = "Temp@12345" };

        [Fact]
        public async Task ResetUserPassword_ForcesAChange_EndsTheSession_AndUnlocksTheAccount()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);
            var sessions = TestSessions.Create();
            var employeeTokens = await sessions.IssueAsync(people.Employee);
            people.Employee.FailedLoginCount = 7;
            people.Employee.LockoutEnd = DateTime.Now.AddMinutes(3);
            scope.Context.SaveChanges();

            await ResetHandler(scope, people.Manager.Id, sessions).Handle(Reset(people.Employee.Id), CancellationToken.None);

            Assert.False(sessions.IsCurrent(people.Employee.Id, employeeTokens.AccessToken));

            using var verify = db.NewContext();
            var stored = verify.Users.Single(x => x.Id == people.Employee.Id);
            Assert.Equal("Temp@12345".ToHashSHA256(), stored.PasswordHash);
            Assert.True(stored.MustChangePassword);
            Assert.Null(stored.RefreshToken);
            Assert.Equal(0, stored.FailedLoginCount);
            Assert.Null(stored.LockoutEnd);
        }

        [Fact]
        public async Task ResetUserPassword_OfAnAccountThatCanDoMore_IsForbidden()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);

            await Assert.ThrowsAsync<ForbiddenCustomException>(() => ResetHandler(scope, people.Manager.Id).Handle(Reset(people.Admin.Id), CancellationToken.None));

            using var verify = db.NewContext();
            Assert.False(verify.Users.Single(x => x.Id == people.Admin.Id).MustChangePassword);
        }

        [Fact]
        public async Task ResetUserPassword_TargetDeactivated_StillCountsTheirPermissions()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);
            people.Admin.IsActive = false;
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ForbiddenCustomException>(() => ResetHandler(scope, people.Manager.Id).Handle(Reset(people.Admin.Id), CancellationToken.None));
        }

        [Fact]
        public async Task ChangePassword_ClearsTheForcedChange_AndReplacesTheSession()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);
            people.Employee.MustChangePassword = true;
            scope.Context.SaveChanges();
            var sessions = TestSessions.Create();
            var before = await sessions.IssueAsync(people.Employee);
            scope.Context.SaveChanges();

            var handler = new ChangePasswordCommandHandler(scope.UserRepository, FakeUserContext.WithUserId(people.Employee.Id), sessions, scope.UnitOfWork);
            var res = await handler.Handle(new ChangePasswordCommand { OldPassword = "Old@12345", Password = "New@12345", RePassword = "New@12345" }, CancellationToken.None);

            var after = Assert.IsType<TokenDto>(res.Data);
            Assert.False(after.MustChangePassword);
            Assert.False(sessions.IsCurrent(people.Employee.Id, before.AccessToken));
            Assert.True(sessions.IsCurrent(people.Employee.Id, after.AccessToken));

            using var verify = db.NewContext();
            var stored = verify.Users.Single(x => x.Id == people.Employee.Id);
            Assert.False(stored.MustChangePassword);
            Assert.Equal(after.RefreshToken, stored.RefreshToken);
        }

        [Fact]
        public void ChangePassword_SameAsTheOldOne_IsInvalid()
        {
            var result = new ChangePasswordCommandValidator().Validate(new ChangePasswordCommand { OldPassword = "Same@12345", Password = "Same@12345", RePassword = "Same@12345" });

            Assert.False(result.IsValid);
        }

        private static UpdateUserCommandHandler UpdateHandler(TestScope scope, int actorId, Infrastructure.Services.UserSessionService? sessions = null)
            => new(scope.UserRepository, scope.OrgRoleService, scope.PermissionService, FakeUserContext.WithUserId(actorId), sessions ?? TestSessions.Create(), scope.UnitOfWork);

        private static UpdateUserCommand Update(Domain.Entities.User user, Fixture people, bool isActive) => new()
        {
            Id = user.Id,
            FirstName = "کاربر",
            LastName = "تست",
            Username = user.Username,
            DepartmentId = people.Department.Id,
            TeamId = people.Team.Id,
            IsActive = isActive,
        };

        [Fact]
        public async Task UpdateUser_DeactivatingYourself_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);

            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateHandler(scope, people.Manager.Id).Handle(Update(people.Manager, people, isActive: false), CancellationToken.None));
        }

        [Fact]
        public async Task UpdateUser_Deactivating_EndsTheSession()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);
            var sessions = TestSessions.Create();
            var tokens = await sessions.IssueAsync(people.Employee);
            scope.Context.SaveChanges();

            await UpdateHandler(scope, people.Manager.Id, sessions).Handle(Update(people.Employee, people, isActive: false), CancellationToken.None);

            Assert.False(sessions.IsCurrent(people.Employee.Id, tokens.AccessToken));
            using var verify = db.NewContext();
            Assert.Null(verify.Users.Single(x => x.Id == people.Employee.Id).RefreshToken);
        }

        [Fact]
        public async Task UpdateUser_OfAnAccountThatCanDoMore_IsForbidden()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);

            await Assert.ThrowsAsync<ForbiddenCustomException>(() => UpdateHandler(scope, people.Manager.Id).Handle(Update(people.Admin, people, isActive: false), CancellationToken.None));

            using var verify = db.NewContext();
            Assert.True(verify.Users.Single(x => x.Id == people.Admin.Id).IsActive);
        }

        [Fact]
        public async Task UpdateUser_AdminOnAnyone_IsAllowed()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);

            await UpdateHandler(scope, people.Admin.Id).Handle(Update(people.Manager, people, isActive: false), CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.Users.Single(x => x.Id == people.Manager.Id).IsActive);
        }

        [Fact]
        public async Task DeleteUser_Yourself_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);

            var handler = new DeleteUserCommandHandler(scope.UserRepository, scope.OrgRoleService, scope.PermissionService,
                FakeUserContext.WithUserId(people.Admin.Id), TestSessions.Create(), scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new DeleteUserCommand { Id = people.Admin.Id }, CancellationToken.None));
        }

        [Fact]
        public async Task DeleteUser_OfAnAccountThatCanDoMore_IsForbidden()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var people = SeedPeople(scope);

            var handler = new DeleteUserCommandHandler(scope.UserRepository, scope.OrgRoleService, scope.PermissionService,
                FakeUserContext.WithUserId(people.Manager.Id), TestSessions.Create(), scope.UnitOfWork);

            await Assert.ThrowsAsync<ForbiddenCustomException>(() => handler.Handle(new DeleteUserCommand { Id = people.Admin.Id }, CancellationToken.None));
        }
    }
}
