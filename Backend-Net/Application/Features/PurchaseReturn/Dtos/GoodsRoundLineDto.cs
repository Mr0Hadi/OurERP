namespace Application.Features.PurchaseReturn.Dtos
{
    public class GoodsRoundLineDto
    {
        public int EffectId { get; set; }
        public int Quantity { get; set; }

        /// <summary>GOODS_IN only: which portion of Quantity had a problem on arrival, and what problem.</summary>
        public List<GoodsRoundObservationDto> Observations { get; set; } = new();
    }
}
