{*******************************************************}
{                                                       }
{       last update: 05 Tir 1397                       }
{                                                       }
{       Behpardakht Mellat                              }
{                                                       }
{*******************************************************}

unit UTools;

interface

type
   //dynamic array type for Array of Byte
   TByteArr = array of byte;


function WideStringToString(const ws: WideString; codePage: Word): AnsiString;
function LeftPad(S: string; Ch: Char; Len: Integer): string;
function RightPad(S: string; Ch: Char; Len: Integer): string;
function NumStringToBCD(const inStr: string): string;
function BCDToNumString(const inStr: string): string;
function NumberToBCD(const inStr: string): TByteArr;
function ArrOfByte(AStr: String;IsDigit :Boolean): TByteArr;
procedure MergeArrays(var BaseArray: TByteArr; const ArrayToAdd: TByteArr);
procedure AddByteArrays(var BaseArray: TByteArr; const ByteADD: Byte);
Function BCDToString(Bytes: TByteArr) : string;
Function BCD2ByteArray(inArray : TByteArr): TByteArr;
Function Get_Result_Error_Name (MSG :String;English : Boolean) :String;
Function HexToAsc(strData:string): string;
Function InStr(Start: integer; Source: string; SourceToFind: string): integer;
Function Mid(Source: string; Start: integer; Length: integer): string;
Function NumToHexString(Num:UCS4String):String;
Function HexStringToNum(HexNum:String):longInt;
function IsStrANumber(const S: string): Boolean;
function StrToByte(const Value: String): TByteArr;
//function IntToBCD(Value : integer) : string;
Function ByteArrayToString(Bytes: TByteArr) : string;
Function ByteArrayToInteger(Bytes: TByteArr) : Integer;
Function ByteArrayToString64(Bytes: TByteArr) : string;
function ByteToHex(InByte:byte):shortstring;
function bintostr(const bin: array of byte): string;
function Merchanet_TO_Byte(AStr: String): TByteArr;
Function Get_Result_Error_Name_FROM_ERROR_CODE (ERORR_CODE :Integer) :String;
Function StringToBytes(const Value : String): TByteArr;


implementation

uses Math,SysUtils,StrUtils,Classes, Windows;
{
function IntToBCD(Value : integer) : string;
begin
   Result := IntToHex(Value div 10, 1) +IntToHex(Value mod 10, 1);
end;
 }

function WideStringToString(const ws: WideString; codePage: Word): AnsiString;
var
  l: integer;
begin
  if ws = '' then
    Result := ''
  else
  begin
    l := WideCharToMultiByte(codePage,
      WC_COMPOSITECHECK or WC_DISCARDNS or WC_SEPCHARS or WC_DEFAULTCHAR,
      @ws[1], - 1, nil, 0, nil, nil);
    SetLength(Result, l - 1);
    if l > 1 then
      WideCharToMultiByte(codePage,
        WC_COMPOSITECHECK or WC_DISCARDNS or WC_SEPCHARS or WC_DEFAULTCHAR,
        @ws[1], - 1, @Result[1], l - 1, nil, nil);
  end;
end; { WideStringToString }




function bintostr(const bin: array of byte): string;
const
   HexSymbols = '0123456789ABCDEF';
var
   i: integer;
begin
   SetLength(Result, 2*Length(bin));
   for i :=  0 to Length(bin)-1 do begin
      Result[1 + 2*i + 0] := HexSymbols[1 + bin[i] shr 4];
      Result[1 + 2*i + 1] := HexSymbols[1 + bin[i] and $0F];
   end;
end;
function bintoAscii(const bin: array of byte): AnsiString;
var i: integer;
begin
   SetLength(Result, Length(bin));
   for i := 0 to Length(bin)-1 do
   Result[1+i] := AnsiChar(bin[i]);
end;

function StrToByte(const Value: String): TByteArr;
var
    I: integer;
