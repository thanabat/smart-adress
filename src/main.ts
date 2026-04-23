import geographyData from "./data/geography.json";
import "./styles.css";

type GeographyRecord = {
  id: number;
  provinceCode: number;
  provinceNameEn: string;
  provinceNameTh: string;
  districtCode: number;
  districtNameEn: string;
  districtNameTh: string;
  subdistrictCode: number;
  subdistrictNameEn: string;
  subdistrictNameTh: string;
  postalCode: number;
};

type AddressOption = {
  id: string;
  subdistrict: string;
  subdistrictEn: string;
  district: string;
  districtEn: string;
  province: string;
  provinceEn: string;
  postcode: string;
  matchReason: string;
  score: number;
};

type SavedAddress = AddressOption & {
  houseNumber: string;
  road?: string;
};

type AddressFormState = {
  houseNumber: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  postcode: string;
};

const savedAddresses: SavedAddress[] = [
  {
    id: "saved-1",
    houseNumber: "55/12",
    road: "Sukhumvit 23",
    subdistrict: "คลองเตยเหนือ",
    subdistrictEn: "Khlong Toei Nuea",
    district: "วัฒนา",
    districtEn: "Vadhana",
    province: "กรุงเทพมหานคร",
    provinceEn: "Bangkok",
    postcode: "10110",
    matchReason: "Saved address",
    score: 0,
  },
  {
    id: "saved-2",
    houseNumber: "88/9",
    road: "Nimmanhaemin",
    subdistrict: "สุเทพ",
    subdistrictEn: "Suthep",
    district: "เมืองเชียงใหม่",
    districtEn: "Mueang Chiang Mai",
    province: "เชียงใหม่",
    provinceEn: "Chiang Mai",
    postcode: "50200",
    matchReason: "Saved address",
    score: 0,
  },
  {
    id: "saved-3",
    houseNumber: "199",
    road: "Rama I",
    subdistrict: "ปทุมวัน",
    subdistrictEn: "Pathum Wan",
    district: "ปทุมวัน",
    districtEn: "Pathum Wan",
    province: "กรุงเทพมหานคร",
    provinceEn: "Bangkok",
    postcode: "10330",
    matchReason: "Saved address",
    score: 0,
  },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

const allAddresses = normalizeAddressData();
let activeOptions: Array<AddressOption | SavedAddress> = [];
let activeIndex = -1;

app.innerHTML = `
  <main class="page-shell">
    <section class="workspace" aria-label="Smart Thai address form">
      <div class="search-panel">
        <label class="field-label" for="address-search">Smart search</label>
        <div class="combobox" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="suggestion-list">
          <input
            id="address-search"
            class="search-input"
            type="search"
            autocomplete="off"
            placeholder="Try 10110, วัฒนา, ในเมือง ขอนแก่น, or 55/12"
          />
          <button id="clear-search" class="icon-button" type="button" aria-label="Clear search">x</button>
        </div>
        <div id="suggestion-list" class="suggestion-list" role="listbox" aria-label="Address suggestions"></div>
        <p id="search-hint" class="hint">Type at least 2 characters, or 5 digits for postcode.</p>
      </div>

      <form class="address-form" aria-label="Address form">
        <div class="form-toolbar">
          <h2>Address</h2>
          <button id="clear-form" class="secondary-button" type="button">Clear all</button>
        </div>
        <div class="form-grid">
          <label class="form-field">
            <span>House number</span>
            <input id="houseNumber" name="houseNumber" autocomplete="address-line1" />
          </label>
          <label class="form-field">
            <span>Road / Soi</span>
            <input id="road" name="road" autocomplete="address-line2" />
          </label>
          <label class="form-field">
            <span>Subdistrict / Tambon</span>
            <input id="subdistrict" name="subdistrict" autocomplete="address-level4" />
          </label>
          <label class="form-field">
            <span>District / Amphoe</span>
            <input id="district" name="district" autocomplete="address-level3" />
          </label>
          <label class="form-field">
            <span>Province</span>
            <input id="province" name="province" autocomplete="address-level1" />
          </label>
          <label class="form-field">
            <span>Postcode</span>
            <input id="postcode" name="postcode" inputmode="numeric" autocomplete="postal-code" />
          </label>
        </div>
      </form>
    </section>
  </main>
`;

const searchInput = getElement<HTMLInputElement>("address-search");
const clearButton = getElement<HTMLButtonElement>("clear-search");
const clearFormButton = getElement<HTMLButtonElement>("clear-form");
const suggestionList = getElement<HTMLDivElement>("suggestion-list");
const searchHint = getElement<HTMLParagraphElement>("search-hint");
const combobox = document.querySelector<HTMLDivElement>(".combobox");

searchInput.addEventListener("input", () => {
  updateSuggestions(searchInput.value);
});

searchInput.addEventListener("keydown", (event) => {
  if (!activeOptions.length) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex = Math.min(activeIndex + 1, activeOptions.length - 1);
    renderSuggestions();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    renderSuggestions();
  }

  if (event.key === "Enter" && activeIndex >= 0) {
    event.preventDefault();
    selectAddress(activeOptions[activeIndex]);
  }

  if (event.key === "Escape") {
    clearSuggestions();
  }
});

