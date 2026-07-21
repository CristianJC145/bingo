const JsonToFormDataService = async (jsonData: Record<string, any>) => {
    const formData = new FormData();

    Object.entries(jsonData).forEach(([key, value]) => {
    if (Array.isArray(value)) {
        value.forEach((element, index) => {
            if (key === 'images') {
                formData.append('images', element);
            } else {
                formData.append(`${key}[${index}]`, element);
            }
        });
    } else {
        formData.append(key, value);
    }
    });

    return formData;
};
  
export {JsonToFormDataService};