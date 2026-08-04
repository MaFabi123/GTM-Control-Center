/* ==========================================================
   GTM TEAM-BIBLIOTHEK
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid = document.getElementById("teams-grid");
    const searchInput = document.getElementById("team-suche");
    const seriesFilter = document.getElementById("serie-filter");
    const vehicleFilter = document.getElementById("fahrzeug-filter");
    const participationFilter = document.getElementById("teilnahme-filter");
    const sortSelect = document.getElementById("team-sortierung");
    const noResults = document.getElementById("keine-teams");

    const slider = document.getElementById("teams-slider");
    const sliderDots = document.getElementById("teams-slider-punkte");
    const sliderPrevious = document.getElementById("teams-slider-zurueck");
    const sliderNext = document.getElementById("teams-slider-weiter");

    let alleTeams = [];
    let alleKalender = [];
    let sliderTeams = [];
    let sliderIndex = 0;
    let sliderTimer = null;

    const seriesLabels = {
        masters: "GTM Masters",
        ta: "GTM Time Attack",
        fun: "GTM FUN Events"
    };

    const seriesOrder = {
        masters: 1,
        ta: 2,
        fun: 3
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
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function toNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function getParticipationDate(participation) {
        const match = String(participation?.event || "")
            .match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
        if (!match) return "";
        const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
        return `${String(year).padStart(4, "0")}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
    }

    function getCalendarEntries(participation) {
        const seriesId = normalizeText(participation?.serieId);
        const season = toNumber(participation?.saison, 0);
        const eventDate = getParticipationDate(participation);

        return alleKalender.filter((entry) => {
            if (normalizeText(entry?.serieId) !== seriesId) return false;
            if (seriesId === "fun" && eventDate) return String(entry?.datum || "") === eventDate;
            return season <= 0 || toNumber(entry?.saison, 0) === season;
        });
    }

    function isHistoricalParticipation(participation) {
        const entries = getCalendarEntries(participation);
        if (entries.length > 0) {
            return entries.every((entry) => normalizeText(entry?.status) === "abgeschlossen");
        }

        const eventDate = getParticipationDate(participation);
        if (eventDate) {
            const today = new Date();
            const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            return eventDate < todayIso;
        }

        const seriesId = normalizeText(participation?.serieId);
        const season = toNumber(participation?.saison, 0);
        const knownSeasons = alleKalender
            .filter((entry) => normalizeText(entry?.serieId) === seriesId)
            .map((entry) => toNumber(entry?.saison, 0))
            .filter((value) => value > 0);
        return season > 0 && knownSeasons.length > 0 && season < Math.max(...knownSeasons);
    }

    function addParticipationStatus(team) {
        const aktuelleTeilnahmen = team.teilnahmen.filter((entry) => !isHistoricalParticipation(entry));
        const historischeTeilnahmen = team.teilnahmen.filter(isHistoricalParticipation);
        const aktuelleSerien = [...new Set(aktuelleTeilnahmen.map((entry) => entry.serieId))]
            .sort((a, b) => (seriesOrder[a] || 99) - (seriesOrder[b] || 99));

        return {
            ...team,
            aktuelleTeilnahmen,
            historischeTeilnahmen,
            aktuelleSerien
        };
    }

    function createSlug(value) {
        return normalizeText(value)
            .replace(/ß/g, "ss")
            .replace(/&/g, "und")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function getTeamLogoCandidates(team) {
        const names = [
            team?.name,
            ...(Array.isArray(team?.einsatzteams) ? team.einsatzteams : [])
        ];

        return [
            ...new Set([
                ...names
                    .map(createSlug)
                    .filter(Boolean)
                    .map((slug) => `assets/images/teams/${slug}.png`),
                "assets/images/teams/default.png"
            ])
        ];
    }

    function createTeamLogoAttributes(team) {
        const candidates = getTeamLogoCandidates(team);
        const first = candidates.shift() || "assets/images/teams/default.png";

        return `
            src="${escapeHtml(first)}"
            data-logo-fallback="${escapeHtml(candidates.join("|"))}"
            onerror="window.GTMTeamLogoFallback(this)"
        `;
    }

    window.GTMTeamLogoFallback = (image) => {
        const candidates = String(image?.dataset?.logoFallback || "")
            .split("|")
            .filter(Boolean);
        const next = candidates.shift();

        if (!next) {
            image.onerror = null;
            return;
        }

        image.dataset.logoFallback = candidates.join("|");
        image.src = next;
    };

    function getTeamUrl(team) {
        return `pages/team.html?team=${encodeURIComponent(team.id)}`;
    }

    function normalizeParticipation(participation) {
        const serieId = normalizeText(participation?.serieId);

        return {
            id: String(participation?.id || "").trim(),
            serieId,
            serie: String(participation?.serie || seriesLabels[serieId] || "GTM").trim(),
            saison: toNumber(participation?.saison, 0),
            saisonName: String(participation?.saisonName || "").trim(),
            event: String(participation?.event || participation?.saisonName || "").trim()
        };
    }

    function normalizeTeam(team) {
        const participations = Array.isArray(team?.teilnahmen)
            ? team.teilnahmen
                .map(normalizeParticipation)
                .filter((entry) => entry.id && entry.serieId)
            : [];

        const series = [
            ...new Set([
                ...(Array.isArray(team?.serien) ? team.serien : []),
                ...participations.map((entry) => entry.serieId)
            ].map(normalizeText).filter(Boolean))
        ].sort((a, b) => (seriesOrder[a] || 99) - (seriesOrder[b] || 99));

        const drivers = Array.isArray(team?.fahrer)
            ? team.fahrer.map((driver) => ({
                nummer: toNumber(driver?.nummer, 0),
                name: String(driver?.name || "Unbekannter Fahrer").trim(),
                bild: String(driver?.bild || "default.png").trim(),
                fahrzeug: String(driver?.fahrzeug || "").trim(),
                aktiveSaison: driver?.aktiveSaison === true,
                punkte: toNumber(driver?.punkte, 0),
                platzierung: toNumber(driver?.platzierung, 0)
            }))
            : [];

        const vehicles = [
            ...new Set([
                ...(Array.isArray(team?.fahrzeuge) ? team.fahrzeuge : []),
                ...drivers.map((driver) => driver.fahrzeug)
            ].map((value) => String(value || "").trim()).filter(Boolean))
        ].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));

        const name = String(team?.name || "Unbekanntes Team").trim();

        return {
            id: createSlug(name),
            name,
            einsatzteams: [name],
            serien: series,
            teilnahmen: participations,
            fahrer: drivers,
            fahrzeuge: vehicles,
            punkte: toNumber(team?.punkte, 0),
            platzierung: toNumber(team?.platzierung, 0),
            aktiveMeisterschaft: team?.aktiveMeisterschaft === true
        };
    }

    function getTeamFamilyName(teamName, allTeamNames) {
        const name = String(teamName || "").trim();
        const match = name.match(/^(.*\S)\s+([IVXLCDM]+)$/i);

        if (!match) {
            return name;
        }

        const possibleBaseName = match[1].trim();
        const normalizedBaseName = normalizeText(possibleBaseName);
        const baseExists = allTeamNames.some((entry) => (
            normalizeText(entry) === normalizedBaseName
        ));

        return baseExists ? possibleBaseName : name;
    }

    function mergeUniqueBy(entries, createKey) {
        const result = new Map();

        entries.forEach((entry) => {
            const key = createKey(entry);

            if (key && !result.has(key)) {
                result.set(key, entry);
            }
        });

        return [...result.values()];
    }

    function combineTeamFamilies(teams) {
        const allTeamNames = teams.map((team) => team.name);
        const families = new Map();

        teams.forEach((team) => {
            const familyName = getTeamFamilyName(team.name, allTeamNames);
            const familyId = createSlug(familyName);

            if (!families.has(familyId)) {
                families.set(familyId, { id: familyId, name: familyName, members: [] });
            }

            families.get(familyId).members.push(team);
        });

        return [...families.values()].map((family) => {
            const members = family.members;
            const placements = members
                .map((team) => team.platzierung)
                .filter((placement) => placement > 0);
            const teamNames = [...new Set(members.map((team) => team.name))]
                .sort((a, b) => {
                    if (normalizeText(a) === normalizeText(family.name)) return -1;
                    if (normalizeText(b) === normalizeText(family.name)) return 1;
                    return a.localeCompare(b, "de", { sensitivity: "base" });
                });

            return {
                id: family.id,
                name: family.name,
                einsatzteams: teamNames,
                serien: [...new Set(members.flatMap((team) => team.serien))]
                    .sort((a, b) => (seriesOrder[a] || 99) - (seriesOrder[b] || 99)),
                teilnahmen: mergeUniqueBy(
                    members.flatMap((team) => team.teilnahmen),
                    (entry) => `${entry.serieId}|${entry.id}`
                ),
                fahrer: mergeUniqueBy(
                    members.flatMap((team) => team.fahrer),
                    (driver) => driver.nummer > 0
                        ? `nummer-${driver.nummer}`
                        : `name-${normalizeText(driver.name)}`
                ),
                fahrzeuge: [...new Set(members.flatMap((team) => team.fahrzeuge))]
                    .sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" })),
                punkte: members.reduce((sum, team) => sum + team.punkte, 0),
                platzierung: placements.length > 0 ? Math.min(...placements) : 0,
                aktiveMeisterschaft: members.some((team) => team.aktiveMeisterschaft)
            };
        });
    }

    function createSeriesBadges(team) {
        if (team.aktuelleTeilnahmen.length === 0) {
            return `
                <span class="team-serie-badge registriert">
                    ${team.historischeTeilnahmen.length > 0 ? "Derzeit ohne Teilnahme" : "Nur registriert"}
                </span>
            `;
        }

        return team.aktuelleTeilnahmen.map((entry) => {
            const label = entry.serieId === "masters"
                ? `Masters S${entry.saison || "?"}`
                : entry.serieId === "ta"
                    ? `TA ${entry.saison || ""}`.trim()
                    : entry.event || "GTM FUN Event";

            return `
            <span class="team-serie-badge ${escapeHtml(entry.serieId)}">
                ${escapeHtml(label)}
            </span>
        `;
        }).join("");
    }

    function getParticipationLabel(participation) {
        if (participation.serieId === "fun") {
            return participation.event || "GTM FUN Event";
        }

        return participation.saisonName || participation.event || participation.serie;
    }

    function createParticipationPreview(team, limit = 3) {
        if (team.aktuelleTeilnahmen.length === 0) {
            return `
                <li>${team.historischeTeilnahmen.length > 0 ? "Historie im Teamprofil vorhanden" : "Noch keiner Veranstaltung zugeordnet"}</li>
            `;
        }

        const entries = team.aktuelleTeilnahmen.slice(0, limit).map((participation) => `
            <li>${escapeHtml(getParticipationLabel(participation))}</li>
        `);

        const remaining = team.aktuelleTeilnahmen.length - limit;

        if (remaining > 0) {
            entries.push(`<li>+ ${remaining} weitere</li>`);
        }

        return entries.join("");
    }

    function createEntryTeamPreview(team) {
        if (!Array.isArray(team.einsatzteams) || team.einsatzteams.length <= 1) {
            return "";
        }

        return `
            <div class="team-card-einsatzteams">
                <span>Einsatzteams</span>
                <p>${team.einsatzteams.map(escapeHtml).join(" · ")}</p>
            </div>
        `;
    }

    function getTeamSearchText(team) {
        return normalizeText([
            team.name,
            ...team.einsatzteams,
            ...team.serien.map((serieId) => seriesLabels[serieId] || serieId),
            ...team.teilnahmen.map(getParticipationLabel),
            ...team.fahrer.map((driver) => driver.name),
            ...team.fahrzeuge
        ].join(" "));
    }

    function fillVehicleFilter() {
        if (!vehicleFilter) {
            return;
        }

        const vehicles = [
            ...new Set(alleTeams.flatMap((team) => team.fahrzeuge))
        ].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));

        vehicleFilter.innerHTML = [
            '<option value="">Alle Fahrzeuge</option>',
            ...vehicles.map((vehicle) => (
                `<option value="${escapeHtml(vehicle)}">${escapeHtml(vehicle)}</option>`
            ))
        ].join("");
    }

    function createTeamCard(team) {
        const url = escapeHtml(getTeamUrl(team));
        const name = escapeHtml(team.name);
        const points = team.aktiveMeisterschaft ? team.punkte : "–";

        return `
            <a
                class="team-card"
                href="${url}"
                aria-label="Teamprofil ${name} öffnen"
            >
                <div class="team-card-kopf">
                    <div class="team-card-logo">
                        <img
                            ${createTeamLogoAttributes(team)}
                            alt="Logo ${name}"
                            loading="lazy"
                        >
                    </div>

                    <div class="team-card-titel">
                        <span>GTM Team</span>
                        <h2>${name}</h2>
                    </div>
                </div>

                <div class="team-card-badges">
                    ${createSeriesBadges(team)}
                </div>

                ${createEntryTeamPreview(team)}

                <div class="team-card-events">
                    <span>Teilnahmen</span>
                    <ul>${createParticipationPreview(team)}</ul>
                </div>

                <div class="team-card-statistik">
                    <div>
                        <strong>${team.fahrer.length}</strong>
                        <span>Fahrer</span>
                    </div>

                    <div>
                        <strong>${team.fahrzeuge.length}</strong>
                        <span>Fahrzeuge</span>
                    </div>

                    <div>
                        <strong>${escapeHtml(points)}</strong>
                        <span>Masters-Punkte gesamt</span>
                    </div>
                </div>

                <span class="team-card-profil">
                    Teamprofil öffnen
                </span>
            </a>
        `;
    }

    function updateStatistics() {
        const activeTeams = alleTeams.filter((team) => team.aktuelleTeilnahmen.length > 0);
        const driverKeys = new Set();
        const events = new Set();

        alleTeams.forEach((team) => {
            team.fahrer.forEach((driver) => {
                driverKeys.add(driver.nummer > 0 ? `n-${driver.nummer}` : `x-${normalizeText(driver.name)}`);
            });

            team.aktuelleTeilnahmen.forEach((participation) => events.add(participation.id));
        });

        window.GTM.Utils?.setText("teams-anzahl", alleTeams.length);
        window.GTM.Utils?.setText("teams-aktiv", activeTeams.length);
        window.GTM.Utils?.setText("teams-fahrer", driverKeys.size);
        window.GTM.Utils?.setText("teams-events", events.size);
    }

    function sortTeams(entries) {
        const sortValue = sortSelect?.value || "name";

        return [...entries].sort((a, b) => {
            if (sortValue === "bereiche") {
                return b.aktuelleSerien.length - a.aktuelleSerien.length || compareNames(a, b);
            }

            if (sortValue === "teilnahmen") {
                return b.aktuelleTeilnahmen.length - a.aktuelleTeilnahmen.length || compareNames(a, b);
            }

            if (sortValue === "fahrer") {
                return b.fahrer.length - a.fahrer.length || compareNames(a, b);
            }

            if (sortValue === "punkte") {
                return b.punkte - a.punkte || compareNames(a, b);
            }

            return compareNames(a, b);
        });
    }

    function compareNames(a, b) {
        return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
    }

    function filterTeams() {
        const query = normalizeText(searchInput?.value);
        const selectedSeries = String(seriesFilter?.value || "");
        const selectedVehicle = String(vehicleFilter?.value || "");
        const selectedParticipation = String(participationFilter?.value || "");

        const filtered = alleTeams.filter((team) => {
            const hasParticipation = team.aktuelleTeilnahmen.length > 0;
            const matchesSearch = !query || getTeamSearchText(team).includes(query);
            const matchesSeries = !selectedSeries || team.aktuelleSerien.includes(selectedSeries);
            const matchesVehicle = !selectedVehicle || team.fahrzeuge.includes(selectedVehicle);
            const matchesParticipation =
                !selectedParticipation ||
                (selectedParticipation === "aktiv" && hasParticipation) ||
                (selectedParticipation === "registriert" && !hasParticipation);

            return matchesSearch && matchesSeries && matchesVehicle && matchesParticipation;
        });

        renderTeams(sortTeams(filtered));
    }

    function renderTeams(entries) {
        if (!grid) {
            return;
        }

        grid.innerHTML = entries.map(createTeamCard).join("");
        grid.setAttribute("aria-busy", "false");

        if (noResults) {
            noResults.hidden = entries.length > 0;
        }
    }

    function selectSliderTeams() {
        return [...alleTeams]
            .filter((team) => team.aktuelleTeilnahmen.length > 0)
            .sort((a, b) => {
                return (
                    b.aktuelleSerien.length - a.aktuelleSerien.length ||
                    b.aktuelleTeilnahmen.length - a.aktuelleTeilnahmen.length ||
                    b.punkte - a.punkte ||
                    compareNames(a, b)
                );
            })
            .slice(0, 8);
    }

    function createSlide(team, index) {
        const activeClass = index === 0 ? " ist-aktiv" : "";
        const ariaHidden = index === 0 ? "false" : "true";
        const name = escapeHtml(team.name);

        return `
            <article
                class="teams-slide${activeClass}"
                aria-hidden="${ariaHidden}"
                aria-roledescription="Folie"
                aria-label="${index + 1} von ${sliderTeams.length}: ${name}"
            >
                <div class="teams-slide-logo">
                    <img
                        ${createTeamLogoAttributes(team)}
                        alt="Logo ${name}"
                    >
                </div>

                <div class="teams-slide-inhalt">
                    <span class="teams-slide-label">GTM Team im Fokus</span>
                    <h3>${name}</h3>

                    <div class="teams-slide-badges">
                        ${createSeriesBadges(team)}
                    </div>

                    <div class="teams-slide-meta">
                        <span>${team.fahrer.length} Fahrer</span>
                        <span>${team.fahrzeuge.length} Fahrzeuge</span>
                        <span>${team.aktuelleTeilnahmen.length} aktuelle Teilnahmen</span>
                        <span>${team.einsatzteams.length} Einsatzteams</span>
                    </div>

                    <a
                        class="teams-slide-link"
                        href="${escapeHtml(getTeamUrl(team))}"
                    >
                        Teamprofil öffnen
                    </a>
                </div>
            </article>
        `;
    }

    function showSlide(index, restartTimer = true) {
        if (sliderTeams.length === 0) {
            return;
        }

        sliderIndex = (index + sliderTeams.length) % sliderTeams.length;

        slider?.querySelectorAll(".teams-slide").forEach((slide, slideIndex) => {
            const isActive = slideIndex === sliderIndex;
            slide.classList.toggle("ist-aktiv", isActive);
            slide.setAttribute("aria-hidden", String(!isActive));
        });

        sliderDots?.querySelectorAll("button").forEach((dot, dotIndex) => {
            const isActive = dotIndex === sliderIndex;
            dot.classList.toggle("ist-aktiv", isActive);
            dot.setAttribute("aria-current", isActive ? "true" : "false");
        });

        if (restartTimer) {
            startSliderTimer();
        }
    }

    function stopSliderTimer() {
        if (sliderTimer !== null) {
            window.clearInterval(sliderTimer);
            sliderTimer = null;
        }
    }

    function startSliderTimer() {
        stopSliderTimer();

        if (sliderTeams.length <= 1 || document.hidden) {
            return;
        }

        sliderTimer = window.setInterval(() => {
            showSlide(sliderIndex + 1, false);
        }, 7000);
    }

    function renderSlider() {
        if (!slider) {
            return;
        }

        sliderTeams = selectSliderTeams();
        sliderIndex = 0;

        if (sliderTeams.length === 0) {
            slider.innerHTML = '<div class="teams-slider-leer">Noch keine Teamteilnahmen vorhanden.</div>';

            if (sliderDots) {
                sliderDots.innerHTML = "";
            }

            if (sliderPrevious) {
                sliderPrevious.disabled = true;
            }

            if (sliderNext) {
                sliderNext.disabled = true;
            }

            return;
        }

        slider.innerHTML = sliderTeams.map(createSlide).join("");

        if (sliderDots) {
            sliderDots.innerHTML = sliderTeams.map((team, index) => `
                <button
                    type="button"
                    class="${index === 0 ? "ist-aktiv" : ""}"
                    data-slide-index="${index}"
                    aria-label="${escapeHtml(team.name)} anzeigen"
                    aria-current="${index === 0 ? "true" : "false"}"
                ></button>
            `).join("");
        }

        const multiple = sliderTeams.length > 1;

        if (sliderPrevious) {
            sliderPrevious.disabled = !multiple;
        }

        if (sliderNext) {
            sliderNext.disabled = !multiple;
        }

        startSliderTimer();
    }

    function showError(message) {
        console.error(message);

        if (grid) {
            grid.innerHTML = `
                <div class="gtm-data-error">
                    <strong>Die Teamdaten konnten nicht geladen werden.</strong>
                    <span>${escapeHtml(message)}</span>
                </div>
            `;
            grid.setAttribute("aria-busy", "false");
        }
    }

    async function loadTeams() {
        try {
            const [data, calendarData] = await Promise.all([
                window.GTM.load("teams", { forceReload: true }),
                window.GTM.load("kalender", { forceReload: true }).catch(() => [])
            ]);

            if (!Array.isArray(data)) {
                throw new Error("teams.json enthält keine gültige Teamliste.");
            }

            const normalizedTeams = data
                .filter((team) => team && String(team.name || "").trim())
                .map(normalizeTeam);

            alleKalender = Array.isArray(calendarData) ? calendarData : [];
            alleTeams = combineTeamFamilies(normalizedTeams).map(addParticipationStatus);

            fillVehicleFilter();
            updateStatistics();
            renderSlider();
            filterTeams();
        } catch (error) {
            showError(error?.message || "Unbekannter Fehler");
        }
    }

    searchInput?.addEventListener("input", filterTeams);
    seriesFilter?.addEventListener("change", filterTeams);
    vehicleFilter?.addEventListener("change", filterTeams);
    participationFilter?.addEventListener("change", filterTeams);
    sortSelect?.addEventListener("change", filterTeams);

    sliderPrevious?.addEventListener("click", () => showSlide(sliderIndex - 1));
    sliderNext?.addEventListener("click", () => showSlide(sliderIndex + 1));

    sliderDots?.addEventListener("click", (event) => {
        const dot = event.target.closest("[data-slide-index]");

        if (dot) {
            showSlide(toNumber(dot.dataset.slideIndex, 0));
        }
    });

    slider?.addEventListener("pointerenter", stopSliderTimer);
    slider?.addEventListener("pointerleave", startSliderTimer);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopSliderTimer();
        } else {
            startSliderTimer();
        }
    });

    await loadTeams();
});
