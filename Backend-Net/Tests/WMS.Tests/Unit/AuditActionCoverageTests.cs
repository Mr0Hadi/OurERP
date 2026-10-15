using System.Reflection;
using Application.Common.Audit;
using Application.Ioc;
using Domain.Enums;
using MediatR;

namespace WMS.Tests.Unit
{
    /// <summary>
    /// The audit log can name an event only if its command carries [AuditAction]; nothing else forces a new command to
    /// have one, so this does - the same job EndpointPermissionCoverageTests does for permissions.
    /// </summary>
    public class AuditActionCoverageTests
    {
        private static readonly Type[] Requests = typeof(ApplicationServiceRegistration).Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false }
                        && t.GetInterfaces().Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequest<>)))
            .ToArray();

        private static bool IsQuery(Type request) => request.Name.EndsWith("Query", StringComparison.Ordinal);

        [Fact]
        public void EveryCommand_HasAnAuditAction()
        {
            var missing = Requests.Where(t => !IsQuery(t) && t.GetCustomAttribute<AuditActionAttribute>() == null)
                .Select(t => t.FullName).ToList();

            Assert.True(missing.Count == 0, "Add [AuditAction] (and an AuditActionEnum member) to: " + string.Join(", ", missing));
        }

        [Fact]
        public void NoQuery_HasAnAuditAction()
        {
            Assert.Empty(Requests.Where(t => IsQuery(t) && t.GetCustomAttribute<AuditActionAttribute>() != null).Select(t => t.FullName));
        }

        [Fact]
        public void EveryAuditAction_BelongsToExactlyOneCommand()
        {
            var used = Requests.Select(t => t.GetCustomAttribute<AuditActionAttribute>()?.Action)
                .Where(a => a.HasValue).Select(a => a!.Value).ToList();

            Assert.Empty(used.GroupBy(a => a).Where(g => g.Count() > 1).Select(g => g.Key));
            Assert.Empty(Enum.GetValues<AuditActionEnum>().Except(used));
        }

        [Fact]
        public void EveryAuditAction_HasAPersianTitle()
        {
            Assert.All(Enum.GetValues<AuditActionEnum>(), a =>
                Assert.NotNull(typeof(AuditActionEnum).GetField(a.ToString())!.GetCustomAttribute<System.ComponentModel.DescriptionAttribute>()));
        }
    }
}
