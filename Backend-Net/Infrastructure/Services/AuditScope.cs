using Application.Common.Contracts.Audit;
using Domain.Enums;

namespace Infrastructure.Services
{
    public class AuditScope : IAuditScope
    {
        private int _depth;

        public AuditActionEnum? Action { get; private set; }

        public long? CurrentEventId { get; set; }

        public IDisposable Begin(AuditActionEnum action)
        {
            if (_depth++ == 0)
            {
                Action = action;
                CurrentEventId = null;
            }

            return new Handle(this);
        }

        private void End()
        {
            if (--_depth == 0)
            {
                Action = null;
                CurrentEventId = null;
            }
        }

        private sealed class Handle : IDisposable
        {
            private AuditScope? _scope;

            public Handle(AuditScope scope)
            {
                _scope = scope;
            }

            public void Dispose()
            {
                _scope?.End();
                _scope = null;
            }
        }
    }
}
