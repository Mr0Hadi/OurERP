using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Queries
{
    public class GetSaleDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetSaleDetailQueryHandler : IRequestHandler<GetSaleDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        public GetSaleDetailQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
        }
        public async Task<ResponseDto> Handle(GetSaleDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.Customer)
                .Include(x => x.Items)
                .Include(x => x.Drivers)
                .Include(x => x.ShippingNotes)
                .FirstOrDefaultAsync(x => x.Id == request.Id) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            res.Data = new SaleDto
            {
                Id = sale.Id,
                InvoiceNumber = sale.InvoiceNumber,
                InvoiceDate = sale.InvoiceDate,
                Status = sale.Status,
                PaymentType = sale.PaymentType,
                TotalAmount = sale.TotalAmount,
                PaidAmount = sale.PaidAmount,
                PaymentDetails = sale.PaymentDetails,
                Description = sale.Description,
                CustomerId = sale.CustomerId,
                CustomerName = sale.Customer.FirstName + " " + sale.Customer.LastName,
                CreatedAt = sale.CreatedAt,
                UpdatedAt = sale.UpdatedAt,
                Items = sale.Items,
                Drivers = sale.Drivers.Select(d => new SaleDriverDto
                {
                    Id = d.Id,
                    DriverFullName = d.DriverFullName,
                    DriverPhoneNumber = d.DriverPhoneNumber,
                    VehiclePlate = d.VehiclePlate,
                    CreatedAt = d.CreatedAt
                }).ToList(),
                ShippingNotes = sale.ShippingNotes.Select(n => new SaleShippingNoteDto
                {
                    Id = n.Id,
                    Note = n.Note,
                    CreatedAt = n.CreatedAt
                }).ToList()
            };

            var attachments = await _context.DocumentAttachments.AsNoTracking()
                .Where(a => a.DocumentKind == DocumentKindEnum.SALE && a.DocumentId == request.Id)
                .Select(a => new DocumentAttachmentDto
                {
                    Id = a.Id,
                    ObjectKey = a.ObjectKey,
                    FileName = a.FileName,
                    Note = a.Note,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync(cancellationToken);
            foreach (var attachment in attachments)
                attachment.Url = _objectStorageService.GetPresignedUrl(attachment.ObjectKey);
            ((SaleDto)res.Data).Attachments = attachments;

            res.Message = "اطلاعات فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
