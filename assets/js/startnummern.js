/* ==========================================================
   GTM STARTNUMMERN · ARBEITSBLOCK A4
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const FIRST_NUMBER = 1;
    const LAST_NUMBER = 999;
    const PAGE_SIZE = 72;
    const STORAGE_KEY = "gtm-startnummer-vorauswahl";

    const elements = {
        grid: document.getElementById("number-grid"),
        empty: document.getElementById("number-empty"),
        resultCount: document.getElementById("number-result-count"),
        search: document.getElementById("number-search"),
        status: document.getElementById("number-status-filter"),
        range: document.getElementById("number-range-filter"),
        team: document.getElementById("number-team-filter"),
        sort: document.getElementById("number-sort"),
        loadMore: document.getElementById("number-load-more"),
        random: document.getElementById("number-random"),
        reset: document.getElementById("number-reset"),
        heroDisplay: document.getElementById("number-hero-display"),
        heroCaption: document.getElementById("number-hero-caption"),
        total: document.getElementById("number-total"),
        assigned: document.getElementById("number-assigned"),
        available: document.getElementById("number-available"),
        freeRate: document.getElementById("number-free-rate"),
        selection: document.getElementById("number-selection"),
        selectionValue: document.getElementById("number-selection-value"),
        selectionTitle: document.getElementById("number-selection-title"),
        selectionText: document.getElementById("number-selection-text"),
        selectionCopy: document.getElementById("number-selection-copy"),
        selectionClear: document.getElementById("number-selection-clear")
    };

    let allNumbers = [];
    let filteredNumbers = [];
    let visibleCount = PAGE_SIZE;
    let endingFilter = "";
    let selectedNumber = null;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function toInteger(value, fallback = 0) {
        const parsed = Number.parseInt(String(value ?? "").replace(/[^0-9-]/g, ""), 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function getFirstValue(entry, keys, fallback = "") {
        for (const key of keys) {
            const value = entry?.[key];
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
        return fallback;
    }

    function getNumber(entry) {
        return toInteger(getFirstValue(entry, ["nummer", "startnummer", "fahrernummer"]), 0);
    }

    function getDriver(entry) {
        return String(getFirstValue(entry, ["fahrer", "anzeigename", "name"])).trim();
    }

    function getTeam(entry) {
        return String(getFirstValue(entry, ["team", "teamZuordnung", "einsatzteam"])).trim();
    }

    function getVehicle(entry) {
        return String(getFirstValue(entry, ["fahrzeug", "vehicle"])).trim();
    }

    function normalizeStatus(entry) {
        const raw = normalizeText(getFirstValue(entry, ["status", "nummerStatus", "belegungsstatus"]));
        const driver = getDriver(entry);

        if (["reserviert", "reservation", "vorgemerkt"].includes(raw)) return "reserviert";
        if (["gesperrt", "blocked", "blockiert"].includes(raw)) return "gesperrt";
        if (["historisch", "history", "archiviert", "archived"].includes(raw)) return "historisch";
        if (["frei", "verfugbar", "available"].includes(raw) && driver === "") return "frei";
        if (["vergeben", "belegt", "assigned", "aktiv"].includes(raw) || driver !== "") return "vergeben";
        return "frei";
    }

    function buildNumberSpace(entries) {
        const sourceByNumber = new Map();

        entries.forEach((entry) => {
            const number = getNumber(entry);
            if (number < FIRST_NUMBER || number > LAST_NUMBER || sourceByNumber.has(number)) return;
            sourceByNumber.set(number, entry);
        });

        return Array.from({ length: LAST_NUMBER }, (_, index) => {
            const number = index + FIRST_NUMBER;
            const source = sourceByNumber.get(number);

            if (!source) {
                return {
                    nummer: number,
                    status: "frei",
                    fahrer: "",
                    team: "",
                    fahrzeug: ""
                };
            }

            return {
                nummer: number,
                status: normalizeStatus(source),
                fahrer: getDriver(source),
                team: getTeam(source),
                fahrzeug: getVehicle(source),
                saison: String(getFirstValue(source, ["saison", "saisonName", "season"])).trim(),
                reserviertBis: String(getFirstValue(source, ["reserviertBis", "reservationEndsAt"])).trim()
            };
        });
    }

    function statusLabel(status) {
        return {
            frei: "Verfügbar",
            vergeben: "Vergeben",
            reserviert: "Reserviert",
            gesperrt: "Gesperrt",
            historisch: "Historisch gebunden"
        }[status] || "Unbekannt";
    }

    function statusDescription(entry) {
        if (entry.status === "frei") return "Bereit für deine Vorauswahl";
        if (entry.status === "reserviert") return entry.reserviertBis ? `Reserviert bis ${entry.reserviertBis}` : "Aktuell nicht auswählbar";
        if (entry.status === "gesperrt") return "Von der GTM nicht freigegeben";
        if (entry.status === "historisch") return "Historische Zuordnung geschützt";
        return entry.team || entry.fahrzeug || "Aktiv zugeordnet";
    }

    function createCard(entry) {
        const number = entry.nummer;
        const isFree = entry.status === "frei";
        const isAssigned = entry.status === "vergeben";
        const title = isAssigned ? entry.fahrer || `Startnummer ${number}` : `Startnummer ${number}`;
        const detail = statusDescription(entry);
        const selected = selectedNumber === number;

        let action = "";
        if (isFree) {
            action = `
                <button class="number-card-action" type="button" data-select-number="${number}">
                    <span>${selected ? "Ausgewählt" : "Vorauswählen"}</span>
                    <span aria-hidden="true">${selected ? "✓" : "→"}</span>
                </button>`;
        } else if (isAssigned && entry.fahrer) {
            action = `
                <a class="number-card-action" href="pages/fahrerprofil.html?nummer=${encodeURIComponent(number)}">
                    <span>Fahrerprofil</span>
                    <span aria-hidden="true">→</span>
                </a>`;
        }

        return `
            <article class="number-card status-${entry.status}${selected ? " is-selected" : ""}"
                data-number="${number}" tabindex="0">
                <strong class="number-card-number">#${number}</strong>
                <span class="number-card-status">${statusLabel(entry.status)}</span>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(detail)}</p>
                ${action}
            </article>`;
    }

    function populateTeamFilter() {
        if (!elements.team) return;
        const currentValue = elements.team.value;
        const teams = [...new Set(allNumbers.map((entry) => entry.team).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));

        elements.team.innerHTML = '<option value="">Alle Teams</option>';
        teams.forEach((team) => {
            const option = document.createElement("option");
            option.value = team;
            option.textContent = team;
            elements.team.appendChild(option);
        });

        if (teams.includes(currentValue)) elements.team.value = currentValue;
    }

    function updateStatistics() {
        const available = allNumbers.filter((entry) => entry.status === "frei").length;
        const assigned = allNumbers.filter((entry) => entry.status === "vergeben").length;
        const rate = allNumbers.length ? Math.round((available / allNumbers.length) * 100) : 0;

        if (elements.total) elements.total.textContent = allNumbers.length.toLocaleString("de-DE");
        if (elements.assigned) elements.assigned.textContent = assigned.toLocaleString("de-DE");
        if (elements.available) elements.available.textContent = available.toLocaleString("de-DE");
        if (elements.freeRate) elements.freeRate.textContent = `${rate} %`;
    }

    function getRange(value) {
        if (!value || !value.includes("-")) return [FIRST_NUMBER, LAST_NUMBER];
        const [minimum, maximum] = value.split("-").map((item) => toInteger(item));
        return [minimum || FIRST_NUMBER, maximum || LAST_NUMBER];
    }

    function getSearchText(entry) {
        return normalizeText([
            entry.nummer,
            `#${entry.nummer}`,
            statusLabel(entry.status),
            entry.fahrer,
            entry.team,
            entry.fahrzeug,
            entry.saison
        ].join(" "));
    }

    function applyFilters() {
        const query = normalizeText(elements.search?.value);
        const status = elements.status?.value || "";
        const team = elements.team?.value || "";
        const [minimum, maximum] = getRange(elements.range?.value || "");

        filteredNumbers = allNumbers.filter((entry) => {
            const matchesQuery = query === "" || getSearchText(entry).includes(query);
            const matchesStatus = status === "" || entry.status === status;
            const matchesTeam = team === "" || entry.team === team;
            const matchesRange = entry.nummer >= minimum && entry.nummer <= maximum;
            const matchesEnding = endingFilter === "" || String(entry.nummer).endsWith(endingFilter);
            return matchesQuery && matchesStatus && matchesTeam && matchesRange && matchesEnding;
        });

        sortNumbers();
        visibleCount = PAGE_SIZE;
        renderNumbers();
    }

    function sortNumbers() {
        const sort = elements.sort?.value || "nummer-auf";

        filteredNumbers.sort((a, b) => {
            if (sort === "nummer-ab") return b.nummer - a.nummer;
            if (sort === "fahrer") {
                const comparison = (a.fahrer || "ZZZZZZ").localeCompare(b.fahrer || "ZZZZZZ", "de", { sensitivity: "base" });
                return comparison || a.nummer - b.nummer;
            }
            if (sort === "team") {
                const comparison = (a.team || "ZZZZZZ").localeCompare(b.team || "ZZZZZZ", "de", { sensitivity: "base" });
                return comparison || a.nummer - b.nummer;
            }
            return a.nummer - b.nummer;
        });
    }

    function renderNumbers() {
        if (!elements.grid) return;

        const visible = filteredNumbers.slice(0, visibleCount);
        elements.grid.setAttribute("aria-busy", "false");

        if (filteredNumbers.length === 0) {
            elements.grid.innerHTML = "";
            if (elements.empty) elements.empty.hidden = false;
            if (elements.loadMore) elements.loadMore.hidden = true;
        } else {
            elements.grid.innerHTML = visible.map(createCard).join("");
            if (elements.empty) elements.empty.hidden = true;
            if (elements.loadMore) {
                elements.loadMore.hidden = visible.length >= filteredNumbers.length;
                elements.loadMore.textContent = `Weitere Nummern anzeigen (${filteredNumbers.length - visible.length})`;
            }
        }

        if (elements.resultCount) {
            const shown = Math.min(visibleCount, filteredNumbers.length);
            elements.resultCount.textContent = filteredNumbers.length === 0
                ? "Keine Treffer"
                : `${shown} von ${filteredNumbers.length} Nummern angezeigt`;
        }
    }

    function updateHero(number, caption = "GTM STARTNUMMER") {
        if (elements.heroDisplay) elements.heroDisplay.textContent = number ? `#${number}` : "#---";
        if (elements.heroCaption) elements.heroCaption.textContent = caption;
    }

    function readStoredSelection() {
        try {
            return toInteger(window.sessionStorage.getItem(STORAGE_KEY), 0) || null;
        } catch (error) {
            return null;
        }
    }

    function storeSelection(number) {
        try {
            if (number) window.sessionStorage.setItem(STORAGE_KEY, String(number));
            else window.sessionStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn("Die Startnummer-Vorauswahl konnte nicht lokal gespeichert werden.", error);
        }
    }

    function updateSelectionPanel() {
        const entry = allNumbers.find((item) => item.nummer === selectedNumber && item.status === "frei");
        if (!entry) selectedNumber = null;

        elements.selection?.classList.toggle("has-selection", Boolean(selectedNumber));
        if (elements.selectionValue) elements.selectionValue.textContent = selectedNumber ? `#${selectedNumber}` : "#---";
        if (elements.selectionTitle) {
            elements.selectionTitle.textContent = selectedNumber
                ? `Startnummer ${selectedNumber} ist vorausgewählt`
                : "Noch keine Nummer ausgewählt";
        }
        if (elements.selectionText) {
            elements.selectionText.textContent = selectedNumber
                ? "Diese lokale Vorauswahl bleibt für die aktuelle Browser-Sitzung gespeichert. Sie blockiert die Nummer noch nicht für andere Fahrer."
                : "Wähle oben eine verfügbare Nummer. Die Auswahl wird nur auf diesem Gerät vorgemerkt.";
        }
        if (elements.selectionCopy) elements.selectionCopy.disabled = !selectedNumber;
        if (elements.selectionClear) elements.selectionClear.disabled = !selectedNumber;
        if (selectedNumber) updateHero(selectedNumber, "DEINE VORAUSWAHL");
    }

    function selectNumber(number) {
        const entry = allNumbers.find((item) => item.nummer === number);
        if (!entry || entry.status !== "frei") return;
        selectedNumber = number;
        storeSelection(number);
        updateSelectionPanel();
        renderNumbers();
        elements.selection?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function clearSelection() {
        selectedNumber = null;
        storeSelection(null);
        updateSelectionPanel();
        updateHero(null, "FREIE NUMMER FINDEN");
        renderNumbers();
    }

    async function copySelection() {
        if (!selectedNumber) return;
        const text = `Meine GTM-Wunschstartnummer: #${selectedNumber} (noch nicht reserviert)`;
        try {
            await navigator.clipboard.writeText(text);
            elements.selectionCopy.textContent = "Kopiert ✓";
            window.setTimeout(() => { elements.selectionCopy.textContent = "Auswahl kopieren"; }, 1800);
        } catch (error) {
            window.prompt("Vorauswahl kopieren:", text);
        }
    }

    function resetFilters() {
        if (elements.search) elements.search.value = "";
        if (elements.status) elements.status.value = "frei";
        if (elements.range) elements.range.value = "";
        if (elements.team) elements.team.value = "";
        if (elements.sort) elements.sort.value = "nummer-auf";
        endingFilter = "";
        document.querySelectorAll("[data-number-ending]").forEach((button) => button.classList.remove("is-active"));
        applyFilters();
    }

    function chooseRandomFreeNumber() {
        const freeNumbers = filteredNumbers.filter((entry) => entry.status === "frei");
        const pool = freeNumbers.length ? freeNumbers : allNumbers.filter((entry) => entry.status === "frei");
        if (!pool.length) return;
        const entry = pool[Math.floor(Math.random() * pool.length)];
        if (elements.search) elements.search.value = String(entry.nummer);
        if (elements.status) elements.status.value = "frei";
        endingFilter = "";
        applyFilters();
        updateHero(entry.nummer, "ZUFÄLLIGER VORSCHLAG");
    }

    function showError(message) {
        console.error(message);
        if (!elements.grid) return;
        elements.grid.innerHTML = `
            <div class="number-data-error">
                <strong>Die Startnummern konnten nicht geladen werden.</strong>
                <p>${escapeHtml(message)}</p>
            </div>`;
        elements.grid.setAttribute("aria-busy", "false");
        if (elements.resultCount) elements.resultCount.textContent = "Datenfehler";
    }

    async function loadNumbers() {
        if (!window.GTM || typeof window.GTM.load !== "function") {
            showError("Die GTM Data Engine wurde nicht geladen.");
            return;
        }

        try {
            const data = await window.GTM.load("startnummern", { forceReload: true });
            if (!Array.isArray(data)) throw new Error("startnummern.json enthält keine gültige Liste.");

            allNumbers = buildNumberSpace(data);
            populateTeamFilter();
            updateStatistics();

            const stored = readStoredSelection();
            selectedNumber = allNumbers.some((entry) => entry.nummer === stored && entry.status === "frei") ? stored : null;
            if (!selectedNumber) storeSelection(null);

            updateSelectionPanel();
            applyFilters();
        } catch (error) {
            showError(error?.message || "Unbekannter Fehler");
        }
    }

    [elements.search, elements.status, elements.range, elements.team, elements.sort]
        .filter(Boolean)
        .forEach((element) => {
            element.addEventListener(element === elements.search ? "input" : "change", applyFilters);
        });

    elements.grid?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-select-number]");
        if (button) selectNumber(toInteger(button.dataset.selectNumber));
    });

    elements.grid?.addEventListener("mouseover", (event) => {
        const card = event.target.closest(".number-card");
        if (!card) return;
        const number = toInteger(card.dataset.number);
        const entry = allNumbers.find((item) => item.nummer === number);
        updateHero(number, entry ? statusLabel(entry.status).toUpperCase() : "GTM STARTNUMMER");
    });

    elements.loadMore?.addEventListener("click", () => {
        visibleCount += PAGE_SIZE;
        renderNumbers();
    });
    elements.random?.addEventListener("click", chooseRandomFreeNumber);
    elements.reset?.addEventListener("click", resetFilters);
    elements.selectionCopy?.addEventListener("click", copySelection);
    elements.selectionClear?.addEventListener("click", clearSelection);
    document.querySelector("[data-reset-filters]")?.addEventListener("click", resetFilters);

    document.querySelectorAll("[data-number-ending]").forEach((button) => {
        button.addEventListener("click", () => {
            const value = String(button.dataset.numberEnding || "");
            endingFilter = endingFilter === value ? "" : value;
            document.querySelectorAll("[data-number-ending]").forEach((item) => {
                item.classList.toggle("is-active", endingFilter !== "" && item === button);
            });
            applyFilters();
        });
    });

    document.querySelectorAll("[data-number-range]").forEach((button) => {
        button.addEventListener("click", () => {
            if (elements.range) elements.range.value = button.dataset.numberRange || "";
            applyFilters();
        });
    });

    document.querySelectorAll("[data-jump-to]").forEach((button) => {
        button.addEventListener("click", () => {
            if (elements.status) elements.status.value = button.dataset.jumpTo || "";
            applyFilters();
            document.getElementById("number-explorer")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    await loadNumbers();
});
