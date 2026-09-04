using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using Common.Exceptions;
using Domain.Entities;
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

            res.Data = await _context.Sales.AsNoTracking()
                .Where(x => x.Id == request.Id)
                .Select(x => new SaleDto
                {
                    Id = x.Id,
                    InvoiceNumber = x.InvoiceNumber,
                    InvoiceDate = x.InvoiceDate,
                    PaymentDate = x.PaymentDate,
                    Status = x.Status,
                    PaymentType = x.PaymentType,
                    TotalAmount = x.TotalAmount,
                    PaidAmount = x.PaidAmount,
                    PaymentDetails = x.PaymentDetails,
                    Description = x.Description,
                    CustomerId = x.CustomerId,
                    CustomerName = x.Customer.FirstName + " " + x.Customer.LastName,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt,
                    Items = x.Items.Select(y => new SaleItemDto
                    {
                        Id = y.Id,
                        Discount = y.Discount,
                        ProductId = y.ProductId,
                        Quantity = y.Quantity,
                        SaleId = y.SaleId,
                        SettledQuantity = y.SettledQuantity,
                        ShippedQuantity = y.ShippedQuantity,
                        UnitPrice = y.UnitPrice
                    }).ToList(),
                    Drivers = x.Drivers.Select(d => new SaleDriverDto
                    {
                        Id = d.Id,
                        DriverFullName = d.DriverFullName,
                        DriverPhoneNumber = d.DriverPhoneNumber,
                        VehiclePlate = d.VehiclePlate,
                        CreatedAt = d.CreatedAt
                    }).ToList(),
                    ShippingNotes = x.ShippingNotes.Select(n => new SaleShippingNoteDto
                    {
                        Id = n.Id,
                        Note = n.Note,
                        CreatedAt = n.CreatedAt
                    }).ToList()
                })
                .FirstOrDefaultAsync() ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");
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
