const appendValue = (formData: FormData, key: string, value: unknown) => {
  if (value instanceof Blob) formData.append(key, value);
  else formData.append(key, String(value ?? ""));
};

const JsonToFormDataService = async (jsonData: Record<string, unknown>) => {
  const formData = new FormData();
  Object.entries(jsonData).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((element, index) => appendValue(formData, key === "images" ? "images" : `${key}[${index}]`, element));
    else appendValue(formData, key, value);
  });
  return formData;
};

export { JsonToFormDataService };
