/* ==========================================================
   GTM STRAFENCENTER — ARBEITSBLOCK A3
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const elements = {
        grid: document.getElementById("penalty-grid"),
        activeList: document.getElementById("penalty-active-list"),
        empty: document.getElementById("penalty-empty"),
        reset: document.getElementById("penalty-reset"),
        resultCount: document.getElementById("penalty-result-count"),
        search: document.getElementById("penalty-search"),
        eventFilter: document.getElementById("penalty-event-filter"),
        typeFilter: document.getElementById("penalty-type-filter"),
        statusFilter: document.getElementById("penalty-status-filter"),
        sort: document.getElementById("penalty-sort"),
        total: document.getElementById("penalty-total"),
        active: document.getElementById("penalty-active"),
        points: document.getElementById("penalty-points"),
        bans: document.getElementById("penalty-bans")
    };

    let publishedPenalties = [];

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalize(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function number(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function truthy(value) {
        if (value === true || value === 1) return true;
        return ["1", "ja", "true", "freigegeben", "veröffentlicht", "veroeffentlicht"]
            .includes(normalize(value));
    }

    function parseDate(value) {
        const text = String(value ?? "").trim();
        if (!text) return null;

        const iso = /^\d{4}-\d{2}-\d{2}$/.test(text)
            ? new Date(`${text}T00:00:00`)
            : null;

        if (iso && !Number.isNaN(iso.getTime())) return iso;

        const german = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (german) {
            const date = new Date(number(german[3]), number(german[2]) - 1, number(german[1]));
            return Number.isNaN(date.getTime()) ? null : date;
        }

        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
        const date = parseDate(value);
        return date
            ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
            : (String(value ?? "").trim() || "Datum offen");
    }

    function driverName(entry) {
        return String(entry?.fahrer || entry?.name || entry?.anzeigename || "Unbekannter Fahrer").trim();
    }

    function driverNumber(entry) {
        return number(entry?.nummer ?? entry?.fahrernummer ?? entry?.startnummer, 0);
    }

    function teamName(entry) {
        const value = String(entry?.team ?? entry?.teamZuordnung ?? "").trim();
        return value && value !== "0" ? value : "Kein Team eingetragen";
    }

    function eventName(entry) {
        return String(entry?.event || entry?.serie || entry?.saisonName || entry?.strecke || "Veranstaltung offen").trim();
    }

    function raceName(entry) {
        return String(entry?.rennen || entry?.lauf || entry?.session || "Lauf offen").trim();
    }

    function caseId(entry) {
        return String(entry?.fall || entry?.id || "GTM-OHNE-ID").trim();
    }

    function penaltyType(entry) {
        const value = normalize(entry?.strafart || entry?.art || entry?.strafe || entry?.entscheidung);
        if (value.includes("renn") && value.includes("sper")) return "rennssperre";
        if (value.includes("disqual")) return "disqualifikation";
        if (value.includes("verwarn")) return "verwarnung";
        if (value.includes("punkt")) return "strafpunkte";
        return "sonstige";
    }

    function penaltyTypeLabel(type) {
        return ({
            strafpunkte: "Strafpunkte",
            verwarnung: "Verwarnung",
            rennssperre: "Rennsperre",
            disqualifikation: "Disqualifikation",
            sonstige: "Sonstige Entscheidung"
        })[type] || "Sonstige Entscheidung";
    }

    function caseStatus(entry) {
        const value = normalize(entry?.status || entry?.fallstatus);
        if (["erledigt", "abgeschlossen", "aufgehoben", "beendet"].includes(value) || entry?.erledigt === true) {
            return "erledigt";
        }
        return "aktiv";
    }

    function penaltyPoints(entry) {
        return number(entry?.strafpunkte ?? entry?.punkte, 0);
    }

    function warningCount(entry) {
        return number(entry?.verwarnung ?? entry?.verwarnungen, 0);
    }

    function raceBanCount(entry) {
        return number(entry?.rennssperre ?? entry?.rennsperren ?? entry?.sperren, 0);
    }

    function durationEvents(entry) {
        return number(entry?.dauerEvents ?? entry?.dauer ?? entry?.events, raceBanCount(entry));
    }

    function hasExplicitPublicationField(entry) {
        return [
            "veroeffentlicht", "veröffentlicht", "freigegeben", "freigabestatus",
            "veroeffentlichungsstatus", "veröffentlichungsstatus", "sichtbarkeit", "workflowStatus"
        ].some((key) => Object.prototype.hasOwnProperty.call(entry, key));
    }

    function isPublished(entry) {
        if (!hasExplicitPublicationField(entry)) {
            // Rückwärtskompatibilität: straf(en).json ist bisher bereits der öffentliche Export.
            return true;
        }

        if (truthy(entry?.veroeffentlicht) || truthy(entry?.["veröffentlicht"]) || truthy(entry?.freigegeben)) {
            return true;
        }

        const workflow = normalize(
            entry?.freigabestatus ||
            entry?.veroeffentlichungsstatus ||
            entry?.["veröffentlichungsstatus"] ||
            entry?.sichtbarkeit ||
            entry?.workflowStatus
        );

        return ["freigegeben", "veroffentlicht", "veröffentlicht", "public", "offentlich", "öffentlich"].includes(workflow);
    }

    function incidentText(entry) {
        return String(entry?.vorfall || entry?.beschreibung || "Keine öffentliche Beschreibung hinterlegt").trim();
    }

    function searchText(entry) {
        return normalize([
            caseId(entry), driverName(entry), driverNumber(entry), teamName(entry), eventName(entry), raceName(entry),
            incidentText(entry), entry?.entscheidung, penaltyTypeLabel(penaltyType(entry)), caseStatus(entry),
            entry?.datum, penaltyPoints(entry), warningCount(entry), raceBanCount(entry)
        ].join(" "));
    }

    function driverLink(entry) {
        const startNumber = driverNumber(entry);
        return startNumber ? `pages/fahrerprofil.html?nummer=${encodeURIComponent(startNumber)}` : "";
    }

    function createActiveCard(entry) {
        const bans = raceBanCount(entry);
        const duration = durationEvents(entry);
        const type = penaltyType(entry);
        const value = bans > 0
            ? `${duration || bans} Event${(duration || bans) === 1 ? "" : "s"}`
            : penaltyTypeLabel(type);

        return `
            <article class="penalty-active-card">
                <span class="penalty-active-icon" aria-hidden="true">!</span>
                <div class="penalty-active-copy">
                    <small>${escapeHtml(caseId(entry))} · #${driverNumber(entry) || "–"}</small>
                    <strong>${escapeHtml(driverName(entry))}</strong>
                    <p>${escapeHtml(teamName(entry))}</p>
                </div>
                <div class="penalty-active-value">
                    <strong>${escapeHtml(value)}</strong>
                    <small>${escapeHtml(eventName(entry))}</small>
                </div>
            </article>
        `;
    }

    function createPenaltyCard(entry) {
        const status = caseStatus(entry);
        const type = penaltyType(entry);
        const link = driverLink(entry);
        const name = escapeHtml(driverName(entry));
        const driverMarkup = link
            ? `<a class="penalty-driver-link" href="${escapeHtml(link)}">${name}</a>`
            : name;

        const values = [];
        if (penaltyPoints(entry) > 0) values.push([penaltyPoints(entry), "Punkte"]);
        if (warningCount(entry) > 0) values.push([warningCount(entry), "Verwarnung"]);
        if (raceBanCount(entry) > 0) values.push([durationEvents(entry) || raceBanCount(entry), "Event-Sperre"]);
        if (!values.length) values.push(["–", "Auswirkung"]);

        return `
            <article class="penalty-card" data-fall="${escapeHtml(caseId(entry))}">
                <header class="penalty-card-head">
                    <div>
                        <span class="penalty-case-id">${escapeHtml(caseId(entry))} · #${driverNumber(entry) || "–"}</span>
                        <h3>${driverMarkup}</h3>
                        <p class="penalty-team">${escapeHtml(teamName(entry))}</p>
                    </div>
                    <span class="penalty-status-badge ${status === "aktiv" ? "is-active" : "is-done"}">
                        ${status === "aktiv" ? "Aktiv" : "Erledigt"}
                    </span>
                </header>

                <div class="penalty-card-meta">
                    <div><span>Datum</span><strong>${escapeHtml(formatDate(entry?.datum))}</strong></div>
                    <div title="${escapeHtml(eventName(entry))}"><span>Event</span><strong>${escapeHtml(eventName(entry))}</strong></div>
                    <div><span>Session</span><strong>${escapeHtml(raceName(entry))}</strong></div>
                </div>

                <div class="penalty-incident">
                    <small>Öffentlicher Vorfall</small>
                    <p>${escapeHtml(incidentText(entry))}</p>
                </div>

                <div class="penalty-decision-row">
                    <span class="penalty-type-badge type-${type}">${escapeHtml(penaltyTypeLabel(type))}</span>
                    <div class="penalty-values">
                        ${values.map(([value, label]) => `
                            <span class="penalty-value">
                                <strong>${escapeHtml(value)}</strong>
                                <small>${escapeHtml(label)}</small>
                            </span>
                        `).join("")}
                    </div>
                </div>

                <footer class="penalty-card-footer">
                    <span>${escapeHtml(entry?.entscheidung || penaltyTypeLabel(type))}</span>
                    <span class="penalty-published">✓ freigegebener Export</span>
                </footer>
            </article>
        `;
    }

    function updateStatistics() {
        const active = publishedPenalties.filter((entry) => caseStatus(entry) === "aktiv");
        const points = publishedPenalties.reduce((sum, entry) => sum + penaltyPoints(entry), 0);
        const bans = publishedPenalties.reduce((sum, entry) => sum + raceBanCount(entry), 0);

        if (elements.total) elements.total.textContent = String(publishedPenalties.length);
        if (elements.active) elements.active.textContent = String(active.length);
        if (elements.points) elements.points.textContent = new Intl.NumberFormat("de-DE").format(points);
        if (elements.bans) elements.bans.textContent = String(bans);
    }

    function renderActivePenalties() {
        if (!elements.activeList) return;
        const active = publishedPenalties.filter((entry) => caseStatus(entry) === "aktiv");

        elements.activeList.innerHTML = active.length
            ? active.map(createActiveCard).join("")
            : `<div class="penalty-active-empty"><strong>Keine aktive Sanktion im veröffentlichten Datenstand.</strong></div>`;
        elements.activeList.setAttribute("aria-busy", "false");
    }

    function populateEvents() {
        if (!elements.eventFilter) return;
        const events = [...new Set(publishedPenalties.map(eventName).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));

        elements.eventFilter.innerHTML = `
            <option value="">Alle Veranstaltungen</option>
            ${events.map((event) => `<option value="${escapeHtml(normalize(event))}">${escapeHtml(event)}</option>`).join("")}
        `;
    }

    function sortPenalties(entries) {
        const mode = elements.sort?.value || "datum";
        return [...entries].sort((a, b) => {
            if (mode === "fahrer") return driverName(a).localeCompare(driverName(b), "de", { sensitivity: "base" });
            if (mode === "punkte") return penaltyPoints(b) - penaltyPoints(a) || caseId(b).localeCompare(caseId(a), "de", { numeric: true });
            if (mode === "fall") return caseId(b).localeCompare(caseId(a), "de", { numeric: true });

            const first = parseDate(a?.datum)?.getTime() || 0;
            const second = parseDate(b?.datum)?.getTime() || 0;
            return second - first || caseId(b).localeCompare(caseId(a), "de", { numeric: true });
        });
    }

    function filterAndRender() {
        const query = normalize(elements.search?.value);
        const selectedEvent = elements.eventFilter?.value || "";
        const selectedType = elements.typeFilter?.value || "";
        const selectedStatus = elements.statusFilter?.value || "";

        const filtered = publishedPenalties.filter((entry) => {
            return (!query || searchText(entry).includes(query)) &&
                (!selectedEvent || normalize(eventName(entry)) === selectedEvent) &&
                (!selectedType || penaltyType(entry) === selectedType) &&
                (!selectedStatus || caseStatus(entry) === selectedStatus);
        });

        const sorted = sortPenalties(filtered);
        if (elements.grid) {
            elements.grid.innerHTML = sorted.map(createPenaltyCard).join("");
            elements.grid.setAttribute("aria-busy", "false");
        }

        if (elements.empty) elements.empty.hidden = sorted.length > 0;
        if (elements.resultCount) {
            elements.resultCount.textContent = `${sorted.length} von ${publishedPenalties.length} Entscheidungen`;
        }
    }

    function resetFilters() {
        if (elements.search) elements.search.value = "";
        if (elements.eventFilter) elements.eventFilter.value = "";
        if (elements.typeFilter) elements.typeFilter.value = "";
        if (elements.statusFilter) elements.statusFilter.value = "";
        if (elements.sort) elements.sort.value = "datum";
        filterAndRender();
        elements.search?.focus();
    }

    function showError(error) {
        const message = escapeHtml(error?.message || "Unbekannter Ladefehler");
        if (elements.grid) {
            elements.grid.innerHTML = `<div class="penalty-error"><strong>Strafendaten konnten nicht geladen werden.</strong><p>${message}</p></div>`;
            elements.grid.setAttribute("aria-busy", "false");
        }
        if (elements.activeList) {
            elements.activeList.innerHTML = `<div class="penalty-error"><strong>Aktive Sanktionen sind nicht verfügbar.</strong></div>`;
            elements.activeList.setAttribute("aria-busy", "false");
        }
        if (elements.resultCount) elements.resultCount.textContent = "Daten nicht verfügbar";
        console.error("GTM Strafencenter:", error);
    }

    [elements.search, elements.eventFilter, elements.typeFilter, elements.statusFilter, elements.sort]
        .filter(Boolean)
        .forEach((element) => element.addEventListener(element === elements.search ? "input" : "change", filterAndRender));
    elements.reset?.addEventListener("click", resetFilters);

    try {
        if (!window.GTM || typeof window.GTM.load !== "function") {
            throw new Error("Die GTM Data Engine wurde nicht geladen.");
        }

        const data = await window.GTM.load("strafen", { forceReload: true });
        if (!Array.isArray(data)) throw new Error("strafen.json enthält keine gültige Liste.");

        publishedPenalties = data
            .filter((entry) => entry && typeof entry === "object" && isPublished(entry))
            .filter((entry) => driverName(entry) !== "Unbekannter Fahrer");

        updateStatistics();
        renderActivePenalties();
        populateEvents();
        filterAndRender();
    } catch (error) {
        showError(error);
    }
});
