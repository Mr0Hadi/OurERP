{*******************************************************}
{                                                       }
{       last update: 05 Tir 1397                       }
{                                                       }
{       Behpardakht Mellat                              }
{                                                       }
{*******************************************************}
unit UConst;

interface


Const MAX_BUF  = 512;
type
    Return_codes =
        (
            RET_OK = 100,
            ERR_PC_INVALID_REC_SIZE = 101,              //* DLL */   /* The receive Message size is not valid */
            ERR_POS_INVALID_DATA = 102,                 //* FE */    /* The receive data is invalid */
            ERR_PC_INVALID_REC_PROCESS_CODE = 103,      //* DLL */   /* The Process code in receive message is not valid */
            ERR_PC_INVALID_AMOUNT = 104,                //* DLL */   /* The input amount is not valid or the amount in receive message not equal with input amount */
            ERR_PC_INVALID_INPUT_PAYERID = 105,         //* DLL */    /* The input IdCode is not valid */
            ERR_PC_INVALID_INPUT_TIMEOUT = 106,         //* DLL */   /* The input timeout is not valid */
            ERR_PC_PORT_TIMEOUT_FOR_REC = 107,          //* DLL */   /* The operation did not complete before the time-out period ended */
            ERR_POS_RESPONSE_RECEIVED_TOO_LATE = 108,   //* FF */    /* Transaction failed because of Timeout occured to rec response from switch */
            ERR_POS_FAILED_TRANSACTION = 109,           //* F39 */   /* Transaction failed because of Field 39 has a value between 01 to 99 */
            ERR_POS_PRINTER = 110,//* not used */,       //* -- */    /* Transaction failed because of printer error *///@ TODO 01.03.07 not used
            ERR_POS_COMMUNICATION = 111,                //* FA */    /* Transaction failed because of connection error */
            ERR_POS_TO_SEND_TRANSACTION = 112,          //* FD */    /* Transaction failed for example: POS could not send settlement, reversal, generate serial, ... message to the server */
            ERR_PC_INVALID_INPUT_PORTNAME = 113,        //* DLL */   /* The input port name is not valid */
            ERR_POS_USER_ABORT = 114,                   //* FU */    /* Transaction failed because of user abort or  timeout on confirm data */
            ERR_PC_INVALID_INPUT_BILLID = 115,          //* DLL */   /* The input billid is not valid */
            ERR_PC_INVALID_INPUT_PAYID = 116,           //* DLL */   /* The input pay id is not valid */
            ERR_PC_PORT_OPEN_FAILED = 117,              //* DLL */   /* The specified port is open */
            ERR_PC_PORT_ACCESS_FAILED = 118,            //* DLL */   /* Access is denied to the port */
            ERR_PC_INVALID_PORT_STATE = 119,            //* DLL */   /* The port is in an invalid state */
            ERR_PC_INVALID_PORT_PARAMETERS = 120,       //* DLL */   /* One or more of the properties for this instance are invalid */
            ERR_PC_INVALID_PORT_NAME = 121,             //* DLL */   /* The Port Name is not valid */
            ERR_PC_NULL_STR_TO_WRITE_IN_PORT = 122,     //* DLL */   /* str is a null reference (Nothing in Visual Basic)*/
            ERR_PC_PORT_TIMEOUT_FOR_SEND = 123,         //* DLL */   /* The operation did not complete before the time-out period ended */
            ERR_POS_CARD_SWIPE_FAILED = 124,            //* DLL */   /* The Card has not been swiped */
            ERR_PC_INVALID_INPUT_ACCOUNTID = 125,       //* DLL */    /* The input AccountID is not valid */ //@ ver 01.03.8 bayare tafkik pos ba pc jodash kardam
            // until ver 01.03.05
            //* ---- from 126 to 160 reserve for pos error thate pos wait for new data */
            //*pos w8*/
            ERR_POS_INVALID_INPUT_ACCOUNTID = 126,       //* FH */    /* The input AccountID is not valid */
            ERR_POS_INVALID_INPUT_PAYERID = 127,         //* FC */    /* The input IdCode is not valid */
            ERR_POS_INVALID_INPUT_AMOUNT = 128,          //* FB */    /* Transaction failed because of invalid amount */
            ERR_POS_INVALID_INPUT_REFRENCE_NUMBER = 129,     //* FM */    /* The input Reference number is not valid on pos */
            ERR_POS_INVALID_INPUT_BILL_ID = 130,         //* FG */    /* The input bill id is not valid on pos */
            ERR_POS_INVALID_INPUT_PAYMENT_ID = 131,      //* FP */    /* The input Pay id is not valid on pos */
            ERR_POS_INVALID_INPUT_ADDITIONALDATA = 132,  //* FI */    /* The input additional data is not valid */
            ERR_POS_INVALID_MULTI_PAYMENT_AMOUNT = 133,  //* FT */    /* sum of amounts in list is not aqual total amount */
            ERR_POS_UNCONFIRM_REC_DATA = 134,            //* FL */    /* user unconfirm send data on pos */
            //* ---- from 126 to 160 reserve for pos error thate pos wait for new data */
            ERR_PC_INVALID_INPUT_MULTI_PAYMENT_REQUEST_LIST = 161,      //* DLL */    /* The input additional data is not valid */
            ERR_PC_INVALID_INPUT_MULTI_PAYMENT_AMOUNT = 162,      //* DLL */    /* sum of amounts in list is not aqual total amount */
            ERR_PC_INVALID_INPUT_REFERENCE_NUMBER = 163,    //* DLL */   /* The input Reference Number is not valid */
            ERR_POS_PC_CRCERROR_INVALID_DATA = 164,         //* FR */    /* Eror on CRC Check on send or receive data */
            ERR_PC_INVALID_POSPC_COMMUNICATION_TYPE = 165,  //* DLL */   /* The type of POS-PC Communication doesnot Define */
            ERR_PC_INVALID_INPUT_TCP_SOCKET_PORT = 166,     //* DLL */   /* The input TCP socket port number is not valid */
            ERR_PC_INVALID_INPUT_TCP_SOCKET_RECEIVED_TIMEOUT = 167,  //* DLL */   /* The input TCP socket port number is not valid */
            ERR_PC_TCP_SOCKET_FAILED = 168,                 //* DLL */
            ERR_PC_TCP_SOCKET_SEND_MSG_FAILED = 169,        //* DLL */   /* error on tcp send msg */
            ERR_PC_TCP_SOCKET_RECEIVED_MSG_FAILED = 170,    //* DLL */   /* error on tcp rec msg */
            ERR_POS_PC_OTHER = 200,                         //* FS */    /* switch error on fiel 39 is not in mapping table */
            ERR_POS_PC_INVALID_COMMUNICATION_TYPE = 200
        );

implementation

end.
