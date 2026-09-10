using Application.Features.Department.Commands;
using Application.Features.Team.Commands;
using Application.Features.User.Command;
using Application.Features.User.Dto;
using Application.Features.User.Query;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// One user holds one role, and both halves of the org chart (User.DepartmentId/TeamId and the
    /// Team/Department HeadId/DeputyId slots) always agree - whichever page did the writing.
    /// </summary>
    public class OrgRoleTests
    {
        private static UpdateUserCommandHandler UpdateUser(TestScope scope)
            => new(scope.UserRepository, scope.OrgRoleService, scope.UnitOfWork);

        private static UpdateUserCommand UpdateUserRequest(Domain.Entities.User user, int departmentId, int? teamId, OrgRoleEnum? role = null)
            => new()
            {
                Id = user.Id,
                FirstName = "کاربر",
                LastName = "تست",
                Username = user.Username,
                DepartmentId = departmentId,
                TeamId = teamId,
                Role = role,
                IsActive = true,
            };

        [Fact]
        public async Task UpdateUser_MovingHeadToAnotherDepartment_ClearsPreviousTeamHead()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var oldDepartment = Seed.Department("واحد قدیم");
            var newDepartment = Seed.Department("واحد جدید");
            var oldTeam = Seed.Team(oldDepartment, "تیم قدیم");
            var user = Seed.User(oldDepartment, oldTeam);
            scope.Context.Departments.Add(newDepartment);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            oldTeam.HeadId = user.Id;
            scope.Context.SaveChanges();

            // The user detail page moves them to a department that has no teams at all.
            await UpdateUser(scope).Handle(UpdateUserRequest(user, newDepartment.Id, null), CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Null(verify.Teams.Single(x => x.Id == oldTeam.Id).HeadId);
            var moved = verify.Users.Single(x => x.Id == user.Id);
            Assert.Equal(newDepartment.Id, moved.DepartmentId);
            Assert.Null(moved.TeamId);
        }

        [Fact]
        public async Task UpdateUser_MovingDepartmentHeadAway_ClearsPreviousDepartmentHead()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var oldDepartment = Seed.Department("واحد قدیم");
            var newDepartment = Seed.Department("واحد جدید");
            var user = Seed.User(oldDepartment, null);
            scope.Context.Departments.Add(newDepartment);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            oldDepartment.HeadId = user.Id;
            scope.Context.SaveChanges();

            await UpdateUser(scope).Handle(UpdateUserRequest(user, newDepartment.Id, null), CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Null(verify.Departments.Single(x => x.Id == oldDepartment.Id).HeadId);
        }

        [Fact]
        public async Task UpdateUser_StayingPut_KeepsTheRole()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            team.HeadId = user.Id;
            scope.Context.SaveChanges();

            // Role omitted: an edit that doesn't move the user must not quietly demote them.
            await UpdateUser(scope).Handle(UpdateUserRequest(user, department.Id, team.Id), CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(user.Id, verify.Teams.Single(x => x.Id == team.Id).HeadId);
        }

        [Fact]
        public async Task UpdateUser_PromotingToDepartmentHead_TakesUserOutOfTheirTeam()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            team.DeputyId = user.Id;
            scope.Context.SaveChanges();

            await UpdateUser(scope).Handle(UpdateUserRequest(user, department.Id, null, OrgRoleEnum.DEPARTMENT_HEAD), CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Null(verify.Teams.Single(x => x.Id == team.Id).DeputyId);
            Assert.Equal(user.Id, verify.Departments.Single(x => x.Id == department.Id).HeadId);
            Assert.Null(verify.Users.Single(x => x.Id == user.Id).TeamId);
        }

        [Fact]
        public async Task UpdateUser_DepartmentRoleWhileInATeam_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateUser(scope)
                .Handle(UpdateUserRequest(user, department.Id, team.Id, OrgRoleEnum.DEPARTMENT_HEAD), CancellationToken.None));
        }

        [Fact]
        public async Task UpdateUser_TeamRoleWithNoTeam_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var user = Seed.User(department, null);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateUser(scope)
                .Handle(UpdateUserRequest(user, department.Id, null, OrgRoleEnum.TEAM_HEAD), CancellationToken.None));
        }

        [Fact]
        public async Task UpdateUser_TeamOutsideTheDepartment_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department("واحد الف");
            var otherDepartment = Seed.Department("واحد ب");
            var otherTeam = Seed.Team(otherDepartment, "تیم ب");
            var user = Seed.User(department, null);
            scope.Context.Teams.Add(otherTeam);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateUser(scope)
                .Handle(UpdateUserRequest(user, department.Id, otherTeam.Id), CancellationToken.None));
        }

        [Fact]
        public async Task UpdateUser_Deactivating_ReleasesTheRole()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            team.HeadId = user.Id;
            scope.Context.SaveChanges();

            var request = UpdateUserRequest(user, department.Id, team.Id);
            request.IsActive = false;
            await UpdateUser(scope).Handle(request, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Null(verify.Teams.Single(x => x.Id == team.Id).HeadId);
        }

        [Fact]
        public async Task UpdateTeam_NamingAHeadFromAnotherTeam_MovesThemAndFreesTheOldSlot()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var oldTeam = Seed.Team(department, "تیم قدیم");
            var newTeam = Seed.Team(department, "تیم جدید");
            var user = Seed.User(department, oldTeam);
            scope.Context.Teams.Add(newTeam);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            oldTeam.HeadId = user.Id;
            scope.Context.SaveChanges();

            var handler = new UpdateTeamCommandHandler(scope.TeamRepository, scope.UserRepository, scope.OrgRoleService, scope.UnitOfWork);
            await handler.Handle(new UpdateTeamCommand { Id = newTeam.Id, Name = newTeam.Name, HeadId = user.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Null(verify.Teams.Single(x => x.Id == oldTeam.Id).HeadId);
            Assert.Equal(user.Id, verify.Teams.Single(x => x.Id == newTeam.Id).HeadId);
            // The team page wrote the user's own placement too, so the user list agrees with it.
            Assert.Equal(newTeam.Id, verify.Users.Single(x => x.Id == user.Id).TeamId);
        }

        [Fact]
        public async Task UpdateTeam_DroppingTheHead_LeavesThemAsAPlainMember()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            team.HeadId = user.Id;
            scope.Context.SaveChanges();

            var handler = new UpdateTeamCommandHandler(scope.TeamRepository, scope.UserRepository, scope.OrgRoleService, scope.UnitOfWork);
            await handler.Handle(new UpdateTeamCommand { Id = team.Id, Name = team.Name, HeadId = null }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Null(verify.Teams.Single(x => x.Id == team.Id).HeadId);
            Assert.Equal(team.Id, verify.Users.Single(x => x.Id == user.Id).TeamId);
        }

        [Fact]
        public async Task UpdateTeam_PromotingTheDepartmentHead_FreesTheDepartmentSlot()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, null);
            scope.Context.Teams.Add(team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            department.HeadId = user.Id;
            scope.Context.SaveChanges();

            var handler = new UpdateTeamCommandHandler(scope.TeamRepository, scope.UserRepository, scope.OrgRoleService, scope.UnitOfWork);
            await handler.Handle(new UpdateTeamCommand { Id = team.Id, Name = team.Name, HeadId = user.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Null(verify.Departments.Single(x => x.Id == department.Id).HeadId);
            Assert.Equal(user.Id, verify.Teams.Single(x => x.Id == team.Id).HeadId);
        }

        [Fact]
        public async Task UpdateDepartment_NamingAHead_TakesThemOutOfTheirTeam()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var user = Seed.User(department, team);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            team.HeadId = user.Id;
            scope.Context.SaveChanges();

            var handler = new UpdateDepartmentCommandHandler(scope.DepartmentRepository, scope.UserRepository, scope.OrgRoleService, scope.UnitOfWork);
            await handler.Handle(new UpdateDepartmentCommand { Id = department.Id, Name = department.Name, HeadId = user.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Null(verify.Teams.Single(x => x.Id == team.Id).HeadId);
            Assert.Equal(user.Id, verify.Departments.Single(x => x.Id == department.Id).HeadId);
            Assert.Null(verify.Users.Single(x => x.Id == user.Id).TeamId);
        }

        [Fact]
        public async Task CreateDepartment_WithAHead_TransfersThemInsteadOfRejecting()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var oldDepartment = Seed.Department("واحد قدیم");
            var oldTeam = Seed.Team(oldDepartment, "تیم قدیم");
            var user = Seed.User(oldDepartment, oldTeam);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            oldTeam.HeadId = user.Id;
            scope.Context.SaveChanges();

            var handler = new CreateDepartmentCommandHandler(scope.DepartmentRepository, scope.UserRepository, scope.OrgRoleService, TestMapper.Instance, scope.UnitOfWork);
            await handler.Handle(new CreateDepartmentCommand { Name = "واحد نو", HeadId = user.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            var created = verify.Departments.Single(x => x.Name == "واحد نو");
            Assert.Equal(user.Id, created.HeadId);
            Assert.Null(verify.Teams.Single(x => x.Id == oldTeam.Id).HeadId);
            var moved = verify.Users.Single(x => x.Id == user.Id);
            Assert.Equal(created.Id, moved.DepartmentId);
            Assert.Null(moved.TeamId);
        }

        [Fact]
        public async Task CreateTeam_WithAHead_MovesThemIntoTheNewTeam()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var user = Seed.User(department, null);
            scope.Context.Users.Add(user);
            scope.Context.SaveChanges();

            department.DeputyId = user.Id;
            scope.Context.SaveChanges();

            var handler = new CreateTeamCommandHandler(scope.TeamRepository, scope.UserRepository, scope.OrgRoleService, TestMapper.Instance, scope.UnitOfWork);
            await handler.Handle(new CreateTeamCommand { Name = "تیم نو", DepartmentId = department.Id, HeadId = user.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            var created = verify.Teams.Single(x => x.Name == "تیم نو");
            Assert.Equal(user.Id, created.HeadId);
            Assert.Null(verify.Departments.Single(x => x.Id == department.Id).DeputyId);
            Assert.Equal(created.Id, verify.Users.Single(x => x.Id == user.Id).TeamId);
        }

        [Fact]
        public async Task GetUserList_ReportsTheRoleHeldOnTheTeamSide()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var department = Seed.Department();
            var team = Seed.Team(department);
            var head = Seed.User(department, team, username: "teamhead");
            var member = Seed.User(department, team, username: "member");
            // The unique IX_Users_PersonelCode index makes Seed.User's fixed 1001 collide.
            member.PersonelCode = 1002;
            scope.Context.Users.AddRange(head, member);
            scope.Context.SaveChanges();

            team.HeadId = head.Id;
            scope.Context.SaveChanges();

            var handler = new GetUserListQueryHandler(scope.Db);
            var res = await handler.Handle(new GetUserListQuery { Page = 1, Take = 50 }, CancellationToken.None);

            var list = (IEnumerable<UserListDto>)res.Data!.GetType().GetProperty("UserList")!.GetValue(res.Data)!;
            Assert.Equal(OrgRoleEnum.TEAM_HEAD, list.Single(x => x.Id == head.Id).Role);
            Assert.Equal("مسئول تیم", list.Single(x => x.Id == head.Id).RoleTitle);
            Assert.Equal(OrgRoleEnum.MEMBER, list.Single(x => x.Id == member.Id).Role);
        }
    }
}
