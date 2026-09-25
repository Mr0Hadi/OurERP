using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>Replaces a sale's attachments, in any status - attachments are evidence, not part of the invoice.</summary>
    public class UpdateSaleAttachmentsCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class UpdateSaleAttachmentsCommandValidator : AbstractValidator<UpdateSaleAttachmentsCommand>
    {
        public UpdateSaleAttachmentsCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("فروش نامعتبر است.");
            RuleForEach(x => x.Attachments).ChildRules(a =>
            {
                a.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("کلید فایل ضمیمه"));
            });
        }
    }

    public class UpdateSaleAttachmentsCommandHandler : IRequestHandler<UpdateSaleAttachmentsCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateSaleAttachmentsCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateSaleAttachmentsCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var exists = await _context.Sales.AnyAsync(x => x.Id == request.Id && x.IsActive, cancellationToken);
            if (!exists)
                throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            await DocumentAttachmentWriter.ReplaceAsync(_context, _objectStorageService, DocumentKindEnum.SALE, request.Id, request.Attachments, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, request.Id, cancellationToken);
            res.Message = "ضمیمه‌های فروش با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
