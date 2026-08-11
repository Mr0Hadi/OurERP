import { useEffect } from "react";
import useReturnInspectionFormStore from "../store/returnInspectionFormStore";

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useReturnInspectionForm(salesReturn) {
  const store = useReturnInspectionFormStore();
  const { formData, setFormData, setInspectionItems, initializeFromReturn, initializedForId, resetForm } = store;

  const returnVersion = salesReturn?.id != null ? `${salesReturn.id}:${salesReturn.updatedAt}` : null;

  useEffect(() => {
    if (returnVersion && initializedForId !== returnVersion) {
      initializeFromReturn(salesReturn);
    }
  }, [returnVersion, salesReturn, initializeFromReturn, initializedForId]);

  const allocatedOf = (item) => (item.issues || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  const handleItemChange = (lineId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.lineId !== lineId) return item;
      if (field === "verifiedQtyThisRound") {
        const num = Number(value);
        const clamped = Number.isNaN(num) || num < 0 ? 0 : Math.min(num, item.remainingQty);
        let remainingBudget = clamped;
        const trimmedIssues = [];
        for (const issue of item.issues || []) {
          if (remainingBudget <= 0) break;
          const qty = Math.min(Number(issue.qty) || 0, remainingBudget);
          if (qty > 0) { trimmedIssues.push({ ...issue, qty }); remainingBudget -= qty; }
        }
        return { ...item, verifiedQtyThisRound: clamped, issues: trimmedIssues };
      }
      return { ...item, [field]: value };
    });
    setInspectionItems(newItems);
  };

  const handleAddIssue = (lineId) => {
    const newItems = formData.items.map((item) => {
      if (item.lineId !== lineId) return item;
      const allocated = allocatedOf(item);
      const remaining = Math.max(0, (item.verifiedQtyThisRound || 0) - allocated);
      if (remaining <= 0) return item;
      return { ...item, issues: [...(item.issues || []), { id: generateId(), issueType: "defective", qty: remaining, note: "" }] };
    });
    setInspectionItems(newItems);
  };

  const handleUpdateIssue = (lineId, issueRowId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.lineId !== lineId) return item;
      const verifiedQtyThisRound = item.verifiedQtyThisRound || 0;
      const newIssues = (item.issues || []).map((issue) => {
        if (issue.id !== issueRowId) return issue;
        if (field === "qty") {
          const otherAllocated = (item.issues || []).filter((i) => i.id !== issueRowId).reduce((s, i) => s + (Number(i.qty) || 0), 0);
          const maxAllowed = Math.max(0, verifiedQtyThisRound - otherAllocated);
          const num = Number(value);
          const clamped = Number.isNaN(num) || num < 0 ? 0 : Math.min(num, maxAllowed);
          return { ...issue, qty: clamped };
        }
        return { ...issue, [field]: value };
      });
      return { ...item, issues: newIssues };
    });
    setInspectionItems(newItems);
  };

  const handleRemoveIssue = (lineId, issueRowId) => {
    const newItems = formData.items.map((item) =>
      item.lineId === lineId ? { ...item, issues: (item.issues || []).filter((i) => i.id !== issueRowId) } : item,
    );
    setInspectionItems(newItems);
  };

  const isAllComplete = formData.items.every((item) => (item.verifiedQtyThisRound || 0) >= item.remainingQty);

  const isTransporterValid =
    !!formData.transporterName?.trim() &&
    (!!formData.transporterNationalId?.trim() || !!formData.vehiclePlate?.trim());

  const buildPayload = () => ({
    returnId: formData.returnId,
    inspectedItems: formData.items.map((item) => ({
      lineId: item.lineId,
      verifiedQtyThisRound: item.verifiedQtyThisRound || 0,
      issues: (item.issues || []).map((i) => ({ issueType: i.issueType, qty: Number(i.qty) || 0, note: i.note || "" })),
    })),
    receivingNote: formData.receivingNote,
    receivedDate: formData.receivedDate,
    transporterName: formData.transporterName,
    transporterNationalId: formData.transporterNationalId,
    vehiclePlate: formData.vehiclePlate,
  });

  return {
    formData, setFormData, handleItemChange, handleAddIssue, handleUpdateIssue, handleRemoveIssue,
    isAllComplete, isTransporterValid, buildPayload, resetForm, initializedForId,
  };
}