{*******************************************************}
{                                                       }
{       last update: 05 Tir 1397                       }
{                                                       }
{       Behpardakht Mellat                              }
{                                                       }
{*******************************************************}

unit Send_And_Received_TCP;

interface

uses  SysUtils, Dateutils,UTools,Sockets;
Type

   TPOS_Media_TCP = Class
   PC_TCP_Server    : TTcpClient;

  Protected
     fResponseTime : Integer; 
     fReceiveMessage  : String;
     fResultMessage   : String;
     fSendBuf :  TByteArr;
     fRecBuf : TByteArr;
     fRecSize : Integer;
  public
    { Public declarations }
     constructor Create();

     Procedure Config_TCP_IP(IpAddress : String;PortNumber : Integer;RespnoseTime : Integer);
     Function Send_Message_Then_Read_Data(Send_Message : TByteArr;Var Rec_Message : TByteArr; ResponseTime : Integer;Var Result_Message : String) : String;
     destructor Destroy; override;

  Published
    property Rec_Buf: TByteArr read fRecBuf;
End;
implementation

uses Prepare_Message, Prepare_Received_Message,UConst;

   Constructor TPOS_Media_TCP.Create();
   Begin
      PC_TCP_Server := TTcpClient.Create(PC_TCP_Server);
      


   End;
   destructor TPOS_Media_TCP.Destroy;
   Begin
      inherited ;
      PC_TCP_Server.Free;
      PC_TCP_Server := nil;
   End;
   Procedure TPOS_Media_TCP.Config_TCP_IP(IpAddress : String;PortNumber : Integer;RespnoseTime : Integer);
   Begin
       PC_TCP_Server.RemoteHost := IpAddress;
       PC_TCP_Server.RemotePort := IntToStr(PortNumber);
       PC_TCP_Server.BlockMode := bmBlocking;
       fResponseTime := RespnoseTime;
   End;

   Function TPOS_Media_TCP.Send_Message_Then_Read_Data(Send_Message : TByteArr;Var Rec_Message : TByteArr; ResponseTime : Integer;Var Result_Message : String) : String;
   Var
     
      IsTimeOut : Boolean;
       Buffer : array[0..MAX_BUF] of byte;
   Begin
      If Not PC_TCP_Server.Active then
         PC_TCP_Server.Active := True;
     
      fRecSize := 0;
      SetLength(fSendBuf,Length(Send_Message));
      fSendBuf := Send_Message;
     
      PC_TCP_Server.SendBuf(fSendBuf[0],Length(fSendBuf),0);
      IsTimeOut := PC_TCP_Server.WaitForData(fResponseTime*1000);
      If (Not IsTimeOut) then Begin
        fResultMessage := 'ERR_PC_PORT_TIMEOUT_FOR_REC';
        Result_Message := fResultMessage;
        Result := fResultMessage;
      End
      Else Begin
          
          fRecSize := PC_TCP_Server.ReceiveBuf(Buffer,MAX_BUF,0);
          SetLength(fRecBuf,fRecSize);
          Move(Buffer[0], fRecBuf[0], SizeOf(Byte)*fRecSize);

          If (fRecSize > 0) then  Begin
             Rec_Message := fRecBuf;
          End
          Else Begin
             Rec_Message := fRecBuf;
             fResultMessage := 'ERR_POS_PC_OTHER';
             Result_Message := fReceiveMessage;
             Result := Result_Message;
          End;
      End;

      PC_TCP_Server.Active := False;


   End;




end.
