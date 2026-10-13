namespace Application.Features.Vehicle.Dtos
{
    public class VehicleListDto
    {
        public int Id { get; set; }
        public string Name { get; set; }

        /// <summary>Active products linked to this vehicle. All-vehicles products are not counted here.</summary>
        public int ProductCount { get; set; }
    }
}
