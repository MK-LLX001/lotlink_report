export interface ORDER_SPIN_ENTITY {
  TXTIME: string;
  USERID: string;
  DRAWID: string;
  SPINRESULT: string;
  WINAMOUNT: number;
  WINXREF: string;
  WINJOURNAL: string;
  WINCHANNEL: string;
  WINACCOUNT: string;
  CORERESULT: string;
}

export interface STMT_SPIN_ENTITY {
  BANK_NAME: string;
  BANK_DATE: string;
  BANK_TXN_ID: string;
  BANK_DETAIL: string;
  WITHDRAW: number;
  DEPOSIT: number;
  TXN_TYPE: string;
  DRAWID: string;
  BILLNUMBER: string;
  XREF: string;
}

export interface REFUND_POINTS_ENTITY {
  TXTIME: string;
  REFERENCE: string;
  XREF: string;
  AMOUNT: number;
  TYPE: string;
  TELLER: string;
  DESCRIPTION: string;
}
export interface SpinParams {
  fromDate: string;
  toDate: string;
  amount?: string;
}

// entities/winner.entity.ts
export interface WinnerEntity {
  SPINID: number;
  TXTIME: Date;
  USERID: string;
  TYPE: string;
  AMOUNT: number;
  BALANCE: number;
  DRAWID: string;
  TICKET: string;
  SPINRESULT: string;
  WINAMOUNT: number;
  WINXREF: string;
  WINJOURNAL: string;
  WINCHANNEL: string;
  WINACCOUNT: string;
  CORERESULT: string;
}
