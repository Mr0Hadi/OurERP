/** نام نمایشی طرف حساب: نام شرکت، وگرنه نام و نام خانوادگی. */
export const partyDisplayName = (party) =>
  party.companyName || `${party.firstName ?? ""} ${party.lastName ?? ""}`.trim();
