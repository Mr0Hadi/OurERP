{*******************************************************}
{                                                       }
{       last update: 24 Mordad 1395                       }
{                                                       }
{       Behpardakht Mellat                              }
{                                                       }
{*******************************************************}

unit Check_Parameter;

interface
uses UTools;

Function AmountValidity(InputAmount : String;Var Result_Message : String) : Boolean;
Function PayerIDValidity(InputPayerID : string;Var Result_Message : String) : Boolean;
Function BillIDValidity(InputBillID : string;Var Result_Message : String) : Boolean;
Function PayIDValidity(InputPayID : string;Var Result_Message : String) : Boolean;
Function AccountIDValidity(InputAccountID : string;Var Result_Message : String) : Boolean;
Function ReferenceNumberValidity(InputReferenceNumber : string;Var Result_Message : String) : Boolean;
Function MerchantAddDataValidity(InputMerchantAdditionalData : String;Var Result_Message : String) : Boolean;
Const
   MerchantDataSize = 100;
implementation

Function AmountValidity(InputAmount : String;Var Result_Message : String) : Boolean;
Begin
   Result_Message := '';
   Result := True;
   If (Length(InputAmount)= 0) Then Result := False;
   If (Length(InputAmount)> 12) Then Result := False;
   If Not IsStrANumber(InputAmount) Then Result := False;
   If InputAmount ='0' Then
      Result := False;
   if Result = False then
      Result_Message := 'ERR_PC_INVALID_AMOUNT';

End;
Function PayerIDValidity(InputPayerID : string;Var Result_Message : String) : Boolean;

Begin
    Result := True;
    if InputPayerID <> '' then Begin
       If (Length(InputPayerID)<> 0) Then
           If (((Length(InputPayerID)) < 3) Or ((Length(InputPayerID))>17)) Then
              Result := False;
       If Not IsStrANumber(InputPayerID) Then Result := False;
   End;
   if Result = False then
      Result_Message := 'ERR_PC_INVALID_INPUT_PAYERID'
   Else
      Result_Message := '';

 End;

Function BillIDValidity(InputBillID : string;Var Result_Message : String) : Boolean;
Begin
   Result := True;

   If (((Length(InputBillID )) < 6) Or ((Length(InputBillID ))>18)) Then
           Result := False;
   If Not IsStrANumber(InputBillID ) Then
      Result := False;
   If InputBillID ='0' Then
      Result := False;
   if Result = False then
      Result_Message := 'ERR_PC_INVALID_INPUT_BILLID'
   Else
      Result_Message := '';

End;
Function PayIDValidity(InputPayID : string;Var Result_Message : String) : Boolean;
Begin
   Result := True;

   If (((Length(InputPayID )) < 6) Or ((Length(InputPayID ))>18)) Then
           Result := False;
   If InputPayID ='0' Then
      Result := False;
   If Not IsStrANumber(InputPayID ) Then Result := False;

   if Result = False then
      Result_Message := 'ERR_PC_INVALID_INPUT_PAYID'
   Else
      Result_Message := '';

End;

Function AccountIDValidity(InputAccountID : string;Var Result_Message : String) : Boolean;
Begin
   Result := True;

   If (Length(InputAccountID )=0) Then
           Result := False;
   If (Length(InputAccountID )>20) Then
           Result := False;
   If InputAccountID ='0' Then
      Result := False;
   If Not IsStrANumber(InputAccountID ) Then Result := False;

   if Result = False then
      Result_Message := 'ERR_PC_INVALID_INPUT_ACCOUNTID'
   Else
      Result_Message := '';
End;
Function ReferenceNumberValidity(InputReferenceNumber : string;Var Result_Message : String) : Boolean;
Begin
   Result := True;
   If (Length(InputReferenceNumber )=0) Then
           Result := False;
   If (Length(InputReferenceNumber)>18) Then
           Result := False;
   If InputReferenceNumber ='0' Then
      Result := False;
   If Not IsStrANumber(InputReferenceNumber ) Then Result := False;

   if Result = False then
      Result_Message := 'ERR_PC_INVALID_INPUT_REFERENCE_NUMBER'
   Else
      Result_Message := '';

End;
Function MerchantAddDataValidity(InputMerchantAdditionalData : String;Var Result_Message : String) : Boolean;
Begin
   Result_Message := '';
   Result := True;
   If (Length(InputMerchantAdditionalData)> MerchantDataSize) Then
      Result := False;
   if Result = False then
      Result_Message := 'ERR_PC_INVALID_LEN_ADDITIONAL_DATA';

End;
end.
