export function createFilterBar({ search, date, borough, category, reset, onChange, onReset }) {
  const controls = [search, date, borough, category];

  function populateSelect(select, values) {
    [...new Set(values.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.append(option);
      });
  }

  function read() {
    return {
      query: search.value,
      date: date.value,
      borough: borough.value,
      category: category.value,
    };
  }

  function setOptions(features) {
    populateSelect(borough, features.map((feature) => feature.properties?.borough));
    populateSelect(category, features.map((feature) => feature.properties?.category));
  }

  function clear() {
    search.value = "";
    date.value = "all";
    borough.value = "all";
    category.value = "all";
    search.focus();
  }

  controls.forEach((control) => {
    control.addEventListener(control === search ? "input" : "change", () => onChange(read()));
  });

  reset.addEventListener("click", () => {
    clear();
    onReset(read());
  });

  return { read, setOptions, clear };
}