begin
    SetLength(Result, Length(Value));
    for I := 0 to Length(Value) - 1 do
        Result[I] := (ord(Value[I + 1])-48);
end;

function ByteToHex(InByte:byte):shortstring;
const Digits:array[0..15] of char='0123456789ABCDEF';
begin
   result:=digits[InByte shr 4]+digits[InByte and $0F];
end;

function HexToAsc(strData:string): string;
var
   sresult:string;
   sfinal:string;
   hexc:cardinal;
   i:integer;
begin
   i:=1;
   while i<=length(strData) do begin
      hexc := strtoint('$' + copy(strData,i,2));
      sresult := inttostr(hexc);
      sresult := chr(strtoint(sresult));
      sfinal := sfinal + sresult;
      i:=i+2;
   end;
   result := sfinal
end;
function InStr(Start: integer; Source: string; SourceToFind: string): integer;
begin
 	 Result := pos(SourceToFind,copy(Source,Start,Length(Source) - (Start - 1)));
end;
function Mid(Source: string; Start: integer; Length: integer): string;
begin
	 Result := copy(Source,Start,Length);
end;
function NumToHexString(Num:UCS4String):String;
var
  lw : LongWord;
  i : smallint;
begin
  Result := '';
  for I := 0 to Length(Num) - 1 do
  begin
  lw :=  Num[i];
  Result := Result +  IntToHex(lw,2);
  end;
end;
function HexStringToNum(HexNum:String):longInt;
begin
   Result := StrToInt('$'+HexNum);
end;
Function ByteArrayToInteger(Bytes: TByteArr) : Integer;
var i: integer;
    DataStr: string; // for storing the bytes as a string
begin
  DataStr := '';
  for I := 0 to Length(Bytes) - 1 do
    DataStr := DataStr + IntToStr(Bytes[i]);
    result := StrToIntDef(DataStr,0);
end;

Function ByteArrayToString64(Bytes: TByteArr) : string;
var
i: integer;
    DataStr: string; // for storing the bytes as a string
begin
   DataStr := '';
   for I := 0 to Length(Bytes) - 1 do
      DataStr := DataStr + IntToStr(Bytes[i]);
   result := DataStr;
end;


Function ByteArrayToString(Bytes: TByteArr) : string;
var i: integer;
    DataStr: string; // for storing the bytes as a string
begin
  DataStr := '';
  for I := 0 to Length(Bytes) - 1 do
    DataStr := DataStr + Char(Bytes[i]);
    result := DataStr;
end;
function ArrOfByte(AStr: String;IsDigit :Boolean): TByteArr;
var
   j: integer;
begin
   SetLength( Result, Length(AStr)) ;
   for j := 0 to Length(AStr) - 1 do
     if IsDigit then
        Result[j] := ord(AStr[j + 1])-48
     Else
        Result[j] := ord(AStr[j + 1]);

end;

function Merchanet_TO_Byte(AStr: String): TByteArr;
var
   NumberChars,j,i,L: integer;
   HesxString,HesxString_1,HesxString_2,HesxString_3,HesxString_4 : WideString;
   HexBytes : array of byte;
   //HByte : Tbytes;

begin

  HesxString := UpperCase(AStr);
   {Delphi7}
   HesxString_1 := StringReplace(HesxString,':','',[rfReplaceAll, rfIgnoreCase]);
   HesxString_2 := StringReplace(HesxString_1,'0x','',[rfReplaceAll, rfIgnoreCase]);
   HesxString_3 := StringReplace(HesxString_2,'\x','',[rfReplaceAll, rfIgnoreCase]);
   HesxString_4 := StringReplace(HesxString_3,'\X','',[rfReplaceAll, rfIgnoreCase]);
   {XE *}
   {
   HesxString_1 := ReplaceStr(HesxString,':','');
   HesxString_2 := ReplaceStr(HesxString_1,'0x','');
   HesxString_3 := ReplaceStr(HesxString_2,'\x','');
   HesxString_4 := ReplaceStr(HesxString_3,'\X','');
    }
   if ((Length(HesxString_4) Mod 2) = 0) Then Begin
       NumberChars := Length(HesxString_4);
       L := Trunc((NumberChars div 2));
       SetLength( Result, L) ;
       SetLength(HexBytes,L);
       i := 0;
       j := 1;
       While J < NumberChars+1  Do Begin
           Result[i]   :=  Byte(HexStringToNum(Copy(HesxString_4,J, 2)));
           HexBytes[i] :=  Byte(HexStringToNum(Copy(HesxString_4,J, 2)));
           J := J+2;
           inc(i);
       End;
   End;


       //HByte:= TEncoding.Unicode.GetBytes(Copy(HesxString_4,J, 2));
       //HByte:= TUnicodeEncoding.Unicode.GetBytes(HesxString_4);


