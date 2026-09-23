using Application.Common.Enums;
using Application.Common.Queries;

namespace WMS.Tests.Unit
{
    public class SortingExtensionsTests
    {
        [Theory]
        [InlineData(false, null, SortDirectionEnum.DESC, SortDirectionEnum.DESC)] // nothing sent -> the query's default
        [InlineData(true, null, SortDirectionEnum.DESC, SortDirectionEnum.ASC)]   // a column picked -> ascending
        [InlineData(true, SortDirectionEnum.DESC, SortDirectionEnum.ASC, SortDirectionEnum.DESC)]
        [InlineData(false, SortDirectionEnum.ASC, SortDirectionEnum.DESC, SortDirectionEnum.ASC)] // explicit direction always wins
        public void ResolveDirection(bool hasSortBy, SortDirectionEnum? sent, SortDirectionEnum defaultDirection, SortDirectionEnum expected)
        {
            Assert.Equal(expected, SortingExtensions.ResolveDirection(hasSortBy, sent, defaultDirection));
        }

        [Fact]
        public void SortBy_AndThenSortBy_HonourDirection()
        {
            var rows = new[] { (Key: 1, Id: 2), (Key: 2, Id: 1), (Key: 1, Id: 1) }.AsQueryable();

            var asc = rows.SortBy(x => x.Key, SortDirectionEnum.ASC).ThenSortBy(x => x.Id, SortDirectionEnum.ASC).ToList();
            Assert.Equal(new[] { (1, 1), (1, 2), (2, 1) }, asc);

            var desc = rows.SortBy(x => x.Key, SortDirectionEnum.DESC).ThenSortBy(x => x.Id, SortDirectionEnum.DESC).ToList();
            Assert.Equal(new[] { (2, 1), (1, 2), (1, 1) }, desc);
        }
    }
}
