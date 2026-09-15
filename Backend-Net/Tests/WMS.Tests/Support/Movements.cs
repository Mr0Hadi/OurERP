using Application.Common.Contracts.ProductUnit;
using Domain.Enums;

namespace WMS.Tests.Support
{
    /// <summary>A movement context for tests that call IProductUnitService directly and do not care about the ledger row.</summary>
    public static class Movements
    {
        public static UnitMovementContext Test => new(ProductUnitMovementReasonEnum.MANUAL_ADJUSTMENT, DateTime.Now);
    }
}
