using Common.Extensions;
using Domain.Enums;

namespace WMS.Tests.Unit
{
    /// <summary>
    /// The permission catalogue is the whole contract - an enum with no table behind it - so the
    /// properties it has to keep are asserted here rather than left to review.
    /// </summary>
    public class PermissionCatalogueTests
    {
        [Fact]
        public void EveryPermission_HasAGroup()
        {
            // GetGroup throws for a member with no [PermissionGroup]; touching them all is the assert.
            foreach (var permission in PermissionExtensions.All)
                Assert.True(Enum.IsDefined(permission.GetGroup()));
        }

        [Fact]
        public void EveryPermission_HasAPersianTitle()
        {
            foreach (var permission in PermissionExtensions.All)
            {
                var title = permission.GetDescription();

                // GetDescription falls back to the member name when [Description] is missing.
                Assert.NotEqual(permission.ToString(), title);
                Assert.NotEmpty(title);
            }
        }

        /// <summary>
        /// The integers are persisted in UserPermissions.Permission. Two members sharing a value
        /// would make one of them silently grant the other.
        /// </summary>
        [Fact]
        public void PermissionValues_AreUnique()
        {
            var values = PermissionExtensions.All.Select(permission => (int)permission).ToList();

            Assert.Equal(values.Count, values.Distinct().Count());
        }

        [Fact]
        public void NoPermission_IsRestrictedYet()
        {
            // Documents today's state deliberately: the restricted marker exists for a feature
            // that is not built. If this ever fails, it is because that feature arrived - update
            // the expectation, do not delete the concept.
            Assert.Empty(PermissionExtensions.All.Where(permission => permission.IsRestricted()));
        }

        [Fact]
        public void ManageableBy_IncludesEveryOrdinaryPermission_EvenOneTheUserDoesNotHold()
        {
            // Holding PermissionManage is enough to grant any ordinary permission; otherwise a
            // permission added in a new release could never be granted by anyone.
            var manageable = PermissionExtensions.ManageableBy(new[] { PermissionEnum.PermissionManage });

            Assert.Contains(PermissionEnum.SaleShip, manageable);
            Assert.Contains(PermissionEnum.UserDelete, manageable);
        }
    }
}
