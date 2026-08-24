{*******************************************************}
{                                                       }
{       last update: 05 Tir 1397                       }
{                                                       }
{       Behpardakht Mellat                              }
{                                                       }
{*******************************************************}

unit Application_Layer;
interface
uses Prepare_Message, Prepare_Received_Message, Result_Transaction,Classes,
   Check_Parameter,UTools,Send_And_Received_TCP;
Type
  TApplication_Layer = class{(TComponent)}
  Private
    R : Result_Transaction_Table;
    fResponse_Second :Integer;
    MediaTCP : TPOS_Media_TCP;
    fPortNumber : Integer;
    fIpAddress : String;


  Public

    constructor Create(IpAddress : String;PortNumber : Integer;Response_Second :Integer);overload;

    Function POS_PC_Debits_Goods_And_Service(Str_Money : String;Str_Payerid : String;Str_Merchant : String;Var Result_Message : String;MerchantAdditionalData : String ='') : Result_Transaction_Table;
    Function POS_PC_Bill_Payment_Service(Str_Money : String;Str_BillId : String;Str_PayId : String;Str_Merchant : String;Var Result_Message : String;MerchantAdditionalData : String ='') : Result_Transaction_Table;
    Function POS_PC_Payment(Str_Money : String;Str_Payerid : String;Str_AccountId : String;Var Result_Message : String;MerchantAdditionalData : String ='') : Result_Transaction_Table;

    destructor Destroy; override;
End;

implementation


destructor TApplication_Layer.Destroy;
Begin
    inherited;
    If (MediaTCP <> nil) Then Begin
       MediaTCP.Free;
       MediaTCP := nil;
    End;

End;

constructor TApplication_Layer.Create(IpAddress : String;PortNumber : Integer;Response_Second :Integer);
Begin
    fResponse_Second := Response_Second;
    fPortNumber := PortNumber;
    fIpAddress :=  IpAddress;

    MediaTCP := TPOS_Media_TCP.Create;
    R := Result_Transaction_Table.Create;
End;

Function TApplication_Layer.POS_PC_Debits_Goods_And_Service(Str_Money : String;Str_Payerid : String;Str_Merchant : String; Var Result_Message : String;MerchantAdditionalData : String ='') : Result_Transaction_Table;
Var
   READ_Message : TByteArr;
Begin
      Result := R;
      If AmountValidity(Str_Money,Result_Message) And PayerIDValidity(Str_Payerid,Result_Message) Then Begin
          MediaTCP.Config_TCP_IP(fIpAddress, fPortNumber,fResponse_Second);
          MediaTCP.Send_Message_Then_Read_Data((Prepare_Message.MESSAGE_Debit_Transaction(Str_Money,Str_Payerid,Str_Merchant,MerchantAdditionalData)),READ_Message,fResponse_Second,Result_Message);
          Prepare_Received_Message.Fill_Result_Transaction_From_Byte(READ_Message,Result_Message,Result);

      End;


End;

Function TApplication_Layer.POS_PC_Bill_Payment_Service(Str_Money : String;Str_BillId : String;Str_PayId : String;Str_Merchant : String;Var Result_Message : String;MerchantAdditionalData : String ='') : Result_Transaction_Table;
Var
   READ_Message : TByteArr;
Begin
{
      Result := R;
      If AmountValidity(Str_Money,Result_Message) And BillIDValidity(Str_BillId,Result_Message) And PayIDValidity(Str_PayId,Result_Message) Then Begin
          MediaTCP.Config_TCP_IP(fPortNumber,fResponse_Second);
          MediaTCP.Send_Message_Then_Read_Data((Prepare_Message.MESSAGE_Bill_Transaction(Str_Money,Str_BillId,Str_PayId,Str_Merchant,MerchantAdditionalData)),READ_Message,fResponse_Second,Result_Message);
          Prepare_Received_Message.IS_OK_Received_Bill_Message(READ_Message,Str_Money,Result_Message,Result );
      End;
      }
End;

Function TApplication_Layer.POS_PC_Payment(Str_Money : String;Str_Payerid : String;Str_AccountId : String;Var Result_Message : String;MerchantAdditionalData : String ='') : Result_Transaction_Table;
Var
   READ_Message : TByteArr;
Begin
{
      Result := R;
      If AmountValidity(Str_Money,Result_Message) And PayerIDValidity(Str_Payerid,Result_Message)
         And AccountIDValidity(Str_AccountId,Result_Message) Then Begin
          MediaTCP.Config_TCP_IP(fPortNumber,fResponse_Second);
          MediaTCP.Send_Message_Then_Read_Data((Prepare_Message.MESSAGE_Payment_Transaction(Str_Money,Str_Payerid,Str_AccountId,'',MerchantAdditionalData)),READ_Message,fResponse_Second,Result_Message);
          Prepare_Received_Message.IS_OK_Received_Peyment_Message(READ_Message,Str_Money,Result_Message,Result );
      End;
      }
End;


end.
