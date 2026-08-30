using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class GoodsRoundObservationDto
    {
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
    }
}
