export function buildCustomerPayload(data) {
  const amount = Number(data.balanceAmount) || 0;
  let balance = 0;
  if (data.balanceType === "debtor") balance = -Math.abs(amount);
  else if (data.balanceType === "creditor") balance = Math.abs(amount);

  return {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone || null,
    address: data.address || null,
    postalCode: data.postalCode || null,
    balance,
    coordinates: {
      lat: data.lat ? parseFloat(data.lat) : null,
      lng: data.lng ? parseFloat(data.lng) : null,
    },
  };
}

export const defaultCustomerValues = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  lat: "",
  lng: "",
  postalCode: "",
  balanceType: "none",
  balanceAmount: "",
  avatar: null,
};
