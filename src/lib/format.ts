const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short"
});

export const formatCurrency = (value: string | number) => {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return `Rs. ${value}`;
  }

  try {
    return currencyFormatter.format(amount);
  } catch {
    return `Rs. ${amount.toFixed(2)}`;
  }
};

export const formatDateTime = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  try {
    return dateFormatter.format(parsedDate);
  } catch {
    return parsedDate.toISOString();
  }
};
