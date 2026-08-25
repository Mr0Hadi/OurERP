using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using PosIntegration.Models;

namespace PosIntegration.Clients
{
    // Talks to the local WebPCPOS.exe bridge (OWIN+Nancy console app) that must be running on the
    // till machine. The bridge itself encodes to BTLV/Windows-1256 and speaks raw TCP to the device
    // controller - we only ever see its JSON POST /pcpos contract, matching SampleHtml/html_pcpos.html.
    public class ParsianPosDeviceClient : IPosDeviceClient
    {
        private readonly HttpClient _httpClient;

        public PosVendor Vendor => PosVendor.Parsian;

        public ParsianPosDeviceClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<PosSaleResult> SaleAsync(PosSaleRequest request, CancellationToken cancellationToken = default)
        {
            var body = new ParsianRequest
            {
                Pr = "000000",
                Am = request.Amount.ToString(),
                Cu = request.CurrencyCode,
                Ad = request.AdditionalData,
                Pd = "1",
                Sv = request.MerchantId,
                Sg = request.TerminalId
            };

            using var response = await _httpClient.PostAsJsonAsync(
                $"http://{request.Host}:{request.Port}/pcpos", body, cancellationToken);

            var rawResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = JsonSerializer.Deserialize<ParsianResponse>(rawResponse) ?? new ParsianResponse();

            // The response BTLV tag dictionary (which tag carries RRN/approval code/masked PAN)
            // is documented in the vendor's Help.pdf, not covered by the files inspected for this
            // integration - resp_code/resp_msg are the only fields whose meaning is confirmed.
            // RawResponse below preserves the full resp_tlv tree so those fields can still be read
            // once the tag dictionary is confirmed.
            return new PosSaleResult
            {
                IsSuccess = result.RespCode == 0,
                ResponseCode = result.RespCode.ToString(),
                ResponseMessage = result.RespMsg ?? "",
                RawResponse = rawResponse
            };
        }

        private class ParsianRequest
        {
            [JsonPropertyName("PR")]
            public string Pr { get; set; } = "";

            [JsonPropertyName("AM")]
            public string Am { get; set; } = "";

            [JsonPropertyName("CU")]
            public string Cu { get; set; } = "";

            [JsonPropertyName("R1")]
            public string R1 { get; set; } = "";

            [JsonPropertyName("R2")]
            public string R2 { get; set; } = "";

            [JsonPropertyName("T1")]
            public string T1 { get; set; } = "";

            [JsonPropertyName("T2")]
            public string T2 { get; set; } = "";

            [JsonPropertyName("SV")]
            public string? Sv { get; set; }

            [JsonPropertyName("SG")]
            public string? Sg { get; set; }

            [JsonPropertyName("AD")]
            public string Ad { get; set; } = "";

            [JsonPropertyName("PD")]
            public string Pd { get; set; } = "1";
        }

        private class ParsianResponse
        {
            [JsonPropertyName("resp_tlv")]
            public JsonElement? RespTlv { get; set; }

            [JsonPropertyName("resp_code")]
            public int RespCode { get; set; } = -1;

            [JsonPropertyName("resp_msg")]
            public string? RespMsg { get; set; }
        }
    }
}