clearButton.addEventListener("click", () => {
  searchInput.value = "";
  clearSuggestions();
  searchInput.focus();
});

clearFormButton.addEventListener("click", () => {
  searchInput.value = "";
  clearSuggestions();
  setFormValues(emptyFormState());
  searchInput.focus();
});

suggestionList.addEventListener("mousemove", (event) => {
  const button = findSuggestionButton(event.target);
  if (!button) return;

  const nextIndex = Number(button.dataset.index);

  if (nextIndex !== activeIndex) {
    activeIndex = nextIndex;
    updateActiveSuggestion();
  }
});

suggestionList.addEventListener("mousedown", (event) => {
  const button = findSuggestionButton(event.target);
  if (!button) return;

  event.preventDefault();
  const option = activeOptions[Number(button.dataset.index)];

  if (option) {
    selectAddress(option);
  }
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node)) return;
  if (!app.contains(event.target)) {
    clearSuggestions();
  }
});

function normalizeAddressData(): AddressOption[] {
  return (geographyData as GeographyRecord[]).map((row) => ({
    id: String(row.id),
    subdistrict: row.subdistrictNameTh,
    subdistrictEn: row.subdistrictNameEn,
    district: row.districtNameTh,
    districtEn: row.districtNameEn,
    province: row.provinceNameTh,
    provinceEn: row.provinceNameEn,
    postcode: String(row.postalCode),
    matchReason: "Thai address dataset",
    score: 0,
  }));
}

function updateSuggestions(rawQuery: string) {
  const query = rawQuery.trim();

  if (!query || (query.length < 2 && !/^\d{1,5}$/.test(query))) {
    activeOptions = [];
    activeIndex = -1;
    renderSuggestions();
    searchHint.textContent = "Type at least 2 characters, or 5 digits for postcode.";
    return;
  }

  activeOptions = findAddressOptions(query);
  activeIndex = activeOptions.length ? 0 : -1;
  renderSuggestions();
}

function findAddressOptions(query: string): Array<AddressOption | SavedAddress> {
  const savedMatches = savedAddresses
    .map((address) => scoreSavedAddress(address, query))
    .filter((address): address is SavedAddress => address !== null);

  const localMatches = allAddresses
    .map((address) => scoreAddress(address, query))
    .filter((address): address is AddressOption => address !== null);

  const merged = [...savedMatches, ...localMatches];
  const unique = new Map<string, AddressOption | SavedAddress>();

  for (const option of merged) {
    const key = `${option.postcode}|${option.province}|${option.district}|${option.subdistrict}|${"houseNumber" in option ? option.houseNumber : ""}`;
    const existing = unique.get(key);

    if (!existing || option.score > existing.score) {
      unique.set(key, option);
    }
  }

  return [...unique.values()]
    .sort((a, b) => b.score - a.score || labelFor(a).localeCompare(labelFor(b), "th"))
    .slice(0, resultLimitFor(query));
}

function resultLimitFor(query: string): number {
  return /^\d{5}$/.test(query.trim()) ? 50 : 12;
}

function scoreSavedAddress(address: SavedAddress, query: string): SavedAddress | null {
  const tokens = tokenizeQuery(query);
  const haystack = normalizeText([
    address.houseNumber,
    address.road,
    address.subdistrict,
    address.subdistrictEn,
    address.district,
    address.districtEn,
    address.province,
    address.provinceEn,
    address.postcode,
  ].join(" "));

  if (!tokens.every((token) => haystack.includes(token))) return null;

  return {
    ...address,
    matchReason: address.houseNumber.includes(query) ? "Matched saved house number" : "Matched saved full address",
    score: address.houseNumber.includes(query) ? 130 : 110,
  };
}

function scoreAddress(address: AddressOption, query: string): AddressOption | null {
  const tokens = tokenizeQuery(query);
  const fieldValues = addressSearchFields(address);
  const fieldMatches = tokens.map((token) => bestTokenMatch(token, fieldValues));

  if (fieldMatches.some((match) => match.score === 0)) return null;

  const bestMatch = fieldMatches.reduce((best, match) => match.score > best.score ? match : best);
  const hasExactPostcode = tokens.some((token) => /^\d{5}$/.test(token) && address.postcode === token);
  const hasPostcodePrefix = tokens.some((token) => /^\d{1,5}$/.test(token) && address.postcode.startsWith(token));
  const score = fieldMatches.reduce((total, match) => total + match.score, 0);

  let matchReason = "Matched all search terms";

  if (hasExactPostcode) {
    matchReason = "Exact postcode";
  } else if (hasPostcodePrefix) {
    matchReason = "Postcode starts with query";
  } else if (tokens.length === 1) {
    matchReason = matchReasonForField(bestMatch.field);
  }

  return { ...address, matchReason, score };
}

