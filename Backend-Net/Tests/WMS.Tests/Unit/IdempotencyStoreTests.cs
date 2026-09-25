using Microsoft.Extensions.Caching.Memory;
using WMS.Idempotency;

namespace WMS.Tests.Unit
{
    public class IdempotencyStoreTests
    {
        private static IdempotencyStore NewStore() => new(new MemoryCache(new MemoryCacheOptions()));

        [Fact]
        public void SecondBegin_WhileTheFirstRuns_IsInProgress()
        {
            var store = NewStore();

            Assert.Equal(IdempotencyBeginResultEnum.STARTED, store.Begin("1:k", "fp", out _));
            Assert.Equal(IdempotencyBeginResultEnum.IN_PROGRESS, store.Begin("1:k", "fp", out _));
        }

        [Fact]
        public void Completed_IsReplayed_ForTheSameRequest_AndRefusedForAnother()
        {
            var store = NewStore();
            store.Begin("1:k", "fp", out _);
            store.Complete("1:k", "fp", new IdempotentResponse(200, "application/json", new byte[] { 1, 2 }));

            Assert.Equal(IdempotencyBeginResultEnum.REPLAY, store.Begin("1:k", "fp", out var stored));
            Assert.Equal(new byte[] { 1, 2 }, stored!.Body);
            Assert.Equal(IdempotencyBeginResultEnum.KEY_REUSED, store.Begin("1:k", "other", out _));
        }

        [Fact]
        public void Abandoned_KeyStartsAgain()
        {
            var store = NewStore();
            store.Begin("1:k", "fp", out _);
            store.Abandon("1:k");

            Assert.Equal(IdempotencyBeginResultEnum.STARTED, store.Begin("1:k", "fp", out _));
        }

        [Fact]
        public void Keys_AreScopedPerUser()
        {
            var store = NewStore();
            store.Begin("1:k", "fp", out _);

            Assert.Equal(IdempotencyBeginResultEnum.STARTED, store.Begin("2:k", "fp", out _));
        }
    }
}
