namespace Application.Features.Vehicle.Dtos
{
    public class VehicleProductListDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public string Brand { get; set; }
        public string CategoryName { get; set; }
        public int Stock { get; set; }
        public string? ImageKey { get; set; }
        public string? ImageUrl { get; set; }

        /// <summary>
        /// How many vehicles the product is linked to. 1 means removing it from this vehicle leaves it with none, which
        /// makes it an all-vehicles product - the frontend warns before that.
        /// </summary>
        public int VehicleCount { get; set; }
    }
}