function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map(normalizeText)
    .filter(Boolean);
}

function addressSearchFields(address: AddressOption | SavedAddress): Array<{ field: string; value: string }> {
  return [
    { field: "province", value: address.province },
    { field: "province", value: address.provinceEn },
    { field: "district", value: address.district },
    { field: "district", value: address.districtEn },
    { field: "subdistrict", value: address.subdistrict },
    { field: "subdistrict", value: address.subdistrictEn },
    { field: "postcode", value: address.postcode },
  ];
}

function bestTokenMatch(token: string, fields: Array<{ field: string; value: string }>): { field: string; score: number } {
  let best = { field: "", score: 0 };

  for (const field of fields) {
    const score = fieldMatchScore(field.value, token, field.field);

    if (score > best.score) {
      best = { field: field.field, score };
    }
  }

  return best;
}

function fieldMatchScore(value: string, normalizedToken: string, field: string): number {
  const normalizedValue = normalizeText(value);

  if (field === "postcode") {
    if (normalizedValue === normalizedToken) return 120;
    if (/^\d{1,5}$/.test(normalizedToken) && normalizedValue.startsWith(normalizedToken)) return 80;
    return 0;
  }

  const exactScores: Record<string, number> = {
    province: 105,
    district: 95,
    subdistrict: 85,
  };

  const containsScores: Record<string, number> = {
    province: 50,
    district: 60,
    subdistrict: 70,
  };

  if (normalizedValue === normalizedToken) {
    return exactScores[field] ?? 75;
  }

  if (normalizedValue.includes(normalizedToken)) {
    return containsScores[field] ?? 40;
  }

  return 0;
}

function matchReasonForField(field: string): string {
  if (field === "province") return "Matched province";
  if (field === "district") return "Matched district";
  if (field === "subdistrict") return "Matched subdistrict";
  if (field === "postcode") return "Postcode starts with query";
  return "Matched address text";
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase("th-TH").replace(/\s+/g, "");
}

function renderSuggestions() {
  combobox?.setAttribute("aria-expanded", String(activeOptions.length > 0));

  if (!activeOptions.length) {
    suggestionList.innerHTML = "";
    searchHint.textContent = searchInput.value.trim()
      ? "No matching address found."
      : "Type at least 2 characters, or 5 digits for postcode.";
    return;
  }

  searchHint.textContent = `${activeOptions.length} suggestion${activeOptions.length === 1 ? "" : "s"} found.`;
  suggestionList.innerHTML = activeOptions
    .map((option, index) => `
      <button
        class="suggestion-item ${index === activeIndex ? "is-active" : ""}"
        type="button"
        role="option"
        aria-selected="${index === activeIndex}"
        data-index="${index}"
      >
        <span class="suggestion-main">${escapeHtml(labelFor(option))}</span>
        <span class="suggestion-meta">
          ${escapeHtml(option.matchReason)}
          ${"houseNumber" in option ? ` · ${escapeHtml(option.houseNumber)}${option.road ? ` ${escapeHtml(option.road)}` : ""}` : ""}
        </span>
      </button>
    `)
    .join("");
}

function updateActiveSuggestion() {
  suggestionList.querySelectorAll<HTMLButtonElement>(".suggestion-item").forEach((button) => {
    const isActive = Number(button.dataset.index) === activeIndex;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function findSuggestionButton(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;

  return target.closest<HTMLButtonElement>(".suggestion-item");
}

function selectAddress(option: AddressOption | SavedAddress) {
  const formState: AddressFormState = {
    houseNumber: "houseNumber" in option ? option.houseNumber : getInputValue("houseNumber"),
    road: "road" in option ? option.road ?? "" : getInputValue("road"),
    subdistrict: option.subdistrict,
    district: option.district,
    province: option.province,
    postcode: option.postcode,
  };

  setFormValues(formState);
  searchInput.value = labelFor(option);
  clearSuggestions();
}

function clearSuggestions() {
  activeOptions = [];
  activeIndex = -1;
  renderSuggestions();
}

function setFormValues(values: AddressFormState) {
  for (const [key, value] of Object.entries(values)) {
    getElement<HTMLInputElement>(key).value = value;
  }
}

function emptyFormState(): AddressFormState {
  return {
    houseNumber: "",
    road: "",
    subdistrict: "",
    district: "",
    province: "",
    postcode: "",
  };
}

function getInputValue(id: keyof AddressFormState): string {
  return getElement<HTMLInputElement>(id).value;
}

function labelFor(option: AddressOption | SavedAddress): string {
  return `${option.subdistrict}, ${option.district}, ${option.province} ${option.postcode}`;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element #${id} was not found.`);
  }

  return element as T;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
