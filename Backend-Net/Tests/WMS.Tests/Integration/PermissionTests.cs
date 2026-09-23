using Application.Features.Permission.Commands;
using Application.Features.Permission.Queries;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Claim-based permissions: one user, one list of rows, no inheritance from department or
    /// team. What a user holds is read per request, so a revoked permission stops working at once
    /// rather than when their token expires.
    /// </summary>
    public class PermissionTests
    {
        private static UpdateUserPermissionsCommandHandler UpdatePermissions(TestScope scope, int actorId)
            => new(scope.Db, scope.PermissionService, FakeUserContext.WithUserId(actorId), scope.UnitOfWork);

        private static GetUserPermissionsQueryHandler GetUserPermissions(TestScope scope, int actorId)
            => new(scope.Db, scope.PermissionService, FakeUserContext.WithUserId(actorId));

        private static GetPermissionListQueryHandler GetPermissionList(TestScope scope, int actorId)
            => new(scope.PermissionService, FakeUserContext.WithUserId(actorId));

        private static User AddUser(WMSDbContext context, string username)
        {
            var user = Seed.User(Seed.Department("واحد " + username), null, username);
            context.Users.Add(user);
            context.SaveChanges();
            return user;
        }

        private static void Grant(WMSDbContext context, int userId, params PermissionEnum[] permissions)
        {
            foreach (var permission in permissions)
                context.UserPermissions.Add(new UserPermission
                {
                    UserId = userId,
                    Permission = permission,
                    GrantedAt = DateTime.Now,
                });

            context.SaveChanges();
        }

        [Fact]
        public async Task AUserWithNoRows_HoldsNothing()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = AddUser(scope.Context, "tester");

            Assert.Empty(await scope.PermissionService.GetUserPermissionsAsync(user.Id, CancellationToken.None));
            Assert.False(await scope.PermissionService.HasPermissionAsync(user.Id, PermissionEnum.SaleView, CancellationToken.None));
        }

        [Fact]
        public async Task AMissingUser_HoldsNothing()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            // Fail closed: an id that does not exist must not be an error the caller can exploit.
            Assert.False(await scope.PermissionService.HasPermissionAsync(999999, PermissionEnum.SaleView, CancellationToken.None));
        }

        [Fact]
        public async Task ADeactivatedUser_HoldsNothing_EvenWithRows()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = AddUser(scope.Context, "tester");
            Grant(scope.Context, user.Id, PermissionEnum.SaleView);

            Assert.True(await scope.PermissionService.HasPermissionAsync(user.Id, PermissionEnum.SaleView, CancellationToken.None));

            user.IsActive = false;
            scope.Context.SaveChanges();
            scope.PermissionService.Invalidate(user.Id);

            // Their rows are still there, but a token issued before deactivation opens nothing.
            Assert.False(await scope.PermissionService.HasPermissionAsync(user.Id, PermissionEnum.SaleView, CancellationToken.None));
        }

        [Fact]
        public async Task Granting_TakesEffectImmediately_NotWhenTheTokenExpires()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            var target = AddUser(scope.Context, "target");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionManage);

            // Warm the cache with the "holds nothing" answer, as a live request would.
            Assert.False(await scope.PermissionService.HasPermissionAsync(target.Id, PermissionEnum.SaleShip, CancellationToken.None));

            await UpdatePermissions(scope, admin.Id).Handle(new UpdateUserPermissionsCommand
            {
                UserId = target.Id,
                Permissions = new List<PermissionEnum> { PermissionEnum.SaleShip }
            }, CancellationToken.None);

            Assert.True(await scope.PermissionService.HasPermissionAsync(target.Id, PermissionEnum.SaleShip, CancellationToken.None));
        }

        [Fact]
        public async Task Revoking_TakesEffectImmediately()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            var target = AddUser(scope.Context, "target");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionManage);
            Grant(scope.Context, target.Id, PermissionEnum.SaleShip, PermissionEnum.SaleView);

            Assert.True(await scope.PermissionService.HasPermissionAsync(target.Id, PermissionEnum.SaleShip, CancellationToken.None));

            await UpdatePermissions(scope, admin.Id).Handle(new UpdateUserPermissionsCommand
            {
                UserId = target.Id,
                Permissions = new List<PermissionEnum> { PermissionEnum.SaleView }
            }, CancellationToken.None);

            Assert.False(await scope.PermissionService.HasPermissionAsync(target.Id, PermissionEnum.SaleShip, CancellationToken.None));
            Assert.True(await scope.PermissionService.HasPermissionAsync(target.Id, PermissionEnum.SaleView, CancellationToken.None));
        }

        [Fact]
        public async Task Update_ReplacesWholesale_AndRecordsWhoGrantedIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            var target = AddUser(scope.Context, "target");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionManage);
            Grant(scope.Context, target.Id, PermissionEnum.SaleView, PermissionEnum.SaleCreate);

            var response = await UpdatePermissions(scope, admin.Id).Handle(new UpdateUserPermissionsCommand
            {
                UserId = target.Id,
                // SaleView stays, SaleCreate goes, PurchaseView arrives.
                Permissions = new List<PermissionEnum> { PermissionEnum.SaleView, PermissionEnum.PurchaseView }
            }, CancellationToken.None);

            Assert.Equal("Success", response.ResponseMessageType);

            using var verify = db.NewContext();
            var rows = verify.UserPermissions.Where(x => x.UserId == target.Id).ToList();
            Assert.Equal(2, rows.Count);
            Assert.Contains(rows, x => x.Permission == PermissionEnum.SaleView);
            Assert.Contains(rows, x => x.Permission == PermissionEnum.PurchaseView);

            // An untouched row keeps its original grant record; the new one names the admin.
            Assert.Equal(admin.Id, rows.Single(x => x.Permission == PermissionEnum.PurchaseView).GrantedByUserId);
        }

        [Fact]
        public async Task Update_WithAnEmptyList_RevokesEverything()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            var target = AddUser(scope.Context, "target");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionManage);
            Grant(scope.Context, target.Id, PermissionEnum.SaleView, PermissionEnum.SaleCreate);

            await UpdatePermissions(scope, admin.Id).Handle(new UpdateUserPermissionsCommand
            {
                UserId = target.Id,
                Permissions = new List<PermissionEnum>()
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.UserPermissions.Where(x => x.UserId == target.Id));
        }

        [Fact]
        public async Task Update_CannotRemoveYourOwnPermissionManage()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionManage, PermissionEnum.SaleView);

            // The one unrecoverable mistake - nobody could hand it back without direct SQL.
            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                UpdatePermissions(scope, admin.Id).Handle(new UpdateUserPermissionsCommand
                {
                    UserId = admin.Id,
                    Permissions = new List<PermissionEnum> { PermissionEnum.SaleView }
                }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Contains(verify.UserPermissions.Where(x => x.UserId == admin.Id),
                x => x.Permission == PermissionEnum.PermissionManage);
        }

        [Fact]
        public async Task Update_OnAMissingUser_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionManage);

            await Assert.ThrowsAsync<NotFoundCustomException>(() =>
                UpdatePermissions(scope, admin.Id).Handle(new UpdateUserPermissionsCommand
                {
                    UserId = 999999,
                    Permissions = new List<PermissionEnum> { PermissionEnum.SaleView }
                }, CancellationToken.None));
        }

        [Fact]
        public void DeletingAUser_CascadesTheirPermissionRows()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = AddUser(scope.Context, "tester");
            Grant(scope.Context, user.Id, PermissionEnum.SaleView);

            // Hard delete - the application soft-deletes, but the FK must not orphan rows if a
            // user is ever removed for real.
            scope.Context.Users.Remove(scope.Context.Users.Single(x => x.Id == user.Id));
            scope.Context.SaveChanges();

            using var verify = db.NewContext();
            Assert.Empty(verify.UserPermissions.Where(x => x.UserId == user.Id));
        }

        [Fact]
        public async Task Update_RejectsAPermissionThatIsNotInTheCatalogue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            var target = AddUser(scope.Context, "target");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionManage);

            // Same guard a restricted permission will hit once one exists: anything outside what
            // the caller may manage is refused, and the message does not say which case it was.
            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                UpdatePermissions(scope, admin.Id).Handle(new UpdateUserPermissionsCommand
                {
                    UserId = target.Id,
                    Permissions = new List<PermissionEnum> { (PermissionEnum)9999 }
                }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Empty(verify.UserPermissions.Where(x => x.UserId == target.Id));
        }

        [Fact]
        public async Task GetPermissionList_ReturnsTheWholeCatalogue_Grouped()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionManage);

            var response = await GetPermissionList(scope, admin.Id)
                .Handle(new GetPermissionListQuery(), CancellationToken.None);

            var groups = response.Data!.GetType().GetProperty("PermissionGroups")!.GetValue(response.Data!)
                as List<Application.Features.Permission.Dtos.PermissionGroupDto>;

            Assert.NotNull(groups);
            // No permission is restricted today, so every member is listed.
            Assert.Equal(Enum.GetValues<PermissionEnum>().Length, groups!.Sum(x => x.Permissions.Count));
            Assert.All(groups!, group => Assert.NotEmpty(group.GroupTitle));
        }

        [Fact]
        public async Task GetUserPermissions_ReturnsWhatTheUserHolds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            var target = AddUser(scope.Context, "target");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionView);
            Grant(scope.Context, target.Id, PermissionEnum.SaleView, PermissionEnum.SaleShip);

            var response = await GetUserPermissions(scope, admin.Id)
                .Handle(new GetUserPermissionsQuery { UserId = target.Id }, CancellationToken.None);

            var permissions = response.Data!.GetType().GetProperty("Permissions")!.GetValue(response.Data!)
                as List<Application.Features.Permission.Dtos.UserPermissionDto>;

            Assert.NotNull(permissions);
            Assert.Equal(2, permissions!.Count);
            // Name and Title are enum metadata, filled in after the query materialises.
            Assert.All(permissions!, permission =>
            {
                Assert.NotEmpty(permission.Name);
                Assert.NotEmpty(permission.Title);
            });
        }

        [Fact]
        public async Task GetUserPermissions_OnAMissingUser_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var admin = AddUser(scope.Context, "admin");
            Grant(scope.Context, admin.Id, PermissionEnum.PermissionView);

            await Assert.ThrowsAsync<NotFoundCustomException>(() =>
                GetUserPermissions(scope, admin.Id)
                    .Handle(new GetUserPermissionsQuery { UserId = 999999 }, CancellationToken.None));
        }
    }
}
