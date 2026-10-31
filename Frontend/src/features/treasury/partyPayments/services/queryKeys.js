export const partyPaymentKeys = {
  all: ["partyPayments"],
  lists: () => [...partyPaymentKeys.all, "list"],
  list: (params) => [...partyPaymentKeys.lists(), params],
  details: () => [...partyPaymentKeys.all, "detail"],
  detail: (id) => [...partyPaymentKeys.details(), String(id)],
  allocatable: (party) => [...partyPaymentKeys.all, "allocatable", party],
};
