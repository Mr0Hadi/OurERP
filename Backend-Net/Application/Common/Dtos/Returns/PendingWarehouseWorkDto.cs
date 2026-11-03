namespace Application.Common.Dtos.Returns
{
    /// <summary>
    /// What the warehouse still has to do on a return (frontend-requests 14.5): the remaining quantity of its PENDING goods
    /// effects by direction - GOODS_IN to receive, GOODS_OUT to send, GOODS_RELEASE/GOODS_SCRAP to take out of quarantine
    /// (purchase side only). All zero once the return is no longer open: the warehouse queues list open returns only.
    /// </summary>
    public class PendingWarehouseWorkDto
    {
        public int GoodsIn { get; set; }
        public int GoodsOut { get; set; }
        public int QuarantineExit { get; set; }

        public static PendingWarehouseWorkDto Of(bool isOpen, IEnumerable<(Domain.Enums.ReturnEffectDirectionEnum Direction, Domain.Enums.ReturnEffectStatusEnum Status, int Remaining)> effects)
        {
            var work = new PendingWarehouseWorkDto();
            if (!isOpen)
                return work;

            foreach (var e in effects.Where(e => e.Status == Domain.Enums.ReturnEffectStatusEnum.PENDING && e.Remaining > 0))
            {
                switch (e.Direction)
                {
                    case Domain.Enums.ReturnEffectDirectionEnum.GOODS_IN: work.GoodsIn += e.Remaining; break;
                    case Domain.Enums.ReturnEffectDirectionEnum.GOODS_OUT: work.GoodsOut += e.Remaining; break;
                    case Domain.Enums.ReturnEffectDirectionEnum.GOODS_RELEASE:
                    case Domain.Enums.ReturnEffectDirectionEnum.GOODS_SCRAP: work.QuarantineExit += e.Remaining; break;
                }
            }
            return work;
        }
    }
}
