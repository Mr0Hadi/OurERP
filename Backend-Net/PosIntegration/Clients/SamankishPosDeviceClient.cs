using Microsoft.AspNet.SignalR.Client;
using PosIntegration.Models;

namespace PosIntegration.Clients
{
    // Talks to the local SSP1126WindowsService.exe (OWIN self-hosted, legacy ASP.NET SignalR 2.x -
    // NOT SignalR Core, hence the Microsoft.AspNet.SignalR.Client package) that must be running on
    // the till machine. Hub name and method/event shapes come from Sample(SSP1126)Page.html.
    //
    // request.Host/request.Port address the SignalR hub itself (the till's bridge process, default
    // port 8080). request.ComPort, if set, is passed as the reader's serial port (MediaType=0);
    // otherwise the reader is assumed reachable at request.Host over the network (MediaType=1) -
    // there is no separate "device IP" field in the shared PosSaleRequest shape, so a
    // serial-attached reader on the same till PC is the expected common case.
    public class SamankishPosDeviceClient : IPosDeviceClient
    {
        private static readonly TimeSpan TransactionTimeout = TimeSpan.FromSeconds(120);

        public PosVendor Vendor => PosVendor.Samankish;

        public async Task<PosSaleResult> SaleAsync(PosSaleRequest request, CancellationToken cancellationToken = default)
        {
            var hubConnection = new HubConnection($"http://{request.Host}:{request.Port}/");
            var hub = hubConnection.CreateHubProxy("SSP1126HUB");

            var systemReady = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var transactionResult = new TaskCompletionSource<PosSaleResult>(TaskCreationOptions.RunContinuationsAsynchronously);

            hub.On<string>("GetSystemResponse", message => systemReady.TrySetResult(message == "0"));

            hub.On<string, string, string, string, string, string>("GetTransactionResponse",
                (terminalId, responseCode, serialId, rrn, responseDescription, txnDate) =>
                {
                    transactionResult.TrySetResult(new PosSaleResult
                    {
                        IsSuccess = responseCode == "0",
                        ResponseCode = responseCode,
                        ResponseMessage = responseDescription,
                        Rrn = rrn,
                        TerminalId = terminalId,
                        TransactionDate = txnDate,
                        RawResponse = $"TerminalId={terminalId};ResponseCode={responseCode};SerialId={serialId};Rrn={rrn};ResponseDescription={responseDescription};TxnDate={txnDate}"
                    });
                });

            try
            {
                await hubConnection.Start();

                var mediaType = string.IsNullOrEmpty(request.ComPort) ? "1" : "0";
                await hub.Invoke("Initial", mediaType, request.Host, request.ComPort ?? "", "0", "0");

                using (cancellationToken.Register(() => systemReady.TrySetCanceled()))
                {
                    var ready = await systemReady.Task.WaitAsync(TransactionTimeout, cancellationToken);
                    if (!ready)
                    {
                        return new PosSaleResult
                        {
                            IsSuccess = false,
                            ResponseCode = "-1",
                            ResponseMessage = "دستگاه کارتخوان آماده دریافت تراکنش نیست."
                        };
                    }
                }

                await hub.Invoke("SendAmount1Step", request.Amount.ToString(), "", request.AdditionalData,
                    request.InvoiceNumber, "null", request.TerminalId ?? "");

                using (cancellationToken.Register(() => transactionResult.TrySetCanceled()))
                {
                    return await transactionResult.Task.WaitAsync(TransactionTimeout, cancellationToken);
                }
            }
            finally
            {
                hubConnection.Stop();
                hubConnection.Dispose();
            }
        }
    }
}