end;
//function UTF8FromUTF16(const abytUTF16: TBytes): TBytes;
//begin
//   Result := TEncoding.Convert(TEncoding.Unicode, TEncoding.UTF8, abytUTF16);
//end;

procedure AddByteArrays(var BaseArray: TByteArr; const ByteADD: Byte);
begin
   SetLength(BaseArray, Length(BaseArray) + 1);
      BaseArray[High(BaseArray)] := ByteADD;
end;

procedure MergeArrays(var BaseArray: TByteArr; const ArrayToAdd: TByteArr);
var
   StartIndex, Index: Integer;
begin
   StartIndex := High(BaseArray) + 1;
   SetLength(BaseArray, Length(BaseArray) + Length(ArrayToAdd));
   for Index := Low(ArrayToAdd) to High(ArrayToAdd) do begin
      BaseArray[StartIndex] := ArrayToAdd[Index];
      Inc(StartIndex);
   end;
end;
Function BCD2ByteArray(inArray : TByteArr): TByteArr;

  Procedure UnPack(ch: byte;Var ch1 , ch2: Byte);
  begin
    ch1 := ch shr 4;
    ch2 := ch and $F;
    Assert((ch1 >= 0) and (ch1 <= 9));
    Assert((ch2 >= 0) and (ch2 <= 9));

  end;
var
  i: Integer;
Begin
    SetLength(Result, Length(inArray) * 2);
    for i := 0 to Length(inArray)-1 do
       UnPack(inArray[i],Result[2 * i ], Result[2 * i + 1]);

End;

Function ByteArray2BCD(inArray : TByteArr): TByteArr;

  function Pack(ch1, ch2: Byte): Byte;
  begin
    Assert((ch1 >= 0) and (ch1 <= 9));
    Assert((ch2 >= 0) and (ch2 <= 9));
    Result := (ch1 shl 4) or (ch2 and $F);//(Ord(ch1) and $F) or ((Ord(ch2) and $F) shl 4)
  end;
var
  i: Integer;
  TempArray : TByteArr;
Begin
  if Odd(Length(inArray)) then  Begin
    SetLength(TempArray,1);
    TempArray[0] := 0;
    MergeArrays(TempArray,inArray);
    Result := ByteArray2BCD(TempArray);
  End
  else begin
    SetLength(Result, Length(inArray) div 2);
    for i := 0 to Length(Result)-1 do
      Result[i] := Pack(inArray[2 * i ], inArray[2 * i + 1]);
  end;

End;

function LeftPad(S: string; Ch: Char; Len: Integer): string;
var
  RestLen: Integer;
begin
  Result  := S;
  RestLen := Len - Length(s);
  if RestLen < 1 then Exit;
  Result := S + StringOfChar(Ch, RestLen);
end;

function RightPad(S: string; Ch: Char; Len: Integer): string;
var
  RestLen: Integer;
begin
  Result  := S;
  RestLen := Len - Length(s);
  if RestLen < 1 then Exit;
  Result := StringOfChar(Ch, RestLen) + S;
end;

Function NumberToBCD(const inStr: string): TByteArr;
Begin

    result := ByteArray2BCD(ArrOfByte(instr,True));
