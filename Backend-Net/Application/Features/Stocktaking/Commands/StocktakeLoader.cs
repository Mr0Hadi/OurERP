using Application.Common.Contracts.Context;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Stocktaking.Commands
{
    internal static class StocktakeLoader
    {
        /// <summary>The session with its lines and scans, tracked, refused unless it is in one of <paramref name="allowed"/>.</summary>
        public static async Task<Domain.Entities.Stocktake> LoadAsync(IWMSDbContext context, int id, CancellationToken cancellationToken, params StocktakeStatusEnum[] allowed)
        {
            var stocktake = await context.Stocktakes
                .Include(x => x.Lines)
                .Include(x => x.Scans)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
                ?? throw new NotFoundCustomException("انبارگردانی مورد نظر یافت نشد.");
            if (!allowed.Contains(stocktake.Status))
                throw new ValidationCustomException(stocktake.Status switch
                {
                    StocktakeStatusEnum.COUNTING => "این انبارگردانی هنوز در حال شمارش است.",
                    StocktakeStatusEnum.SUBMITTED => "شمارش این انبارگردانی بسته شده است؛ برای تغییر، آن را بازگشایی کنید.",
                    StocktakeStatusEnum.APPROVED => "این انبارگردانی تأیید و اعمال شده است.",
                    _ => "این انبارگردانی لغو شده است.",
                });
            return stocktake;
        }

        /// <summary>The product's line, added with a zero system quantity when the product was not in scope (found unexpectedly).</summary>
        public static Domain.Entities.StocktakeLine EnsureLine(Domain.Entities.Stocktake stocktake, int productId)
        {
            var line = stocktake.Lines.FirstOrDefault(l => l.ProductId == productId);
            if (line != null)
                return line;
            line = new Domain.Entities.StocktakeLine { ProductId = productId, SystemQuantity = 0 };
            stocktake.Lines.Add(line);
            return line;
        }
    }
}
