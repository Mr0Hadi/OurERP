using Common.Exceptions;

namespace Application.Common.Documents
{
    /// <summary>
    /// Optimistic concurrency for document edits (frontend-requests 13.2): the client sends back the UpdatedAt it read, and an
    /// edit of a copy the server has since changed is refused with 409 instead of silently overwriting someone else's work.
    /// Compared to the millisecond: the stamp makes a round trip through JSON and a JavaScript Date, which keeps no more.
    /// Null means the caller did not send one - accepted, so an older client keeps working.
    /// </summary>
    public static class DocumentVersion
    {
        public static void Ensure(DateTime current, DateTime? expected, string message)
        {
            if (expected.HasValue && !SameMillisecond(current, expected.Value))
                throw new ConflictCustomException(message, new { updatedAt = current });
        }

        public static bool SameMillisecond(DateTime a, DateTime b) =>
            a.Ticks / TimeSpan.TicksPerMillisecond == b.Ticks / TimeSpan.TicksPerMillisecond;
    }
}
