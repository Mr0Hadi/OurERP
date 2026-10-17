export const auditKeys = {
  all: ["audit"],
  lists: () => [...auditKeys.all, "list"],
  list: (params) => [...auditKeys.lists(), { ...params }],
  details: () => [...auditKeys.all, "detail"],
  detail: (id) => [...auditKeys.details(), String(id)],
  documentHistory: (documentKind, documentId) => [...auditKeys.all, "document", documentKind, String(documentId)],
  entityHistory: (entityType, entityKey) => [...auditKeys.all, "entity", entityType, String(entityKey)],
  actions: () => [...auditKeys.all, "actions"],
};
