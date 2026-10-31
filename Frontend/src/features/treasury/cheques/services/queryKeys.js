export const chequeKeys = {
  all: ["cheques"],
  lists: () => [...chequeKeys.all, "list"],
  list: (params) => [...chequeKeys.lists(), params],
};
