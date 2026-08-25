using System.Net.Http.Json;
using System.Text.Json.Serialization;
using PosIntegration.Models;

namespace PosIntegration.Clients
{
    // Talks to the local Sadad PcPos REST/WCF service (Sadad.PcPos.WinService.exe) that must be
    // running on the till machine - never to the physical reader directly. The Sadad.PcPos.Core.dll
    // path is x86/.NET-Framework-only and can't be referenced from net10.0, so this is the only
    // viable integration route for a modern backend. Field names below follow the PosResult shape
    // used by the vendor's own DLL sample (Main.cs); verify against "PcPos REST API User Manual.pdf"
    // before going live, since the REST body/response field casing wasn't confirmed byte-for-byte.
    public class MelliPosDeviceClient : IPosDeviceClient
    {
        private readonly HttpClient _httpClient;

        public PosVendor Vendor => PosVendor.Melli;

        public MelliPosDeviceClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<PosSaleResult> SaleAsync(PosSaleRequest request, CancellationToken cancellationToken = default)
        {
            var body = new MelliSaleRequest
            {
                Amount = request.Amount.ToString(),
                OrderId = request.InvoiceNumber,
                AdditionalData = request.AdditionalData,
                TerminalId = request.TerminalId,
                MerchantId = request.MerchantId
            };

            using var response = await _httpClient.PostAsJsonAsync(
                $"http://{request.Host}:{request.Port}/api/sale", body, cancellationToken);

            var rawResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<MelliSaleResponse>(cancellationToken)
                ?? new MelliSaleResponse();

            return new PosSaleResult
            {
                IsSuccess = result.ResponseCode == "0",
                ResponseCode = result.ResponseCode ?? "",
                ResponseMessage = result.ResponseCodeMessage ?? "",
                Rrn = result.Rrn,
                ApprovalCode = result.ApprovalCode,
                MaskedCardNumber = result.CardNo,
                TerminalId = result.TerminalId,
                TransactionDate = result.TransactionDate,
                RawResponse = rawResponse
            };
        }

        private class MelliSaleRequest
        {
            [JsonPropertyName("Amount")]
            public string Amount { get; set; } = "";

            [JsonPropertyName("OrderId")]
            public string? OrderId { get; set; }

            [JsonPropertyName("AdditionalData")]
            public string? AdditionalData { get; set; }

            [JsonPropertyName("TerminalId")]
            public string? TerminalId { get; set; }

            [JsonPropertyName("MerchantId")]
            public string? MerchantId { get; set; }
        }

        private class MelliSaleResponse
        {
            public string? ResponseCode { get; set; }
            public string? ResponseCodeMessage { get; set; }
            public string? Rrn { get; set; }
            public string? ApprovalCode { get; set; }
            public string? CardNo { get; set; }
            public string? TerminalId { get; set; }
            public string? TransactionDate { get; set; }
        }
    }
}