End;
function NumStringToBCD(const inStr: string): string;
  function Pack(ch1, ch2: Char): Char;
  begin
    Assert((ch1 >= '0') and (ch1 <= '9'));
    Assert((ch2 >= '0') and (ch2 <= '9'));
      {Ord('0') is $30, so we can just use the low nybble of the character
       as value.}
    Result := Chr((Ord(ch1) and $F) or ((Ord(ch2) and $F) shl 4))
  end;
var
  i: Integer;
begin
  if Odd(Length(inStr)) then
    Result := NumStringToBCD('0' + instr)
  else begin
    SetLength(Result, Length(inStr) div 2);
    for i := 1 to Length(Result) do
      Result[i] := Pack(inStr[2 * i - 1], inStr[2 * i]);
  end;
end;

function BCDToNumString(const inStr: string): string;
  procedure UnPack(ch: Char; var ch1, ch2: Char);
  begin
    ch1 := Chr((Ord(ch) and $F) + $30);
    ch2 := Chr(((Ord(ch) shr 4) and $F) + $30);
    Assert((ch1 >= '0') and (ch1 <= '9'));
    Assert((ch2 >= '0') and (ch2 <= '9'));
  end;
var
  i: Integer;
begin
  SetLength(Result, Length(inStr) * 2);
  for i := 1 to Length(inStr) do
    UnPack(inStr[i], Result[2 * i - 1], Result[2 * i]);
end;


Function BCDToString(Bytes: TByteArr) : string;
var i: integer;
    DataStr: string; // for storing the bytes as a string
begin
  DataStr := '';

  for I := 0 to Length(Bytes) - 1 do
    DataStr := DataStr + BCDToNumString(intTostr(Bytes[i]));
    result := DataStr;
end;

function IsStrANumber1(const S: string): Boolean;
var
  P: PChar;
begin
  P      := PChar(S);
  Result := False;
  while P^ <> #0 do
  begin
    if not (P^ in ['0'..'9']) then Exit;
    Inc(P);
  end;
  Result := True;
end;

function IsStrANumber(const S: string): Boolean;
var
  i: Int64;
begin
  Result := TryStrToInt64(S,i);
end;

