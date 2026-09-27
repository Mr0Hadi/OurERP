using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    /// <summary>
    /// Replaces a purchase return's attachments (the supplier's signed receipt, photos of the goods), in any status and wholesale - the same contract as
    /// UpdatePurchaseAttachments. Attachments are evidence about the return, not part of its state, so a closed
    /// return still takes them (a signed receipt often arrives after the goods have gone).
    /// </summary>
    public class UpdatePurchaseReturnAttachmentsCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class UpdatePurchaseReturnAttachmentsCommandValidator : AbstractValidator<UpdatePurchaseReturnAttachmentsCommand>
    {
        public UpdatePurchaseReturnAttachmentsCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("مرجوعی نامعتبر است.");
            RuleForEach(x => x.Attachments).ChildRules(a =>
            {
                a.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("کلید فایل ضمیمه"));
            });
        }
    }

    public class UpdatePurchaseReturnAttachmentsCommandHandler : IRequestHandler<UpdatePurchaseReturnAttachmentsCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _calculationService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdatePurchaseReturnAttachmentsCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService calculationService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _calculationService = calculationService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdatePurchaseReturnAttachmentsCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var exists = await _context.PurchaseReturns.AnyAsync(x => x.Id == request.Id && x.IsActive, cancellationToken);
            if (!exists)
                throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            await DocumentAttachmentWriter.ReplaceAsync(_context, _objectStorageService, DocumentKindEnum.PURCHASE_RETURN, request.Id, request.Attachments, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseReturnDetailReader.ReadAsync(_context, _calculationService, _objectStorageService, request.Id, cancellationToken);
            res.Message = "ضمیمه‌های مرجوعی با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
