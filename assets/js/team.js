/* ==========================================================
   GTM TEAMPROFIL
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const root = document.getElementById("teamprofil-inhalt");
    let alleKalender = [];

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

    function createSlug(value) {
        return normalizeText(value)
            .replace(/ß/g, "ss")
            .replace(/&/g, "und")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
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
        return { ...team, aktuelleTeilnahmen, historischeTeilnahmen, aktuelleSerien };
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

    function getTeamLogoCandidates(team) {
        return [
            ...new Set([
                team.name,
                ...team.einsatzteams
            ]
                .map(createSlug)
                .filter(Boolean)
                .map((slug) => `assets/images/teams/${slug}.png`)
                .concat("assets/images/teams/default.png"))
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

    function getDriverImageCandidates(driver) {
        const number = toNumber(driver?.nummer, 0);
        const configured = String(driver?.bild || "").trim();
        const candidates = [];

        if (number > 0) candidates.push(`assets/images/fahrer/${number}.png`);
        if (configured && configured !== "default.png") {
            candidates.push(`assets/images/fahrer/${configured}`);
        }
        candidates.push("assets/images/fahrer/default.png");
        return [...new Set(candidates)];
    }

    function createDriverImageAttributes(driver) {
        const candidates = getDriverImageCandidates(driver);
        const first = candidates.shift() || "assets/images/fahrer/default.png";
        return `
            src="${escapeHtml(first)}"
            data-driver-fallback="${escapeHtml(candidates.join("|"))}"
            onerror="window.GTMTeamDriverImageFallback(this)"
        `;
    }

    window.GTMTeamDriverImageFallback = (image) => {
        const candidates = String(image?.dataset?.driverFallback || "")
            .split("|")
            .filter(Boolean);
        const next = candidates.shift();

        if (!next) {
            image.onerror = null;
            return;
        }

        image.dataset.driverFallback = candidates.join("|");
        image.src = next;
    };

    function createBadges(team) {
        if (team.aktuelleTeilnahmen.length === 0) {
            return `<span class="teamprofil-badge">${team.historischeTeilnahmen.length > 0 ? "Derzeit ohne Teilnahme" : "Nur registriert"}</span>`;
        }

        return team.aktuelleTeilnahmen.map((entry) => {
            const label = entry.serieId === "masters"
                ? `Masters S${entry.saison || "?"}`
                : entry.serieId === "ta"
                    ? `TA ${entry.saison || ""}`.trim()
                    : entry.event || "GTM FUN Event";
            return `
            <span class="teamprofil-badge ${escapeHtml(entry.serieId)}">
                ${escapeHtml(label)}
            </span>
        `;
        }).join("");
    }

    function getParticipationTitle(entry) {
        if (entry.serieId === "fun") {
            return entry.event || "GTM FUN Event";
        }

        return entry.saisonName || entry.event || entry.serie || "GTM Teilnahme";
    }

    function createParticipations(team) {
        if (team.teilnahmen.length === 0) {
            return '<div class="teamprofil-leer">Noch keiner Veranstaltung zugeordnet.</div>';
        }

        const renderEntries = (entries, state) => entries.map((entry) => `
            <article class="teamprofil-teilnahme ${escapeHtml(entry.serieId)} ${state}">
                <span>${state === "aktuell" ? "Aktuell / kommend" : "Historie"}</span>
                <h3>${escapeHtml(getParticipationTitle(entry))}</h3>
            </article>
        `).join("");

        return `
            <div class="teamprofil-teilnahmen-gruppe">
                <h3>Aktuell und kommend</h3>
                <div class="teamprofil-teilnahmen">
                    ${team.aktuelleTeilnahmen.length > 0
                        ? renderEntries(team.aktuelleTeilnahmen, "aktuell")
                        : '<p class="teamprofil-leer">Derzeit keine Teilnahme.</p>'}
                </div>
            </div>
            ${team.historischeTeilnahmen.length > 0 ? `
                <div class="teamprofil-historie-slider" data-history-slider>
                    <div class="teamprofil-historie-kopf">
                        <h3>Historie</h3>
                        <div class="teamprofil-historie-steuerung">
                            <button type="button" data-history-prev aria-label="In der Historie zurück">←</button>
                            <button type="button" data-history-next aria-label="In der Historie weiter">→</button>
                        </div>
                    </div>
                    <div class="teamprofil-historie-track" data-history-track tabindex="0">
                        ${renderEntries(team.historischeTeilnahmen, "historie")}
                    </div>
                </div>
            ` : `
                <div class="teamprofil-teilnahmen-gruppe historie">
                    <h3>Historie</h3>
                    <p class="teamprofil-leer">Noch keine abgeschlossene Saison.</p>
                </div>
            `}
        `;
    }

    function initializeHistorySliders() {
        root?.querySelectorAll("[data-history-slider]").forEach((slider) => {
            const track = slider.querySelector("[data-history-track]");
            const previous = slider.querySelector("[data-history-prev]");
            const next = slider.querySelector("[data-history-next]");
            if (!track || !previous || !next) return;

            const updateControls = () => {
                previous.disabled = track.scrollLeft <= 2;
                next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
                slider.classList.toggle("ist-statisch", track.scrollWidth <= track.clientWidth + 2);
            };
            const move = (direction) => track.scrollBy({
                left: direction * Math.max(track.clientWidth * 0.82, 260),
                behavior: "smooth"
            });

            previous.addEventListener("click", () => move(-1));
            next.addEventListener("click", () => move(1));
            track.addEventListener("scroll", updateControls, { passive: true });
            track.addEventListener("keydown", (event) => {
                if (event.key === "ArrowLeft") move(-1);
                if (event.key === "ArrowRight") move(1);
            });
            window.addEventListener("resize", updateControls);
            requestAnimationFrame(updateControls);
        });
    }

    function createEntryTeams(team) {
        if (team.einsatzteams.length <= 1) {
            return "";
        }

        return `
            <section class="teamprofil-bereich">
                <div class="container">
                    <header class="teamprofil-bereich-kopf">
                        <p>Organisation</p>
                        <h2>Einsatzteams</h2>
                    </header>

                    <div class="teamprofil-einsatzteams">
                        ${team.einsatzteams.map((name) => `
                            <span>${escapeHtml(name)}</span>
                        `).join("")}
                    </div>
                </div>
            </section>
        `;
    }

    function createDrivers(team) {
        if (team.fahrer.length === 0) {
            return '<div class="teamprofil-leer">Noch keine Fahrer zugeordnet.</div>';
        }

        return `
            <div class="teamprofil-fahrer-grid">
                ${team.fahrer.map((driver) => `
                    <a
                        class="teamprofil-fahrer"
                        href="pages/fahrerprofil.html?nummer=${encodeURIComponent(driver.nummer)}"
                        aria-label="Fahrerprofil ${escapeHtml(driver.name)} öffnen"
                    >
                        <div class="teamprofil-fahrer-bild">
                            <img
                                ${createDriverImageAttributes(driver)}
                                alt="Profilbild ${escapeHtml(driver.name)}"
                                loading="lazy"
                            >
                        </div>

                        <div>
                            <span class="teamprofil-fahrer-startnummer">#${escapeHtml(driver.nummer || "–")}</span>
                            <strong>${escapeHtml(driver.name)}</strong>
                            <span>${escapeHtml(driver.fahrzeug || "Kein Fahrzeug eingetragen")}</span>
                        </div>
                    </a>
                `).join("")}
            </div>
        `;
    }

    function createVehicles(team) {
        if (team.fahrzeuge.length === 0) {
            return '<div class="teamprofil-leer">Noch keine Fahrzeuge eingetragen.</div>';
        }

        return `
            <div class="teamprofil-fahrzeuge">
                ${team.fahrzeuge.map((vehicle) => `<span>${escapeHtml(vehicle)}</span>`).join("")}
            </div>
        `;
    }

    function renderTeam(team) {
        if (!root) {
            return;
        }

        const name = escapeHtml(team.name);
        const ranking = team.aktiveMeisterschaft && team.platzierung > 0
            ? `P${team.platzierung}`
            : "–";
        const fourthValue = team.einsatzteams.length > 1
            ? team.einsatzteams.length
            : ranking;
        const fourthLabel = team.einsatzteams.length > 1
            ? "Einsatzteams"
            : "Bester Masters-Rang";

        document.title = `GTM Control Center | ${team.name}`;

        root.innerHTML = `
            <section class="teamprofil-hero">
                <div class="container">
                    <a class="teamprofil-zurueck" href="pages/teams.html">
                        ← Zurück zu allen Teams
                    </a>

                    <article class="teamprofil-hero-karte">
                        <div class="teamprofil-logo">
                            <img
                                ${createTeamLogoAttributes(team)}
                                alt="Logo ${name}"
                            >
                        </div>

                        <div class="teamprofil-hero-inhalt">
                            <p class="teamprofil-eyebrow">GTM Teamprofil</p>
                            <h1>${name}</h1>

                            <div class="teamprofil-badges">
                                ${createBadges(team)}
                            </div>

                            <div class="teamprofil-kurzinfo">
                                <span>${team.fahrer.length} Fahrer</span>
                                <span>${team.fahrzeuge.length} Fahrzeuge</span>
                                <span>${team.aktuelleTeilnahmen.length} aktuell</span>
                                <span>${team.historischeTeilnahmen.length} Historie</span>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section class="teamprofil-bereich">
                <div class="container">
                    <div class="teamprofil-statistik">
                        <article>
                            <strong>${team.fahrer.length}</strong>
                            <span>Fahrer</span>
                        </article>

                        <article>
                            <strong>${team.fahrzeuge.length}</strong>
                            <span>Fahrzeuge</span>
                        </article>

                        <article>
                            <strong>${team.aktiveMeisterschaft ? team.punkte : "–"}</strong>
                            <span>Masters-Punkte gesamt</span>
                        </article>

                        <article>
                            <strong>${escapeHtml(fourthValue)}</strong>
                            <span>${fourthLabel}</span>
                        </article>
                    </div>
                </div>
            </section>

            ${createEntryTeams(team)}

            <section class="teamprofil-bereich">
                <div class="container">
                    <header class="teamprofil-bereich-kopf">
                        <p>Rennbereiche</p>
                        <h2>Teilnahmen und Events</h2>
                    </header>

                    ${createParticipations(team)}
                </div>
            </section>

            <section class="teamprofil-bereich">
                <div class="container">
                    <header class="teamprofil-bereich-kopf">
                        <p>Besetzung</p>
                        <h2>Fahrer</h2>
                    </header>

                    ${createDrivers(team)}
                </div>
            </section>

            <section class="teamprofil-bereich">
                <div class="container">
                    <header class="teamprofil-bereich-kopf">
                        <p>Fuhrpark</p>
                        <h2>Fahrzeuge</h2>
                    </header>

                    ${createVehicles(team)}
                </div>
            </section>
        `;

        initializeHistorySliders();

        root.setAttribute("aria-busy", "false");
    }

    function showError(message) {
        if (!root) {
            return;
        }

        root.innerHTML = `
            <div class="container teamprofil-fehler">
                <p>${escapeHtml(message)}</p>
                <a class="teamprofil-zurueck" href="pages/teams.html">
                    ← Zurück zu allen Teams
                </a>
            </div>
        `;
        root.setAttribute("aria-busy", "false");
    }

    try {
        if (!window.GTM || typeof window.GTM.load !== "function") {
            throw new Error("Die GTM Data Engine wurde nicht geladen.");
        }

        const requestedId = createSlug(new URLSearchParams(window.location.search).get("team"));

        if (!requestedId) {
            throw new Error("Es wurde kein Team ausgewählt.");
        }

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
        const teams = combineTeamFamilies(normalizedTeams).map(addParticipationStatus);
        const team = teams.find((entry) => entry.id === requestedId);

        if (!team) {
            throw new Error("Das ausgewählte Team wurde nicht gefunden.");
        }

        renderTeam(team);
    } catch (error) {
        showError(error?.message || "Das Teamprofil konnte nicht geladen werden.");
    }
});
