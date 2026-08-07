/* ==========================================================
   GTM STATISTIKEN
   Gesamtüberblick, Masters und Time Attack
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const elements = {
        dataState: document.getElementById("stats-data-state"),
        kpiGrid: document.getElementById("stats-kpi-grid"),
        viewTabs: document.getElementById("stats-view-tabs"),
        seasonField: document.getElementById("stats-season-field"),
        seasonSelect: document.getElementById("stats-season-select"),
        search: document.getElementById("stats-search"),
        sort: document.getElementById("stats-sort"),
        scopeLabel: document.getElementById("stats-scope-label"),
        scopeTitle: document.getElementById("stats-scope-title"),
        scopeNote: document.getElementById("stats-scope-note"),
        podiumLabel: document.getElementById("stats-podium-label"),
        podiumTitle: document.getElementById("stats-podium-title"),
        podium: document.getElementById("stats-podium"),
        teamLabel: document.getElementById("stats-team-label"),
        teamTitle: document.getElementById("stats-team-title"),
        teamList: document.getElementById("stats-team-list"),
        vehicleLabel: document.getElementById("stats-vehicle-label"),
        vehicleTitle: document.getElementById("stats-vehicle-title"),
        vehicleList: document.getElementById("stats-vehicle-list"),
        rankingLabel: document.getElementById("stats-ranking-label"),
        rankingTitle: document.getElementById("stats-ranking-title"),
        ranking: document.getElementById("stats-ranking"),
        resultCount: document.getElementById("stats-result-count"),
        empty: document.getElementById("stats-empty"),
        sourceText: document.getElementById("stats-source-text")
    };

    const FALLBACK_DRIVER = "assets/images/fahrer/default.png";

    const state = {
        view: "gesamt",
        season: "all",
        query: "",
        sort: "aktivitaet"
    };

    const data = {
        drivers: [],
        teams: [],
        vehicles: [],
        calendar: [],
        mastersSeasons: [],
        taSeasons: []
    };

    if (!window.GTM || typeof window.GTM.load !== "function") {
        showFatalError("Die GTM Data Engine wurde nicht geladen.");
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
            .replace(/&/g, "und")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function createSlug(value) {
        return normalizeText(value).replace(/\s+/g, "-");
    }

    function toNumber(value, fallback = 0) {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : fallback;
        }

        const raw = String(value ?? "").trim();
        if (!raw) {
            return fallback;
        }

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

    function unique(values) {
        return [...new Set(values.filter(Boolean))];
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

    function getVehicleName(driver) {
        return String(driver?.fahrzeug || "Kein Fahrzeug eingetragen").trim() || "Kein Fahrzeug eingetragen";
    }

    function getPoints(driver) {
        return toNumber(driver?.punkte ?? driver?.wertung);
    }

    function getPlacement(driver, fallback = 9999) {
        return toNumber(driver?.platzierung ?? driver?.platz, fallback);
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

    function getTeamUrl(teamName) {
        return `pages/team.html?team=${encodeURIComponent(createSlug(teamName))}`;
    }

    function getVehicleDisplayName(vehicle) {
        return String(
            vehicle?.anzeigename ||
            [vehicle?.hersteller, vehicle?.fahrzeug].filter(Boolean).join(" ") ||
            "Unbekanntes Fahrzeug"
        ).trim();
    }

    function findVehicle(vehicleName) {
        const target = normalizeText(vehicleName);
        if (!target || target === "kein fahrzeug eingetragen") {
            return null;
        }

        return data.vehicles.find((vehicle) => {
            return [vehicle?.anzeigename, vehicle?.fahrzeug]
                .map(normalizeText)
                .some((name) => name === target || name.includes(target) || target.includes(name));
        }) || null;
    }

    function getVehicleUrl(vehicleName) {
        const match = findVehicle(vehicleName);
        if (!match) {
            return "pages/fahrzeuge.html";
        }

        const id = toNumber(match?.nummer) || createSlug(getVehicleDisplayName(match));
        return `pages/fahrzeugprofil.html?fahrzeug=${encodeURIComponent(id)}`;
    }

    function getSeries(driver) {
        return unique(asArray(driver?.serien).map((entry) => normalizeText(entry)));
    }

    function getParticipations(driver) {
        return asArray(driver?.teilnahmen);
    }

    function getSearchText(driver) {
        return normalizeText([
            getDriverNumber(driver),
            getDriverName(driver),
            getTeamName(driver),
            getVehicleName(driver),
            ...getSeries(driver),
            ...getParticipations(driver).flatMap((entry) => [entry?.serie, entry?.saisonName, entry?.event])
        ].join(" "));
    }

    function normalizeMasters(raw) {
        const seasons = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];

        return seasons.map((season, index) => ({
            ...season,
            id: String(season?.id || `masters-${createSlug(season?.saison || season?.saisonName || index + 1)}`),
            saisonName: String(season?.saisonName || season?.saison || `GTM Masters Saison ${index + 1}`),
            fahrerwertung: asArray(season?.fahrerwertung)
        }));
    }

    function normalizeTimeAttack(raw) {
        return asArray(raw?.saisons || raw).map((season, index) => ({
            ...season,
            id: String(season?.id || `ta-${season?.saison || index + 1}`),
            saisonName: String(season?.saisonName || `GTM Time Attack Saison ${season?.saison || index + 1}`),
            fahrerwertung: asArray(season?.fahrerwertung)
        }));
    }

    function selectedMasters() {
        return data.mastersSeasons.find((season) => season.id === state.season) || data.mastersSeasons[0] || null;
    }

    function selectedTimeAttack() {
        return data.taSeasons.find((season) => season.id === state.season) || data.taSeasons[0] || null;
    }

    function getCalendarForSeries(seriesId, season = null) {
        const series = data.calendar.filter((race) => {
            const marker = normalizeText(race?.modul || race?.serieId || race?.serie);
            return marker.includes(normalizeText(seriesId));
        });

        if (!season) {
            return series;
        }

        const seasonId = normalizeText(season?.id);
        const seasonName = normalizeText(season?.saisonName || season?.saison);

        const exact = series.filter((race) => {
            return normalizeText(race?.saisonId) === seasonId ||
                normalizeText(race?.saisonName) === seasonName;
        });

        return exact.length > 0 ? exact : series;
    }

    function isCompleted(event) {
        return event?.abgeschlossen === true || normalizeText(event?.status) === "abgeschlossen";
    }

    function createKpiCard(item, index) {
        return `
            <article class="stats-kpi-card" data-index="0${index + 1}">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.value)}</strong>
                <small>${escapeHtml(item.note)}</small>
            </article>
        `;
    }

    function setKpis(items) {
        elements.kpiGrid.innerHTML = items.map(createKpiCard).join("");
    }

    function createFocusCard(item, index) {
        const driver = item.driver || {};
        const number = getDriverNumber(driver);
        const rank = item.rank || index + 1;
        const href = item.href || getDriverUrl(driver);

        return `
            <a class="stats-focus-card rank-${escapeHtml(rank)}" href="${escapeHtml(href)}">
                <div class="stats-focus-card-top">
                    <span class="stats-focus-category">${escapeHtml(item.category || "GTM")}</span>
                    <span class="stats-focus-rank">${escapeHtml(item.rankLabel || `P${rank}`)}</span>
                </div>

                <div class="stats-focus-image">
                    <img
                        src="${escapeHtml(getDriverImage(driver))}"
                        alt="${escapeHtml(getDriverName(driver))}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${FALLBACK_DRIVER}';"
                    >
                </div>

                <div class="stats-focus-body">
                    <span class="stats-focus-number">${number > 0 ? `#${number}` : escapeHtml(item.numberLabel || "GTM")}</span>
                    <h3>${escapeHtml(item.name || getDriverName(driver))}</h3>
                    <p>${escapeHtml(item.subtitle || getTeamName(driver))}</p>
                </div>

                <div class="stats-focus-result">
                    <div>
                        <span>${escapeHtml(item.metricLabel || "Punkte")}</span>
                        <strong>${escapeHtml(item.metric)}</strong>
                    </div>
                    <small>${escapeHtml(item.detail || "Profil öffnen")}</small>
                </div>
            </a>
        `;
    }

    function renderFocus(items, emptyMessage) {
        if (items.length === 0) {
            elements.podium.innerHTML = createInlineEmpty(
                "Noch keine Wertungsdaten vorhanden",
                emptyMessage
            );
            elements.podium.setAttribute("aria-busy", "false");
            return;
        }

        elements.podium.innerHTML = items.slice(0, 3).map(createFocusCard).join("");
        elements.podium.setAttribute("aria-busy", "false");
    }

    function createCompactRow(item, index) {
        const tag = item.href ? "a" : "article";
        const href = item.href ? ` href="${escapeHtml(item.href)}"` : "";
        const percentage = Math.max(0, Math.min(100, toNumber(item.percentage)));

        return `
            <${tag} class="stats-compact-row"${href}>
                <span class="stats-compact-rank">${index + 1}</span>
                <div class="stats-compact-main">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${escapeHtml(item.note || "")}</span>
                    ${item.percentage === undefined ? "" : `
                        <div class="stats-progress" aria-hidden="true">
                            <span style="width:${percentage}%"></span>
                        </div>
                    `}
                </div>
                <div class="stats-compact-value">
                    <strong>${escapeHtml(item.value)}</strong>
                    <span>${escapeHtml(item.valueLabel)}</span>
                </div>
            </${tag}>
        `;
    }

    function renderCompactList(container, items, title, message) {
        container.innerHTML = items.length > 0
            ? items.slice(0, 5).map(createCompactRow).join("")
            : createInlineEmpty(title, message);
    }

    function createInlineEmpty(title, message) {
        return `
            <div class="stats-inline-empty">
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
    }

    function createRankingRow(item, index) {
        const driver = item.driver || item;
        const number = getDriverNumber(driver);
        const href = getDriverUrl(driver);

        return `
            <a class="stats-ranking-row" href="${escapeHtml(href)}">
                <span class="stats-ranking-position">${escapeHtml(item.position || index + 1)}</span>
                <span class="stats-ranking-avatar">
                    <img
                        src="${escapeHtml(getDriverImage(driver))}"
                        alt="${escapeHtml(getDriverName(driver))}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${FALLBACK_DRIVER}';"
                    >
                </span>
                <span class="stats-ranking-main">
                    <span>Fahrer · ${number > 0 ? `#${number}` : "ohne Nummer"}</span>
                    <strong>${escapeHtml(getDriverName(driver))}</strong>
                </span>
                <span class="stats-ranking-meta team-column">
                    <span>Team</span>
                    <strong>${escapeHtml(getTeamName(driver))}</strong>
                </span>
                <span class="stats-ranking-meta vehicle-column">
                    <span>Fahrzeug</span>
                    <strong>${escapeHtml(getVehicleName(driver))}</strong>
                </span>
                ${item.values.map((value, valueIndex) => `
                    <span class="stats-ranking-value ${valueIndex === 2 ? "tertiary-value" : ""}">
                        <span>${escapeHtml(value.label)}</span>
                        <strong>${escapeHtml(value.value)}</strong>
                    </span>
                `).join("")}
                <span class="stats-ranking-arrow">→</span>
            </a>
        `;
    }

    function renderRanking(items) {
        const query = normalizeText(state.query);
        let visible = items.filter((item) => !query || getSearchText(item.driver || item).includes(query));

        visible = sortRanking(visible);

        elements.resultCount.textContent = `${visible.length} ${visible.length === 1 ? "Eintrag" : "Einträge"}`;
        elements.empty.hidden = visible.length > 0;
        elements.ranking.hidden = visible.length === 0;
        elements.ranking.innerHTML = visible.map(createRankingRow).join("");
        elements.ranking.setAttribute("aria-busy", "false");
    }

    function sortRanking(items) {
        const result = [...items];

        result.sort((first, second) => {
            const firstDriver = first.driver || first;
            const secondDriver = second.driver || second;

            switch (state.sort) {
                case "punkte":
                    return getPoints(secondDriver) - getPoints(firstDriver);
                case "fastlaps":
                    return toNumber(secondDriver?.fastLap) - toNumber(firstDriver?.fastLap);
                case "siege":
                    return toNumber(secondDriver?.siege) - toNumber(firstDriver?.siege);
                case "teilnahmen":
                    return toNumber(secondDriver?.teilnahmen) - toNumber(firstDriver?.teilnahmen);
                case "startnummer":
                    return getDriverNumber(firstDriver) - getDriverNumber(secondDriver);
                case "name":
                    return getDriverName(firstDriver).localeCompare(getDriverName(secondDriver), "de", { sensitivity: "base" });
                case "aktivitaet":
                    return getSeries(secondDriver).length - getSeries(firstDriver).length ||
                        getParticipations(secondDriver).length - getParticipations(firstDriver).length ||
                        getDriverName(firstDriver).localeCompare(getDriverName(secondDriver), "de");
                case "platzierung":
                default:
                    return getPlacement(firstDriver) - getPlacement(secondDriver);
            }
        });

        return result;
    }

    function createOverallRanking() {
        return data.drivers
            .filter((driver) => getDriverName(driver) && (getSeries(driver).length > 0 || getParticipations(driver).length > 0))
            .map((driver, index) => ({
                driver,
                position: index + 1,
                values: [
                    { label: "Serien", value: formatNumber(getSeries(driver).length, 0) },
                    { label: "Teilnahmen", value: formatNumber(getParticipations(driver).length, 0) },
                    { label: "Masters-Punkte", value: formatNumber(driver?.punkte, 1) }
                ]
            }));
    }

    function createMastersRanking(drivers) {
        return drivers.map((driver) => ({
            driver,
            position: getPlacement(driver, "–"),
            values: [
                { label: "Punkte", value: formatNumber(getPoints(driver), 1) },
                { label: "Fast Laps", value: formatNumber(driver?.fastLap, 0) },
                { label: "Fahrzeugwechsel", value: formatNumber(driver?.fahrzeugwechsel, 1) }
            ]
        }));
    }

    function createTaRanking(drivers) {
        return drivers.map((driver) => ({
            driver,
            position: getPlacement(driver, "–"),
            values: [
                { label: "Punkte", value: formatNumber(getPoints(driver), 1) },
                { label: "Siege", value: formatNumber(driver?.siege, 0) },
                { label: "Podien", value: formatNumber(driver?.podiums, 0) }
            ]
        }));
    }

    function buildTeamPresence(drivers) {
        const teams = new Map();

        drivers.forEach((driver) => {
            const name = getTeamName(driver);
            if (!name || name === "Kein Team") {
                return;
            }

            const key = normalizeText(name);
            if (!teams.has(key)) {
                teams.set(key, { name, drivers: 0, points: 0 });
            }

            const entry = teams.get(key);
            entry.drivers += 1;
            entry.points += getPoints(driver);
        });

        return [...teams.values()].sort((a, b) => b.drivers - a.drivers || b.points - a.points);
    }

    function buildVehicleDistribution(drivers) {
        const vehicles = new Map();

        drivers.forEach((driver) => {
            const name = getVehicleName(driver);
            if (!name || name === "Kein Fahrzeug eingetragen") {
                return;
            }

            const key = normalizeText(name);
            if (!vehicles.has(key)) {
                vehicles.set(key, { name, count: 0 });
            }

            vehicles.get(key).count += 1;
        });

        return [...vehicles.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
    }

    function buildClassDistribution() {
        const classes = new Map();

        data.vehicles.forEach((vehicle) => {
            const name = String(vehicle?.klasse || "Ohne Klasse").trim();
            classes.set(name, (classes.get(name) || 0) + 1);
        });

        return [...classes.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
    }

    function renderOverall() {
        const completed = data.calendar.filter(isCompleted).length;
        const masters = data.mastersSeasons[0];
        const ta = data.taSeasons.find((season) => season.fahrerwertung.length > 0) || data.taSeasons[0];
        const mastersDrivers = asArray(masters?.fahrerwertung);
        const taDrivers = asArray(ta?.fahrerwertung);
        const activeDrivers = data.drivers.filter((driver) => getSeries(driver).length > 0);
        const mostVersatile = [...activeDrivers].sort((a, b) => {
            return getSeries(b).length - getSeries(a).length ||
                getParticipations(b).length - getParticipations(a).length ||
                getDriverName(a).localeCompare(getDriverName(b), "de");
        })[0];

        setKpis([
            { label: "Registrierte Fahrer", value: formatNumber(data.drivers.length, 0), note: "Alle im Fahrerexport vorhandenen Profile" },
            { label: "Teamprofile", value: formatNumber(data.teams.length, 0), note: "Organisationen und einzelne Einsatzteams" },
            { label: "Fahrzeugmodelle", value: formatNumber(data.vehicles.length, 0), note: "Verfügbare Fahrzeuge im GTM-Katalog" },
            { label: "Kalendertermine", value: formatNumber(data.calendar.length, 0), note: `${completed} davon abgeschlossen` }
        ]);

        elements.scopeLabel.textContent = "GTM Gesamtüberblick";
        elements.scopeTitle.textContent = "Das GTM-Universum in Zahlen";
        elements.scopeNote.textContent = "Serienübergreifende Kennzahlen ohne Vermischung der unterschiedlichen Punktesysteme.";
        elements.podiumLabel.textContent = "Serienübergreifender Fokus";
        elements.podiumTitle.textContent = "GTM im Blick";

        const focus = [];
        if (mastersDrivers[0]) {
            focus.push({
                category: "Masters-Spitze",
                rank: 1,
                rankLabel: "P1",
                driver: mastersDrivers[0],
                metric: formatNumber(getPoints(mastersDrivers[0]), 1),
                metricLabel: "Masters-Punkte",
                detail: masters?.saisonName || masters?.saison || "GTM Masters"
            });
        }
        if (taDrivers[0]) {
            focus.push({
                category: "Time-Attack-Spitze",
                rank: focus.length + 1,
                rankLabel: "P1 TA",
                driver: taDrivers[0],
                metric: formatNumber(getPoints(taDrivers[0]), 1),
                metricLabel: "TA-Punkte",
                detail: ta?.saisonName || "GTM Time Attack"
            });
        }
        if (mostVersatile) {
            focus.push({
                category: "GTM Aktivität",
                rank: focus.length + 1,
                rankLabel: "Multi",
                driver: mostVersatile,
                metric: formatNumber(getSeries(mostVersatile).length, 0),
                metricLabel: "Serienbereiche",
                detail: `${getParticipations(mostVersatile).length} hinterlegte Teilnahmen`
            });
        }
        renderFocus(focus, "Sobald Wertungen exportiert sind, erscheinen die Spitzenreiter automatisch.");

        elements.teamLabel.textContent = "Community";
        elements.teamTitle.textContent = "Teampräsenz";
        const maxTeamSeries = Math.max(1, ...data.teams.map((team) => getSeries(team).length));
        const teamItems = [...data.teams]
            .sort((a, b) => getSeries(b).length - getSeries(a).length || toNumber(b?.anzahlFahrer) - toNumber(a?.anzahlFahrer))
            .map((team) => ({
                name: team?.name || "Unbekanntes Team",
                note: `${toNumber(team?.anzahlFahrer)} Fahrer · ${asArray(team?.fahrzeuge).length} Fahrzeuge`,
                value: formatNumber(getSeries(team).length, 0),
                valueLabel: "Bereiche",
                percentage: getSeries(team).length / maxTeamSeries * 100,
                href: getTeamUrl(team?.name)
            }));
        renderCompactList(elements.teamList, teamItems, "Noch keine Teamdaten", "Teamprofile erscheinen nach dem nächsten Datenexport.");

        elements.vehicleLabel.textContent = "Fahrzeugkatalog";
        elements.vehicleTitle.textContent = "Klassenverteilung";
        const classes = buildClassDistribution();
        const maxClass = Math.max(1, ...classes.map((entry) => entry.count));
        renderCompactList(elements.vehicleList, classes.map((entry) => ({
            name: entry.name,
            note: "Modelle im GTM-Fahrzeugkatalog",
            value: formatNumber(entry.count, 0),
            valueLabel: "Fahrzeuge",
            percentage: entry.count / maxClass * 100,
            href: "pages/fahrzeuge.html"
        })), "Noch keine Fahrzeugdaten", "Fahrzeugklassen erscheinen nach dem nächsten Datenexport.");

        elements.rankingLabel.textContent = "GTM Community";
        elements.rankingTitle.textContent = "Fahrer und Teilnahmen";
        elements.sourceText.textContent = "Gesamtwerte zeigen alle im Export vorhandenen Profile, Teams, Fahrzeuge und Termine. Masters- und Time-Attack-Punkte werden bewusst nicht addiert, da beide Serien eigene Wertungssysteme besitzen.";
        renderRanking(createOverallRanking());
    }

    function renderMasters() {
        const season = selectedMasters();
        const drivers = asArray(season?.fahrerwertung);
        const races = getCalendarForSeries("masters", season);
        const completed = races.filter(isCompleted).length;
        const officialTeams = data.teams
            .filter((team) => team?.aktiveMeisterschaft === true)
            .sort((a, b) => {
                return toNumber(a?.platzierung, 9999) - toNumber(b?.platzierung, 9999) ||
                    toNumber(b?.punkte) - toNumber(a?.punkte);
            });
        const progress = races.length > 0 ? Math.round(completed / races.length * 100) : 0;

        setKpis([
            { label: "Masters-Fahrer", value: formatNumber(drivers.length, 0), note: season?.saisonName || "Ausgewählte Masters-Saison" },
            { label: "Einsatzteams", value: formatNumber(officialTeams.length, 0), note: "Einzelteams der offiziellen Teamwertung" },
            { label: "Rennen", value: formatNumber(races.length, 0), note: `${completed} Läufe abgeschlossen` },
            { label: "Saisonfortschritt", value: `${progress} %`, note: `${completed} von ${races.length} Läufen` }
        ]);

        elements.scopeLabel.textContent = season?.saisonName || "GTM Masters";
        elements.scopeTitle.textContent = "Masters-Leistung im Detail";
        elements.scopeNote.textContent = "Fahrer- und Teamwerte stammen aus der ausgewählten Masters-Saison.";
        elements.podiumLabel.textContent = "Fahrerwertung";
        elements.podiumTitle.textContent = "Masters-Podium";

        renderFocus(drivers.slice(0, 3).map((driver, index) => ({
            category: "GTM Masters",
            rank: getPlacement(driver, index + 1),
            driver,
            metric: formatNumber(getPoints(driver), 1),
            metricLabel: "Punkte",
            detail: `${formatNumber(driver?.fastLap, 0)} Fast Laps`
        })), "Für diese Masters-Saison liegt noch keine Fahrerwertung vor.");

        elements.teamLabel.textContent = "Offizielle Wertung";
        elements.teamTitle.textContent = "Einsatzteams";
        const topTeamPoints = Math.max(1, ...officialTeams.map((team) => toNumber(team?.punkte)));
        renderCompactList(elements.teamList, officialTeams.map((team) => ({
            name: team?.name || "Unbekanntes Team",
            note: `${toNumber(team?.anzahlFahrer)} Fahrer · Platz ${toNumber(team?.platzierung) || "–"}`,
            value: formatNumber(team?.punkte, 1),
            valueLabel: "Punkte",
            percentage: toNumber(team?.punkte) / topTeamPoints * 100,
            href: getTeamUrl(team?.name)
        })), "Noch keine Teamwertung", "Sobald Masters-Teamdaten vorliegen, erscheint hier die offizielle Wertung der einzelnen Einsatzteams.");

        elements.vehicleLabel.textContent = "Masters-Feld";
        elements.vehicleTitle.textContent = "Fahrzeuge im Einsatz";
        const vehicles = buildVehicleDistribution(drivers);
        const maxVehicle = Math.max(1, ...vehicles.map((entry) => entry.count));
        renderCompactList(elements.vehicleList, vehicles.map((entry) => ({
            name: entry.name,
            note: "Aktuell zugeordnete Masters-Fahrer",
            value: formatNumber(entry.count, 0),
            valueLabel: "Fahrer",
            percentage: entry.count / maxVehicle * 100,
            href: getVehicleUrl(entry.name)
        })), "Noch keine Fahrzeugzuordnung", "Fahrzeuge erscheinen, sobald sie den Masters-Fahrern zugeordnet sind.");

        elements.rankingLabel.textContent = "Gesamtwertung";
        elements.rankingTitle.textContent = "Masters-Fahrerwertung";
        elements.sourceText.textContent = "Die Masters-Ansicht verwendet ausschließlich die ausgewählte Saison. In der Teamwertung werden die einzelnen Einsatzteams gewertet – zum Beispiel Rennsteig Racing I und Rennsteig Racing II – nicht nur die übergeordnete Organisation.";
        renderRanking(createMastersRanking(drivers));
    }

    function renderTimeAttack() {
        const season = selectedTimeAttack();
        const drivers = asArray(season?.fahrerwertung);
        const roundsTotal = toNumber(season?.rundenGesamt);
        const roundsCompleted = toNumber(season?.rundenAbgeschlossen);
        const leader = drivers[0] || null;

        setKpis([
            { label: "TA-Fahrer", value: formatNumber(drivers.length, 0), note: season?.saisonName || "Ausgewählte TA-Saison" },
            { label: "Rundenstand", value: `${formatNumber(roundsCompleted, 0)} / ${formatNumber(roundsTotal, 0)}`, note: "Abgeschlossene und geplante Runden" },
            { label: "Spitzenwert", value: leader ? formatNumber(getPoints(leader), 1) : "–", note: leader ? `${getDriverName(leader)} führt` : "Noch keine Fahrerwertung" },
            { label: "Siege an der Spitze", value: leader ? formatNumber(leader?.siege, 0) : "–", note: leader ? `${formatNumber(leader?.podiums, 0)} Podiumsplatzierungen` : "Noch keine Ergebnisse" }
        ]);

        elements.scopeLabel.textContent = season?.saisonName || "GTM Time Attack";
        elements.scopeTitle.textContent = "Time Attack in Zahlen";
        elements.scopeNote.textContent = "Runden, Siege und Podien der ausgewählten Time-Attack-Saison.";
        elements.podiumLabel.textContent = "Fahrerwertung";
        elements.podiumTitle.textContent = "Time-Attack-Podium";

        renderFocus(drivers.slice(0, 3).map((driver, index) => ({
            category: "GTM Time Attack",
            rank: getPlacement(driver, index + 1),
            driver,
            metric: formatNumber(getPoints(driver), 1),
            metricLabel: "Punkte",
            detail: `${formatNumber(driver?.siege, 0)} Siege · ${formatNumber(driver?.podiums, 0)} Podien`
        })), "Diese TA-Saison ist vorbereitet. Die Wertung erscheint automatisch, sobald Ergebnisse exportiert wurden.");

        elements.teamLabel.textContent = "Teilnehmerfeld";
        elements.teamTitle.textContent = "Teams nach Fahrerzahl";
        const teamPresence = buildTeamPresence(drivers);
        const maxTeamDrivers = Math.max(1, ...teamPresence.map((team) => team.drivers));
        renderCompactList(elements.teamList, teamPresence.map((team) => ({
            name: team.name,
            note: "Präsenz im ausgewählten TA-Fahrerfeld",
            value: formatNumber(team.drivers, 0),
            valueLabel: "Fahrer",
            percentage: team.drivers / maxTeamDrivers * 100,
            href: getTeamUrl(team.name)
        })), "Noch keine Teamzuordnungen", "Diese Liste ist eine Teilnehmerübersicht und keine offizielle TA-Teamwertung.");

        elements.vehicleLabel.textContent = "Time Attack";
        elements.vehicleTitle.textContent = "Fahrzeuge im Einsatz";
        const vehicles = buildVehicleDistribution(drivers);
        const maxVehicle = Math.max(1, ...vehicles.map((entry) => entry.count));
        renderCompactList(elements.vehicleList, vehicles.map((entry) => ({
            name: entry.name,
            note: "Im ausgewählten TA-Export eingetragen",
            value: formatNumber(entry.count, 0),
            valueLabel: "Fahrer",
            percentage: entry.count / maxVehicle * 100,
            href: getVehicleUrl(entry.name)
        })), "TA-Fahrzeugdaten noch nicht hinterlegt", "Die Ansicht ist vorbereitet und füllt sich automatisch, sobald der TA-Export Fahrzeugzuordnungen liefert.");

        elements.rankingLabel.textContent = "Gesamtwertung";
        elements.rankingTitle.textContent = "Time-Attack-Fahrerwertung";
        elements.sourceText.textContent = "Die TA-Ansicht verwendet nur die ausgewählte Time-Attack-Saison. Die Teamliste zeigt die Anzahl zugeordneter Fahrer und ist ausdrücklich keine offizielle Teamwertung. Fehlende Fahrzeugdaten werden als vorbereiteter Platzhalter kenntlich gemacht.";
        renderRanking(createTaRanking(drivers));
    }

    function configureSeasonSelect() {
        let seasons = [];

        if (state.view === "masters") {
            seasons = data.mastersSeasons;
        } else if (state.view === "ta") {
            seasons = data.taSeasons;
        }

        if (state.view === "gesamt") {
            elements.seasonSelect.innerHTML = '<option value="all">Alle verfügbaren Daten</option>';
            elements.seasonSelect.disabled = true;
            elements.seasonField.classList.add("is-disabled");
            state.season = "all";
            return;
        }

        elements.seasonSelect.disabled = false;
        elements.seasonField.classList.remove("is-disabled");
        elements.seasonSelect.innerHTML = seasons.map((season) => `
            <option value="${escapeHtml(season.id)}">${escapeHtml(season.saisonName)}</option>
        `).join("");

        if (!seasons.some((season) => season.id === state.season)) {
            state.season = seasons[0]?.id || "all";
        }

        elements.seasonSelect.value = state.season;
    }

    function configureSortSelect() {
        const options = {
            gesamt: [
                ["aktivitaet", "GTM-Aktivität"],
                ["name", "Name"],
                ["startnummer", "Startnummer"]
            ],
            masters: [
                ["platzierung", "Platzierung"],
                ["punkte", "Punkte"],
                ["fastlaps", "Fast Laps"],
                ["startnummer", "Startnummer"],
                ["name", "Name"]
            ],
            ta: [
                ["platzierung", "Platzierung"],
                ["punkte", "Punkte"],
                ["siege", "Siege"],
                ["teilnahmen", "Teilnahmen"],
                ["name", "Name"]
            ]
        }[state.view];

        elements.sort.innerHTML = options.map(([value, label]) => `
            <option value="${value}">${label}</option>
        `).join("");

        if (!options.some(([value]) => value === state.sort)) {
            state.sort = options[0][0];
        }

        elements.sort.value = state.sort;
    }

    function updateTabs() {
        elements.viewTabs.querySelectorAll("[data-view]").forEach((button) => {
            const active = button.dataset.view === state.view;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-selected", String(active));
        });
    }

    function render() {
        configureSeasonSelect();
        configureSortSelect();
        updateTabs();

        if (state.view === "masters") {
            renderMasters();
        } else if (state.view === "ta") {
            renderTimeAttack();
        } else {
            renderOverall();
        }
    }

    function bindEvents() {
        elements.viewTabs.addEventListener("click", (event) => {
            const button = event.target.closest("[data-view]");
            if (!button || button.dataset.view === state.view) {
                return;
            }

            state.view = button.dataset.view;
            state.season = "all";
            state.query = "";
            elements.search.value = "";
            render();
        });

        elements.seasonSelect.addEventListener("change", () => {
            state.season = elements.seasonSelect.value;
            render();
        });

        elements.search.addEventListener("input", () => {
            state.query = elements.search.value;

            if (state.view === "masters") {
                renderRanking(createMastersRanking(asArray(selectedMasters()?.fahrerwertung)));
            } else if (state.view === "ta") {
                renderRanking(createTaRanking(asArray(selectedTimeAttack()?.fahrerwertung)));
            } else {
                renderRanking(createOverallRanking());
            }
        });

        elements.sort.addEventListener("change", () => {
            state.sort = elements.sort.value;

            if (state.view === "masters") {
                renderRanking(createMastersRanking(asArray(selectedMasters()?.fahrerwertung)));
            } else if (state.view === "ta") {
                renderRanking(createTaRanking(asArray(selectedTimeAttack()?.fahrerwertung)));
            } else {
                renderRanking(createOverallRanking());
            }
        });
    }

    function showFatalError(message) {
        const html = `
            <div class="stats-error">
                <strong>Statistiken konnten nicht geladen werden.</strong>
                <span>${escapeHtml(message)}</span>
            </div>
        `;

        if (elements.podium) elements.podium.innerHTML = html;
        if (elements.teamList) elements.teamList.innerHTML = html;
        if (elements.vehicleList) elements.vehicleList.innerHTML = html;
        if (elements.ranking) elements.ranking.innerHTML = html;
        if (elements.dataState) elements.dataState.textContent = "Datenfehler";
    }

    async function loadData() {
        try {
            const [drivers, teams, vehicles, calendar, masters, timeAttack] = await Promise.all([
                window.GTM.load("fahrer", { forceReload: true }),
                window.GTM.load("teams", { forceReload: true }),
                window.GTM.load("fahrzeuge", { forceReload: true }),
                window.GTM.load("kalender", { forceReload: true }),
                window.GTM.load("meisterschaft", { forceReload: true }),
                window.GTM.load("ta", { forceReload: true })
            ]);

            data.drivers = asArray(drivers);
            data.teams = asArray(teams);
            data.vehicles = asArray(vehicles);
            data.calendar = asArray(calendar);
            data.mastersSeasons = normalizeMasters(masters);
            data.taSeasons = normalizeTimeAttack(timeAttack);

            elements.dataState.textContent = `${data.drivers.length} Fahrer · ${data.teams.length} Teams · ${data.calendar.length} Termine geladen`;

            bindEvents();
            render();
        } catch (error) {
            console.error("GTM-Statistiken konnten nicht geladen werden:", error);
            showFatalError(error?.message || "Unbekannter Datenfehler");
        }
    }

    await loadData();
});
