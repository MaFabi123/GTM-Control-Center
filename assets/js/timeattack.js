/* ==========================================================
   GTM TIME ATTACK
   Saisonübergreifende Fahrerwertung
========================================================== */

(() => {
    "use strict";

    const state = {
        data: null,
        saison: null,
        suche: "",
        sortierung: "platzierung"
    };

    const el = id => document.getElementById(id);

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function number(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function points(value) {
        return new Intl.NumberFormat("de-DE", {
            maximumFractionDigits: 2
        }).format(number(value));
    }

    function setText(id, value, fallback = "–") {
        const element = el(id);
        if (!element) return;
        const valid = value !== null && value !== undefined && String(value).trim() !== "";
        element.textContent = valid ? String(value) : fallback;
    }

    function imagePath(driver) {
        const image = String(driver?.bild || "default.png").trim();
        const preferredImage = (
            image.toLocaleLowerCase("de-DE") === "default.png" &&
            driver?.nummer
        )
            ? `${driver.nummer}.png`
            : image;

        return `assets/images/fahrer/${encodeURIComponent(preferredImage).replace(/%2F/gi, "/")}`;
    }

    function driverLink(driver) {
        return `pages/fahrerprofil.html?nummer=${encodeURIComponent(driver?.nummer ?? "")}`;
    }

    function imageMarkup(driver, className = "") {
        const numberValue = encodeURIComponent(driver?.nummer ?? "");
        return `<img class="${className}" src="${imagePath(driver)}" alt="${escapeHtml(driver?.name || "Fahrer")}" loading="lazy"
            onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='assets/images/fahrer/${numberValue}.png';}else{this.onerror=null;this.src='assets/images/fahrer/default.png';}">`;
    }

    function getSeasons() {
        return Array.isArray(state.data?.saisons) ? state.data.saisons : [];
    }

    function seasonDrivers(season = state.saison) {
        return Array.isArray(season?.fahrerwertung) ? season.fahrerwertung : [];
    }

    function chooseInitialSeason(seasons) {
        const requested = Number(new URLSearchParams(window.location.search).get("saison"));
        if (requested) {
            const match = seasons.find(season => number(season.saison) === requested);
            if (match) return match;
        }

        const filled = seasons.filter(season => seasonDrivers(season).length > 0);
        return filled.sort((a, b) => number(b.saison) - number(a.saison))[0] ||
            [...seasons].sort((a, b) => number(a.saison) - number(b.saison))[0] || null;
    }

    function renderTabs() {
        const container = el("ta-saison-tabs");
        if (!container) return;

        container.innerHTML = getSeasons().map(season => {
            const active = season === state.saison;
            const hasData = seasonDrivers(season).length > 0;
            return `<button class="ta-saison-tab${active ? " is-active" : ""}" type="button"
                role="tab" aria-selected="${active}" data-ta-saison="${escapeHtml(season.saison)}">
                ${escapeHtml(season.saison)}
                <small>${hasData ? `${seasonDrivers(season).length} Fahrer` : "Vorbereitung"}</small>
            </button>`;
        }).join("");

        container.querySelectorAll("[data-ta-saison]").forEach(button => {
            button.addEventListener("click", () => {
                state.saison = getSeasons().find(season => String(season.saison) === button.dataset.taSaison) || state.saison;
                state.suche = "";
                if (el("ta-suche")) el("ta-suche").value = "";
                const url = new URL(window.location.href);
                url.searchParams.set("saison", state.saison.saison);
                window.history.replaceState({}, "", url);
                render();
            });
        });
    }

    function renderSummary() {
        const season = state.saison;
        const drivers = seasonDrivers();
        const leader = drivers[0] || null;
        const roundsDone = number(season?.rundenAbgeschlossen);
        const roundsTotal = number(season?.rundenGesamt);

        setText("ta-saison-name", season?.saisonName || `GTM Time Attack ${season?.saison || ""}`);
        setText("ta-saison-status", season?.status || "in Vorbereitung");
        setText("ta-fahrer-anzahl", drivers.length);
        setText("ta-runden-stand", roundsTotal ? `${roundsDone} / ${roundsTotal}` : "–");
        setText("ta-tabellenfuehrer", leader?.name, "Noch offen");
        setText("ta-fuehrungspunkte", leader ? points(leader.punkte) : "–");
    }

    function renderPodium() {
        const container = el("ta-podium");
        if (!container) return;

        container.innerHTML = seasonDrivers().slice(0, 3).map((driver, index) => {
            const placement = number(driver.platzierung) || index + 1;
            return `<a class="ta-podium-card${placement === 1 ? " is-first" : ""}" href="${driverLink(driver)}">
                <div class="ta-podium-image">
                    ${imageMarkup(driver)}
                    <span class="ta-podium-place">${placement}</span>
                </div>
                <div class="ta-podium-info">
                    <small>#${escapeHtml(driver.nummer || "–")} · ${escapeHtml(driver.team || "Ohne Team")}</small>
                    <h3>${escapeHtml(driver.name || "Unbekannt")}</h3>
                    <p>${escapeHtml(driver.fahrzeug || "Kein Fahrzeug eingetragen")}</p>
                    <strong class="ta-podium-points">${points(driver.punkte)} Punkte</strong>
                </div>
            </a>`;
        }).join("");
    }

    function filteredDrivers() {
        const term = state.suche.trim().toLocaleLowerCase("de-DE");
        const drivers = seasonDrivers().filter(driver => {
            if (!term) return true;
            return [driver.name, driver.nummer, driver.team, driver.fahrzeug]
                .some(value => String(value ?? "").toLocaleLowerCase("de-DE").includes(term));
        });

        return drivers.sort((a, b) => {
            if (state.sortierung === "punkte") return number(b.punkte) - number(a.punkte);
            if (state.sortierung === "siege") return number(b.siege) - number(a.siege) || number(b.punkte) - number(a.punkte);
            if (state.sortierung === "teilnahmen") return number(b.teilnahmen) - number(a.teilnahmen) || number(b.punkte) - number(a.punkte);
            const aPlace = number(a.platzierung) || Number.MAX_SAFE_INTEGER;
            const bPlace = number(b.platzierung) || Number.MAX_SAFE_INTEGER;
            return aPlace - bPlace || number(b.punkte) - number(a.punkte);
        });
    }

    function renderRanking() {
        const container = el("ta-rangliste");
        const empty = el("ta-keine-treffer");
        if (!container || !empty) return;

        const drivers = filteredDrivers();
        empty.hidden = drivers.length > 0;

        container.innerHTML = drivers.map((driver, index) => {
            const placement = number(driver.platzierung) || index + 1;
            return `<a class="ta-ranking-row" href="${driverLink(driver)}">
                <span class="ta-rank-place">${placement}</span>
                <span class="ta-rank-image">${imageMarkup(driver)}</span>
                <span class="ta-rank-driver">
                    <span>Fahrer · #${escapeHtml(driver.nummer || "–")}</span>
                    <strong>${escapeHtml(driver.name || "Unbekannt")}</strong>
                </span>
                <span class="ta-rank-team">
                    <span>Team</span>
                    <strong>${escapeHtml(driver.team || "Ohne Team")}</strong>
                </span>
                <span class="ta-rank-car">
                    <span>Fahrzeug</span>
                    <strong>${escapeHtml(driver.fahrzeug || "Nicht eingetragen")}</strong>
                </span>
                <span class="ta-rank-stat is-points">
                    <span>Punkte</span>
                    <strong>${points(driver.punkte)}</strong>
                </span>
                <span class="ta-rank-stat is-secondary">
                    <span>Starts</span>
                    <strong>${number(driver.teilnahmen)}</strong>
                </span>
                <span class="ta-rank-stat is-secondary">
                    <span>Siege</span>
                    <strong>${number(driver.siege)}</strong>
                </span>
                <span class="ta-rank-stat is-secondary">
                    <span>Podien</span>
                    <strong>${number(driver.podiums)}</strong>
                </span>
                <span class="ta-rank-arrow">→</span>
            </a>`;
        }).join("");
    }

    function render() {
        renderTabs();
        renderSummary();

        const hasDrivers = seasonDrivers().length > 0;
        el("ta-vorbereitung").hidden = hasDrivers;
        el("ta-wertung").hidden = !hasDrivers;

        if (hasDrivers) {
            renderPodium();
            renderRanking();
        }
    }

    async function loadData() {
        if (window.GTM?.load) {
            return window.GTM.load("ta", { forceReload: true });
        }

        const response = await fetch("data/json/ta.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`ta.json: HTTP ${response.status}`);
        return response.json();
    }

    function showError(error) {
        console.error("Time-Attack-Daten konnten nicht geladen werden:", error);
        setText("ta-saison-status", "Daten fehlen");
        el("ta-vorbereitung").hidden = false;
        el("ta-vorbereitung").querySelector("h2").textContent = "Die Time-Attack-Daten konnten nicht geladen werden.";
        el("ta-vorbereitung").querySelector("p").textContent = "Führe den GTM-Datenexport aus und prüfe anschließend data/json/ta.json.";
    }

    document.addEventListener("DOMContentLoaded", async () => {
        el("ta-suche")?.addEventListener("input", event => {
            state.suche = event.target.value;
            renderRanking();
        });

        el("ta-sortierung")?.addEventListener("change", event => {
            state.sortierung = event.target.value;
            renderRanking();
        });

        try {
            state.data = await loadData();
            const seasons = getSeasons();
            state.saison = chooseInitialSeason(seasons);

            if (!state.saison) {
                throw new Error("In ta.json wurden keine TA-Saisons gefunden.");
            }

            render();
        } catch (error) {
            showError(error);
        }
    });
})();