Function Get_Result_Error_Name (MSG :String;English : Boolean) :String;
Begin
   If MSG <> '' Then Begin
      if English then Begin
          If (MSG = 'FF') Then  Result := 'ERR_POS_ResultPONSE_RECEIVED_TOO_LATE'
          Else If (MSG = 'FE') Then  Result := 'ERR_POS_INVALID_DATA'
          Else If (MSG = 'FB') Then  Result := 'ERR_POS_INVALID_INPUT_AMOUNT'
          Else If (MSG = 'FT') Then  Result := 'ERR_POS_INVALID_MULTI_PAYMENT_AMOUNT'
          Else If (MSG = 'FC') Then  Result := 'ERR_POS_INVALID_INPUT_PAYERID'
          Else If (MSG = 'FI') Then  Result := 'ERR_POS_INVALID_INPUT_ADDITIONALDATA'
          Else If (MSG = 'FL') Then  Result := 'ERR_POS_UNCONFIRM_REC_DATA'
          Else If (MSG = 'FU') Then  Result := 'ERR_POS_USER_ABORT'
          Else If (MSG = 'FD') Then  Result := 'ERR_POS_TO_SEND_TRANSACTION'
          Else If (MSG = 'FA') Then  Result := 'ERR_POS_COMMUNICATION'
          Else If (MSG = 'FU') Then  Result := 'ERR_POS_USER_ABORT'
          Else If (MSG = 'FH') Then  Result := 'ERR_POS_INVALID_INPUT_ACCOUNTID'
          Else If (MSG = 'FG') Then  Result := 'ERR_POS_INVALID_INPUT_BILL_ID'
          Else If (MSG = 'FP') Then  Result := 'ERR_POS_INVALID_INPUT_PAYMENT_ID'
          Else If (MSG = 'FR') Then  Result := 'ERR_POS_PC_CRCERROR_INVALID_DATA'
          Else If (MSG = 'FM') Then  Result := 'ERR_POS_INVALID_INPUT_REFRENCE_NUMBER'
          Else If (MSG = 'FS') Then  Result := 'ERR_POS_PC_OTHER'
          Else If IsStrANumber(MSG) then Begin
               If (StrToInt(MSG) > 0) And (StrToInt(MSG) <100) Then
                   Result := 'ERR_POS_FAILED_TRANSACTION'
               Else
                   Result := Get_Result_Error_Name_FROM_ERROR_CODE (StrToInt(MSG));
          End
          Else Result := 'ERR_POS_PC_OTHER'
      End
      Else Begin
          If (MSG = 'FF') Then  Result := 'دریافت پاسخ تراکنش از مرکز مقدور نمی باشد'
          Else If (MSG = 'FE') Then  Result := 'طول پیام دریافتی از سیستم یا کد عملیات صحیح نمی باشد'
          Else If (MSG = 'FB') Then  Result := 'فرمت مبلغ دریافتی از سيستم صحیح نمی باشد'
          Else If (MSG = 'FT') Then  Result := 'ERR_POS_INVALID_MULTI_PAYMENT_AMOUNT'
          Else If (MSG = 'FC') Then  Result := 'ERR_POS_INVALID_INPUT_PAYERID'
          Else If (MSG = 'FI') Then  Result := 'ERR_POS_INVALID_INPUT_ADDITIONALDATA'
          Else If (MSG = 'FL') Then  Result := 'مبلغ دریافتی تایید نگردید'
          Else If (MSG = 'FU') Then  Result := 'انجام تراکنش توسط کاربر لغو گردید'
          Else If (MSG = 'FD') Then  Result := 'ERR_POS_TO_SEND_TRANSACTION'
          Else If (MSG = 'FA') Then  Result := 'برقراری ارتباط پایانه با مرکز مقدور نمی باشد'
          Else If (MSG = 'FU') Then  Result := 'ERR_POS_USER_ABORT'
          Else If (MSG = 'FH') Then  Result := 'ERR_POS_INVALID_INPUT_ACCOUNTID'
          Else If (MSG = 'FG') Then  Result := 'ERR_POS_INVALID_INPUT_BILL_ID'
          Else If (MSG = 'FP') Then  Result := 'ERR_POS_INVALID_INPUT_PAYMENT_ID'
          Else If (MSG = 'FR') Then  Result := 'کد همگام سازی سیستم با دستگاه یکسان نمی باشد'
          Else If (MSG = 'FM') Then  Result := 'ERR_POS_INVALID_INPUT_REFRENCE_NUMBER'
          Else If (MSG = 'FS') Then  Result := 'ERR_POS_PC_OTHER'
          Else If IsStrANumber(MSG) then Begin
                 If (StrToInt(MSG) > 0) And (StrToInt(MSG) <100)Then
                     Result := 'ERR_POS_FAILED_TRANSACTION'
                 Else
                   Result := Get_Result_Error_Name_FROM_ERROR_CODE (StrToInt(MSG));
          End

          Else Result := 'ERR_POS_PC_OTHER'
      End;

   End
   Else
      Result := 'ERR_POS_PC_OTHER';
End;
//---------------------------------

