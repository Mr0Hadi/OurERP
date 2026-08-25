{*******************************************************}
{                                                       }
{       last update: 05 Tir 1397                       }
{                                                       }
{       Behpardakht Mellat                              }
{                                                       }
{*******************************************************}
unit Prepare_Received_Message;

interface
uses SysUtils,Dateutils,UTools,Result_Transaction, uLkJSON ;

Procedure Fill_Result_Transaction_From_Byte(vTemp_Byte : TByteArr;Var Result_Message : String;Var Result_Table: Result_Transaction_Table);implementation

uses UConst, Variants;

Procedure Fill_Result_Transaction_From_Byte(vTemp_Byte : TByteArr;Var Result_Message : String;Var Result_Table: Result_Transaction_Table);
Var

  js:TlkJSONobject;
  S : String;
  Result_Trans : Result_Transaction_Table;
Begin
     Result_Trans := Result_Table;
     If Length(vTemp_Byte) <> 0 then  Begin
         s := ByteArrayToString(vTemp_Byte);
         js := TlkJSON.ParseText(s) as TlkJSONobject;
         Result_Trans.Set_Result_ReqId(VarToStr(js.Field['ReqID'].Value));
         Result_Trans.Set_Result_SerialTransaction(VarToStr(js.Field['SerialTransaction'].Value));
         Result_Trans.Set_Result_TraceNumber(VarToStr(js.Field['TraceNumber'].Value));
         Result_Trans.Set_Result_TerminalNo(VarToStr(js.Field['TerminalNo'].Value));
         Result_Trans.Set_Result_TransactionDate(VarToStr(js.Field['TransactionDate'].Value));
         Result_Trans.Set_Result_TransactionTime(VarToStr(js.Field['TransactionTime'].Value));
         Result_Trans.Set_Result_PAN(VarToStr(js.Field['PAN'].Value));
         Result_Trans.Set_Result_AccountNo(VarToStr(js.Field['AccountNo'].Value));
         Result_Trans.Set_Result_ReasonCode(VarToStr(js.Field['ReasonCode'].Value));
         Result_Trans.Set_Result_ReturnCode(VarToStr(js.Field['ReturnCode'].Value));
         Result_Trans.Set_Result_PcId(VarToStr(js.Field['PcID'].Value));
         Result_Trans.Set_Result_TotalAmount(VarToStr(js.Field['TotalAmount'].Value));
         Result_Trans.Set_Result_DiscountAmount(VarToStr(js.Field['DiscountAmount'].Value));
         If (Result_Trans.Result_ReturnCode = '00') Then Begin
             Result_Message := 'RET_OK';
         End
         Else
            Result_Message := Get_Result_Error_Name (Result_Trans.Result_ReturnCode, True);
     End;
     Result_Table := Result_Trans;
End;

end.
