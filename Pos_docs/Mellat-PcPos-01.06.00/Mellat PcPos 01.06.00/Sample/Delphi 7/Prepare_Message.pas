{*******************************************************}
{                                                       }
{       last update: 05 Tir 1397                       }
{                                                       }
{       Behpardakht Mellat                              }
{                                                       }
{*******************************************************}
unit Prepare_Message;

interface
uses SysUtils,Dateutils,UTools,Classes, check_parameter;


Function MESSAGE_Debit_Transaction(MoneyString:string;PayerIdString: string;Merchant_Message: AnsiString;MerchantAdditionalData : String) : TByteArr;

implementation

uses UConst;


Var
   Service_Code : string;
   JSonString : String;
Function MESSAGE_Debit_Transaction(MoneyString:string;PayerIdString: string;Merchant_Message: Ansistring;MerchantAdditionalData : String) : TByteArr;
Var
   SENDMessage_BYTE,Value : TByteArr;
Begin
   Service_Code :='1';
   SENDMessage_BYTE := nil;
   JSonString := '{"ServiceCode" :"1","Amount":"'+MoneyString+'","PayerId":"'+PayerIdString+'","MerchantMsg":"'+Merchant_Message+'","MerchantadditionalData":"'+MerchantAdditionalData+'" }';
   Value := ArrOfByte(JSonString,False);
   MergeArrays(SENDMessage_BYTE, Value);

   Result := SENDMessage_BYTE;

End;



end.