Function Get_Result_Error_Name_FROM_ERROR_CODE (ERORR_CODE :Integer) :String;
Begin
   Case ERORR_CODE of
       100 : Result :='RET_OK';
       101 : Result :='ERR_PC_INVALID_REC_SIZE';
       102 : Result :='ERR_POS_INVALID_DATA';
       103 : Result :='ERR_PC_INVALID_REC_PROCESS_CODE';
       104 : Result :='ERR_PC_INVALID_AMOUNT';
       105 : Result :='ERR_PC_INVALID_INPUT_PAYERID';
       106 : Result :='ERR_PC_INVALID_INPUT_TIMEOUT';
       107 : Result :='ERR_PC_PORT_TIMEOUT_FOR_REC';
       108 : Result :='ERR_POS_RESPONSE_RECEIVED_TOO_LATE';
       109 : Result :='ERR_POS_FAILED_TRANSACTION';
       110 : Result :='ERR_POS_PRINTER';
       111 : Result :='ERR_POS_COMMUNICATION';
       112 : Result :='ERR_POS_TO_SEND_TRANSACTION';
       113 : Result :='ERR_PC_INVALID_INPUT_PORTNAME';
       114 : Result :='ERR_POS_USER_ABORT';
       115 : Result :='ERR_PC_INVALID_INPUT_BILLID';
       116 : Result :='ERR_PC_INVALID_INPUT_PAYID';
       117 : Result :='ERR_PC_PORT_OPEN_FAILED';
       118 : Result :='ERR_PC_PORT_ACCESS_FAILED';
       119 : Result :='ERR_PC_INVALID_PORT_STATE';
       120 : Result :='ERR_PC_INVALID_PORT_PARAMETERS';
       121 : Result :='ERR_PC_INVALID_PORT_NAME';
       122 : Result :='ERR_PC_NULL_STR_TO_WRITE_IN_PORT';
       123 : Result :='ERR_PC_PORT_TIMEOUT_FOR_SEND';
       124 : Result :='ERR_POS_CARD_SWIPE_FAILED';
       125 : Result :='ERR_PC_INVALID_INPUT_ACCOUNTID';

       126 : Result :='ERR_POS_INVALID_INPUT_ACCOUNTID';
       127 : Result :='ERR_POS_INVALID_INPUT_PAYERID';
       128 : Result :='ERR_POS_INVALID_INPUT_AMOUNT';
       129 : Result :='ERR_POS_INVALID_INPUT_REFRENCE_NUMBER';
       130 : Result :='ERR_POS_INVALID_INPUT_BILL_ID';
       131 : Result :='ERR_POS_INVALID_INPUT_PAYMENT_ID';
       132 : Result :='ERR_POS_INVALID_INPUT_ADDITIONALDATA';
       133 : Result :='ERR_POS_INVALID_MULTI_PAYMENT_AMOUNT';
       134 : Result :='ERR_POS_UNCONFIRM_REC_DATA';

       161 : Result :='ERR_PC_INVALID_INPUT_MULTI_PAYMENT_REQUEST_LIST';
       162 : Result :='ERR_PC_INVALID_INPUT_MULTI_PAYMENT_AMOUNT';
       163 : Result :='ERR_PC_INVALID_INPUT_REFERENCE_NUMBER';
       164 : Result :='ERR_POS_PC_CRCERROR_INVALID_DATA';
       165 : Result :='ERR_PC_INVALID_POSPC_COMMUNICATION_TYPE';
       166 : Result :='ERR_PC_INVALID_INPUT_TCP_SOCKET_PORT';
       167 : Result :='ERR_PC_INVALID_INPUT_TCP_SOCKET_RECEIVED_TIMEOUT';
       168 : Result :='ERR_PC_TCP_SOCKET_FAILED';
       169 : Result :='ERR_PC_TCP_SOCKET_SEND_MSG_FAILED';
       170 : Result :='ERR_PC_TCP_SOCKET_RECEIVED_MSG_FAILED';
       176 : Result :='ERR_PC_INVALID_LEN_ADDITIONAL_DATA';
       200 : Result :='ERR_POS_PC_INVALID_COMMUNICATION_TYPE';
      Else
         Result := 'ERR_POS_PC_OTHER';
   End;

End;

Function StringToBytes(const Value : String): TByteArr;
var
    I: integer;
begin
    SetLength(Result, Length(Value)-1);
    for I := 0 to Length(Value) - 1 do
        Result[I] := ord(Value[I + 1]);

End;





end.
