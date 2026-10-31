export const reorderKeys = {
  all: ["reorder"],
  suggestions: (filters) => [...reorderKeys.all, "suggestions", { ...filters }],
};
