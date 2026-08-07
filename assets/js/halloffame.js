/* ==========================================================
   GTM HALL OF FAME
   Nur abgeschlossene, geprüfte und freigegebene Daten
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const elements = {
        champions: document.getElementById("hof-confirmed-champions"),
        seasons: document.getElementById("hof-fixed-seasons"),
        records: document.getElementById("hof-confirmed-records"),
        active: document.getElementById("hof-active-series"),
        tabs: document.getElementById("hof-category-tabs"),
        gallery: document.getElementById("hof-gallery"),
        liveGrid: document.getElementById("hof-live-grid"),
        timeline: document.getElementById("hof-season-timeline")
    };

    const FALLBACK_DRIVER = "assets/images/fahrer/default.png";

    const state = {
        category: "alle",
        honors: [],
        records: [],
        seasons: [],
        liveLeaders: []
    };

    if (!window.GTM || typeof window.GTM.load !== "function") {
        showError("Die GTM Data Engine wurde nicht geladen.");
        return;
    }

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
            .replace(/ß/g, "ss")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function toNumber(value, fallback = 0) {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : fallback;
        }

        const raw = String(value ?? "").trim();
        if (!raw) return fallback;

        const cleaned = raw
            .replace(/\s/g, "")
            .replace(/\.(?=\d{3}(?:\D|$))/g, "")
            .replace(",", ".")
            .replace(/[^0-9.-]/g, "");

        const number = Number(cleaned);
        return Number.isFinite(number) ? number : fallback;
    }

    function formatNumber(value, maximumFractionDigits = 1) {
        return new Intl.NumberFormat("de-DE", {
            maximumFractionDigits
        }).format(toNumber(value));
    }

    function asArray(value) {
        return Array.isArray(value) ? value.filter(Boolean) : [];
    }

    function getDriverName(driver) {
        return String(driver?.name || driver?.fahrer || "Unbekannter Fahrer").trim();
    }

    function getDriverNumber(driver) {
        return toNumber(driver?.nummer ?? driver?.startnummer);
    }

    function getTeamName(driver) {
        return String(driver?.teamZuordnung || driver?.team || "Kein Team").trim() || "Kein Team";
    }

    function getDriverImage(driver) {
        const image = String(driver?.bild || "").trim();
        const number = getDriverNumber(driver);

        if (image && normalizeText(image) !== "default png") {
            return `assets/images/fahrer/${encodeURIComponent(image)}`;
        }

        return number > 0
            ? `assets/images/fahrer/${encodeURIComponent(String(number))}.png`
            : FALLBACK_DRIVER;
    }

    function getDriverUrl(driver) {
        return `pages/fahrerprofil.html?nummer=${encodeURIComponent(getDriverNumber(driver))}`;
    }

    function getSeriesCategory(value) {
        const marker = normalizeText(value);
        if (marker.includes("time attack") || marker === "ta" || marker.startsWith("ta ")) return "ta";
        if (marker.includes("fun")) return "fun";
        return "masters";
    }

    function isCompleted(item) {
        if (item?.abgeschlossen === true || item?.beendet === true || item?.final === true) {
            return true;
        }

        const status = normalizeText(item?.status || item?.saisonStatus);
        return ["abgeschlossen", "beendet", "final", "finalisiert"].some((word) => status.includes(word));
    }

    function isApproved(item) {
        if (
            item?.freigegeben === true ||
            item?.veroeffentlicht === true ||
            item?.approved === true ||
            item?.archiviert === true
        ) {
            return true;
        }

        const approval = normalizeText(
            item?.freigabestatus ||
            item?.freigabeStatus ||
            item?.statusFreigabe ||
            item?.approvalStatus
        );

        return ["freigegeben", "veroffentlicht", "archiviert", "approved"].some((word) => approval.includes(word));
    }

    function normalizeMasters(raw) {
        const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];

        return list.map((season, index) => ({
            ...season,
            id: String(season?.id || `masters-${index + 1}`),
            category: "masters",
            seriesName: "GTM Masters",
            seasonName: String(season?.saisonName || season?.saison || `GTM Masters Saison ${index + 1}`),
            ranking: asArray(season?.fahrerwertung)
        }));
    }

    function normalizeTimeAttack(raw) {
        return asArray(raw?.saisons || raw).map((season, index) => ({
            ...season,
            id: String(season?.id || `ta-${index + 1}`),
            category: "ta",
            seriesName: "GTM Time Attack",
            seasonName: String(season?.saisonName || `GTM Time Attack Saison ${season?.saison || index + 1}`),
            ranking: asArray(season?.fahrerwertung)
        }));
    }

    function createHonors(seasons) {
        return seasons.flatMap((season) => {
            if (!isCompleted(season) || !isApproved(season)) {
                return [];
            }

            const champion = season.ranking[0];
            if (!champion) {
                return [];
            }

            return [{
                id: `${season.id}-champion`,
                category: season.category,
                type: "Champion",
                seasonName: season.seasonName,
                driver: champion,
                points: toNumber(champion?.punkte ?? champion?.wertung),
                team: getTeamName(champion)
            }];
        });
    }

    function createRecords(seasons) {
        return seasons.flatMap((season) => {
            if (!isCompleted(season) || !isApproved(season)) {
                return [];
            }

            return asArray(season?.rekorde || season?.records).filter((record) => isApproved(record));
        });
    }

    function createLiveLeaders(seasons) {
        return seasons.flatMap((season) => {
            if (isCompleted(season) || season.ranking.length === 0) {
                return [];
            }

            return [{
                category: season.category,
                seasonName: season.seasonName,
                driver: season.ranking[0],
                points: toNumber(season.ranking[0]?.punkte ?? season.ranking[0]?.wertung),
                detail: season.category === "ta"
                    ? `${formatNumber(season.ranking[0]?.siege, 0)} Siege · ${formatNumber(season.ranking[0]?.podiums, 0)} Podien`
                    : `${formatNumber(season.ranking[0]?.fastLap, 0)} Fast Laps`
            }];
        });
    }

    function getSeasonStatus(season) {
        if (isCompleted(season) && isApproved(season)) {
            return { label: "Archiviert", className: "archived", note: "Dauerhaft freigegeben" };
        }

        if (isCompleted(season)) {
            return { label: "Prüfung offen", className: "waiting", note: "Abgeschlossen, noch nicht freigegeben" };
        }

        if (season.ranking.length > 0) {
            return { label: "Läuft", className: "live", note: "Vorläufige Wertung" };
        }

        return { label: "Vorbereitet", className: "", note: "Noch keine Wertungsdaten" };
    }

    function groupFunSeasons(calendar) {
        const groups = new Map();

        calendar
            .filter((event) => getSeriesCategory(event?.modul || event?.serieId || event?.serie) === "fun")
            .forEach((event) => {
                const name = String(event?.saisonName || event?.serie || "GTM FUN Events").trim();
                const key = normalizeText(name);

                if (!groups.has(key)) {
                    groups.set(key, {
                        id: String(event?.saisonId || `fun-${key}`),
                        category: "fun",
                        seriesName: "GTM FUN Events",
                        seasonName: name,
                        events: [],
                        ranking: []
                    });
                }

                groups.get(key).events.push(event);
            });

        return [...groups.values()].map((season) => {
            const allCompleted = season.events.length > 0 && season.events.every(isCompleted);
            const allApproved = season.events.length > 0 && season.events.every(isApproved);

            return {
                ...season,
                abgeschlossen: allCompleted,
                freigegeben: allApproved,
                eventCount: season.events.length
            };
        });
    }

    function createHonorCard(entry) {
        const driver = entry.driver || {};
        const number = getDriverNumber(driver);

        return `
            <a class="hof-honor-card" href="${escapeHtml(getDriverUrl(driver))}">
                <span class="hof-honor-badge">★ ${escapeHtml(entry.type)}</span>
                <div class="hof-honor-image">
                    <img
                        src="${escapeHtml(getDriverImage(driver))}"
                        alt="${escapeHtml(getDriverName(driver))}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${FALLBACK_DRIVER}';"
                    >
                </div>
                <div class="hof-honor-body">
                    <small>${escapeHtml(entry.seasonName)}</small>
                    <h3>${number > 0 ? `#${number} · ` : ""}${escapeHtml(getDriverName(driver))}</h3>
                    <p>${escapeHtml(entry.team)}</p>
                    <div class="hof-honor-result">
                        <strong>${formatNumber(entry.points, 1)}</strong>
                        <span>Punkte bei Freigabe</span>
                    </div>
                </div>
            </a>
        `;
    }

    function renderGallery() {
        const visible = state.category === "alle"
            ? state.honors
            : state.honors.filter((entry) => entry.category === state.category);

        if (visible.length === 0) {
            const categoryLabel = {
                masters: "Masters",
                ta: "Time Attack",
                fun: "FUN Events"
            }[state.category] || "GTM";

            elements.gallery.innerHTML = `
                <div class="hof-empty-archive">
                    <div>
                        <span class="hof-empty-symbol" aria-hidden="true">★</span>
                        <strong>Das erste Kapitel entsteht gerade.</strong>
                        <span>
                            Für ${escapeHtml(categoryLabel)} liegt noch kein zugleich abgeschlossener,
                            geprüfter und freigegebener Ehreneintrag vor. Laufende Tabellenführer
                            werden nicht vorzeitig zu Champions erklärt.
                        </span>
                    </div>
                </div>
            `;
        } else {
            elements.gallery.innerHTML = visible.map(createHonorCard).join("");
        }

        elements.gallery.setAttribute("aria-busy", "false");
    }

    function createLiveCard(entry) {
        const driver = entry.driver || {};
        const number = getDriverNumber(driver);
        const series = entry.category === "ta" ? "Time Attack" : "Masters";

        return `
            <a class="hof-live-card" href="${escapeHtml(getDriverUrl(driver))}">
                <div class="hof-live-card-visual">
                    <div class="hof-live-image">
                        <img
                            src="${escapeHtml(getDriverImage(driver))}"
                            alt="${escapeHtml(getDriverName(driver))}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='${FALLBACK_DRIVER}';"
                        >
                    </div>
                </div>
                <div class="hof-live-card-body">
                    <span class="hof-live-status">Live · noch nicht historisch</span>
                    <small>${escapeHtml(entry.seasonName || series)}</small>
                    <h3>${number > 0 ? `#${number} · ` : ""}${escapeHtml(getDriverName(driver))}</h3>
                    <p>${escapeHtml(getTeamName(driver))}</p>
                    <div class="hof-live-result">
                        <strong>${formatNumber(entry.points, 1)}</strong>
                        <span>${escapeHtml(entry.detail)}<br>Punkte aktuell</span>
                    </div>
                </div>
            </a>
        `;
    }

    function renderLiveLeaders() {
        elements.liveGrid.innerHTML = state.liveLeaders.length > 0
            ? state.liveLeaders.map(createLiveCard).join("")
            : '<div class="hof-loading">Derzeit liegt keine laufende Fahrerwertung vor.</div>';
    }

    function createSeasonRow(season, index) {
        const status = getSeasonStatus(season);
        const rankingCount = season.ranking.length;
        const eventCount = toNumber(season?.eventCount) || toNumber(season?.rundenGesamt) || 0;
        const countText = rankingCount > 0
            ? `${rankingCount} Fahrer in der Wertung`
            : eventCount > 0
                ? `${eventCount} Termine hinterlegt`
                : "Noch keine Wertungsdaten";

        return `
            <article class="hof-season-row">
                <span class="hof-season-marker">${String(index + 1).padStart(2, "0")}</span>
                <div class="hof-season-main">
                    <strong>${escapeHtml(season.seasonName)}</strong>
                    <span>${escapeHtml(status.note)}</span>
                </div>
                <div class="hof-season-meta">
                    <strong>${escapeHtml(season.seriesName)}</strong>
                    <span>${escapeHtml(countText)}</span>
                </div>
                <span class="hof-season-state ${escapeHtml(status.className)}">${escapeHtml(status.label)}</span>
            </article>
        `;
    }

    function renderTimeline() {
        elements.timeline.innerHTML = state.seasons.length > 0
            ? state.seasons.map(createSeasonRow).join("")
            : '<div class="hof-loading">Noch keine Saisons oder Events hinterlegt.</div>';
    }

    function bindEvents() {
        elements.tabs.addEventListener("click", (event) => {
            const button = event.target.closest("[data-category]");
            if (!button) return;

            state.category = button.dataset.category;

            elements.tabs.querySelectorAll("[data-category]").forEach((tab) => {
                const active = tab === button;
                tab.classList.toggle("is-active", active);
                tab.setAttribute("aria-selected", String(active));
            });

            renderGallery();
        });
    }

    function showError(message) {
        const html = `
            <div class="hof-error">
                <strong>Die Hall of Fame konnte nicht geladen werden.</strong>
                <span>${escapeHtml(message)}</span>
            </div>
        `;

        if (elements.gallery) elements.gallery.innerHTML = html;
        if (elements.liveGrid) elements.liveGrid.innerHTML = html;
        if (elements.timeline) elements.timeline.innerHTML = html;
    }

    async function loadHallOfFame() {
        try {
            const [drivers, teams, calendar, mastersRaw, taRaw] = await Promise.all([
                window.GTM.load("fahrer", { forceReload: true }),
                window.GTM.load("teams", { forceReload: true }),
                window.GTM.load("kalender", { forceReload: true }),
                window.GTM.load("meisterschaft", { forceReload: true }),
                window.GTM.load("ta", { forceReload: true })
            ]);

            const masters = normalizeMasters(mastersRaw);
            const timeAttack = normalizeTimeAttack(taRaw);
            const fun = groupFunSeasons(asArray(calendar));
            const rankedSeasons = [...masters, ...timeAttack];

            state.seasons = [...rankedSeasons, ...fun];
            state.honors = createHonors(rankedSeasons);
            state.records = createRecords(rankedSeasons);
            state.liveLeaders = createLiveLeaders(rankedSeasons);

            const fixedSeasons = state.seasons.filter((season) => isCompleted(season) && isApproved(season));

            elements.champions.textContent = formatNumber(state.honors.length, 0);
            elements.seasons.textContent = formatNumber(fixedSeasons.length, 0);
            elements.records.textContent = formatNumber(state.records.length, 0);
            elements.active.textContent = formatNumber(state.liveLeaders.length, 0);

            void drivers;
            void teams;

            bindEvents();
            renderGallery();
            renderLiveLeaders();
            renderTimeline();
        } catch (error) {
            console.error("GTM Hall of Fame konnte nicht geladen werden:", error);
            showError(error?.message || "Unbekannter Datenfehler");
        }
    }

    await loadHallOfFame();
});
