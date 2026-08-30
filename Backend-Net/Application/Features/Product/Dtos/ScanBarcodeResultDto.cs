using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Application.Features.Product.Dtos
{
    /// <summary>
    /// What the warehouse screen gets back from a scan: always the product, plus the specific
    /// unit when a unit-level barcode was scanned ("وقتی اسکنش کرد اطلاعات کامل رو نشون بده").
    /// </summary>
    public class ScanBarcodeResultDto
    {
        public BarcodeReferenceKindEnum Kind { get; set; }
        public string NormalizedPayload { get; set; }
        public ProductDto Product { get; set; }
        public string CategoryName { get; set; }
        public ProductUnitDto? Unit { get; set; }
    }
}
