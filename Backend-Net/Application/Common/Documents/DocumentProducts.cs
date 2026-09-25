using Application.Common.Contracts.Context;
using Common.Exceptions;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Documents
{
    public static class DocumentProducts
    {
        /// <summary>
        /// The products a document's lines refer to, keyed by id - needed to snapshot their tax. A missing id is a 404 here
        /// rather than a foreign-key failure at SaveChanges.
        /// </summary>
        public static async Task<Dictionary<int, Product>> LoadAsync(IWMSDbContext context, IEnumerable<int> productIds, CancellationToken cancellationToken)
        {
            var ids = productIds.Distinct().ToList();
            var products = await context.Products
                .Where(p => ids.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, cancellationToken);

            if (products.Count != ids.Count)
                throw new NotFoundCustomException("کالای انتخاب‌شده یافت نشد.");

            return products;
        }
    }
}
