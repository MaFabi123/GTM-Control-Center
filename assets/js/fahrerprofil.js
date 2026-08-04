/* ==========================================================
   GTM FAHRERPROFIL
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const root = document.getElementById("fahrerprofil-inhalt");

    const seriesLabels = {
        masters: "GTM Masters",
        ta: "GTM Time Attack",
        fun: "GTM FUN Events"
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

    function getTeam(fahrer) {
        return String(fahrer?.team || fahrer?.teamZuordnung || "Kein Team").trim();
    }

    function getEntryTeam(fahrer) {
        return String(fahrer?.teamZuordnung || fahrer?.team || "Kein Einsatzteam").trim();
    }

    function getParticipationDate(participation) {
        const match = String(participation?.event || "")
            .match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
        if (!match) return "";

        const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
        return `${String(year).padStart(4, "0")}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
    }

    function getCalendarEntries(participation, calendar) {
        const seriesId = normalizeText(participation?.serieId);
        const season = toNumber(participation?.saison, 0);
        const eventDate = getParticipationDate(participation);

        return calendar.filter((entry) => {
            if (normalizeText(entry?.serieId) !== seriesId) return false;
            if (seriesId === "fun" && eventDate) return String(entry?.datum || "") === eventDate;
            return season <= 0 || toNumber(entry?.saison, 0) === season;
        });
    }

    function isHistoricalParticipation(participation, calendar) {
        const entries = getCalendarEntries(participation, calendar);
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
        const knownSeasons = calendar
            .filter((entry) => normalizeText(entry?.serieId) === seriesId)
            .map((entry) => toNumber(entry?.saison, 0))
            .filter((value) => value > 0);
        return season > 0 && knownSeasons.length > 0 && season < Math.max(...knownSeasons);
    }

    function getCurrentParticipations(fahrer, calendar) {
        return (Array.isArray(fahrer?.teilnahmen) ? fahrer.teilnahmen : [])
            .filter((entry) => entry && !isHistoricalParticipation(entry, calendar));
    }

    function getEventSeries(fahrer, teams, calendar) {
        const number = toNumber(fahrer?.nummer, 0);
        const teamNames = new Set([
            normalizeText(fahrer?.team),
            normalizeText(fahrer?.teamZuordnung)
        ].filter(Boolean));
        const result = new Set();

        const hasDirectParticipationData = Array.isArray(fahrer?.teilnahmen);

        getCurrentParticipations(fahrer, calendar)
            .map((entry) => normalizeText(entry?.serieId))
            .filter(Boolean)
            .forEach((series) => result.add(series));

        if (hasDirectParticipationData) {
            return ["masters", "ta", "fun"].filter((series) => result.has(series));
        }

        // Rueckfall fuer bereits erzeugte, aeltere fahrer.json-Dateien.
        teams.forEach((team) => {
            if (!teamNames.has(normalizeText(team?.name))) return;

            const assigned = !Array.isArray(team?.fahrer) ||
                team.fahrer.length === 0 ||
                team.fahrer.some((entry) => toNumber(entry?.nummer, 0) === number);
            if (!assigned) return;

            const teamParticipations = Array.isArray(team?.teilnahmen)
                ? team.teilnahmen
                : [];

            teamParticipations
                .filter((entry) => !isHistoricalParticipation(entry, calendar))
                .map((entry) => normalizeText(entry?.serieId))
                .filter(Boolean)
                .forEach((series) => result.add(series));

            if (teamParticipations.length === 0) {
                (Array.isArray(team?.serien) ? team.serien : [])
                    .map(normalizeText)
                    .filter(Boolean)
                    .forEach((series) => result.add(series));
            }
        });

        return ["masters", "ta", "fun"].filter((series) => result.has(series));
    }

    function getParticipationLabel(entry) {
        const seriesId = normalizeText(entry?.serieId);
        const season = toNumber(entry?.saison, 0);
        if (seriesId === "masters") return `Masters S${season || "?"}`;
        if (seriesId === "ta") return `TA ${season || ""}`.trim();
        return entry?.event || "GTM FUN Event";
    }

    function createEventBadges(fahrer, teams, calendar) {
        const current = getCurrentParticipations(fahrer, calendar);

        if (current.length > 0) {
            return current.map((entry) => `
                <span class="fahrerprofil-event-badge ${escapeHtml(normalizeText(entry?.serieId))}">
                    ${escapeHtml(getParticipationLabel(entry))}
                </span>
            `).join("");
        }

        const series = getEventSeries(fahrer, teams, calendar);
        if (series.length === 0) {
            return '<span class="fahrerprofil-event-badge keine">Derzeit keine Teilnahme</span>';
        }

        return series.map((entry) => `
            <span class="fahrerprofil-event-badge ${escapeHtml(entry)}">
                ${escapeHtml(seriesLabels[entry] || entry)}
            </span>
        `).join("");
    }

    function createParticipationHistory(fahrer, calendar) {
        const all = Array.isArray(fahrer?.teilnahmen) ? fahrer.teilnahmen : [];
        const current = all.filter((entry) => !isHistoricalParticipation(entry, calendar));
        const history = all.filter((entry) => isHistoricalParticipation(entry, calendar));

        const cards = (entries, state) => entries.map((entry) => `
            <article class="fahrerprofil-teilnahme ${escapeHtml(normalizeText(entry?.serieId))} ${state}">
                <span>${state === "aktuell" ? "Aktuell / kommend" : "Historie"}</span>
                <h3>${escapeHtml(entry?.saisonName || entry?.event || getParticipationLabel(entry))}</h3>
                ${entry?.event && entry?.event !== entry?.saisonName ? `<p>${escapeHtml(entry.event)}</p>` : ""}
            </article>
        `).join("");

        if (all.length === 0) {
            return '<div class="fahrerprofil-teilnahmen-leer">Noch keine Teilnahme erfasst.</div>';
        }

        return `
            <div class="fahrerprofil-teilnahmen-gruppe">
                <h3>Aktuell und kommend</h3>
                <div class="fahrerprofil-teilnahmen">
                    ${current.length > 0 ? cards(current, "aktuell") : '<p class="fahrerprofil-teilnahmen-leer">Derzeit keine Teilnahme.</p>'}
                </div>
            </div>
            ${history.length > 0 ? `
                <div class="fahrerprofil-historie-slider" data-history-slider>
                    <div class="fahrerprofil-historie-kopf">
                        <h3>Historie</h3>
                        <div class="fahrerprofil-historie-steuerung">
                            <button type="button" data-history-prev aria-label="In der Historie zurück">←</button>
                            <button type="button" data-history-next aria-label="In der Historie weiter">→</button>
                        </div>
                    </div>
                    <div class="fahrerprofil-historie-track" data-history-track tabindex="0">
                        ${cards(history, "historie")}
                    </div>
                </div>
            ` : `
                <div class="fahrerprofil-teilnahmen-gruppe historie">
                    <h3>Historie</h3>
                    <p class="fahrerprofil-teilnahmen-leer">Noch keine abgeschlossene Saison.</p>
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

    function getDriverImageCandidates(fahrer) {
        const number = toNumber(fahrer?.nummer, 0);
        const configuredImage = String(fahrer?.bild || "").trim();
        const candidates = [];

        if (number > 0) {
            candidates.push(`assets/images/fahrer/${number}.png`);
        }

        if (configuredImage && configuredImage !== "default.png") {
            candidates.push(`assets/images/fahrer/${configuredImage}`);
        }

        candidates.push("assets/images/fahrer/default.png");

        return [...new Set(candidates)];
    }

    function createImageAttributes(candidates, fallbackAttribute) {
        const paths = [...candidates];
        const first = paths.shift() || "";

        return `
            src="${escapeHtml(first)}"
            data-${fallbackAttribute}="${escapeHtml(paths.join("|"))}"
        `;
    }

    function installImageFallback(image, attributeName) {
        image?.addEventListener("error", () => {
            const paths = String(image.dataset[attributeName] || "")
                .split("|")
                .filter(Boolean);
            const next = paths.shift();

            if (!next) {
                image.onerror = null;
                return;
            }

            image.dataset[attributeName] = paths.join("|");
            image.src = next;
        });
    }

    function findVehicle(vehicles, vehicleName) {
        const target = normalizeText(vehicleName);

        return vehicles.find((vehicle) => (
            normalizeText(vehicle?.anzeigename) === target ||
            normalizeText(vehicle?.fahrzeug) === target
        )) || null;
    }

    function createTeamLink(fahrer) {
        const team = getTeam(fahrer);

        if (!team || team === "Kein Team") {
            return "";
        }

        return `
            <a
                class="fahrerprofil-team-link"
                href="pages/team.html?team=${encodeURIComponent(createSlug(team))}"
            >
                Teamprofil öffnen →
            </a>
        `;
    }

    function createVehicleSection(fahrer, vehicle) {
        if (!vehicle) {
            return `
                <section class="fahrerprofil-bereich">
                    <div class="container">
                        <article class="fahrerprofil-info">
                            <span>Fahrzeug</span>
                            <h2>${escapeHtml(fahrer.fahrzeug || "Kein Fahrzeug eingetragen")}</h2>
                        </article>
                    </div>
                </section>
            `;
        }

        const image = String(vehicle.bild || "").trim();
        const vehicleImage = image
            ? `assets/images/fahrzeuge/${image}`
            : "assets/images/fahrzeuge/default.png";
        const cutoutImage = image
            ? `assets/images/fahrzeuge/freigestellt/${image}`
            : "";

        return `
            <section class="fahrerprofil-bereich">
                <div class="container">
                    <header class="fahrerprofil-bereich-kopf">
                        <p>Aktuelles Rennfahrzeug</p>
                        <h2>Fahrzeugdetails</h2>
                    </header>

                    <article class="fahrerprofil-fahrzeugkarte">
                        <div class="fahrerprofil-fahrzeugbild">
                            <img
                                id="fahrerprofil-fahrzeugbild"
                                src="${escapeHtml(vehicleImage)}"
                                data-vehicle-fallback="assets/images/fahrzeuge/default.png"
                                alt="${escapeHtml(vehicle.anzeigename || vehicle.fahrzeug)}"
                            >
                        </div>

                        <div class="fahrerprofil-fahrzeugdaten">
                            <span>${escapeHtml(vehicle.hersteller || "Hersteller unbekannt")}</span>
                            <h3>${escapeHtml(vehicle.anzeigename || vehicle.fahrzeug)}</h3>

                            <div class="fahrerprofil-fahrzeugmeta">
                                <div>
                                    <small>Klasse</small>
                                    <strong>${escapeHtml(vehicle.klasse || "–")}</strong>
                                </div>

                                <div>
                                    <small>Baujahr</small>
                                    <strong>${escapeHtml(vehicle.baujahr || "–")}</strong>
                                </div>

                                <div>
                                    <small>Inhalt / DLC</small>
                                    <strong>${escapeHtml(vehicle.inhalt || "Grundspiel")}</strong>
                                </div>
                            </div>

                            <div class="fahrerprofil-freisteller-slot">
                                ${cutoutImage ? `
                                    <img
                                        id="fahrerprofil-freisteller-bild"
                                        src="${escapeHtml(cutoutImage)}"
                                        alt="Freigestelltes ${escapeHtml(vehicle.anzeigename || vehicle.fahrzeug)}"
                                        hidden
                                    >
                                ` : ""}

                                <span id="fahrerprofil-freisteller-platzhalter">
                                    Platzhalter für den späteren Fahrzeugfreisteller der Meisterschaftskarte
                                </span>
                            </div>
                        </div>
                    </article>
                </div>
            </section>
        `;
    }

    function activateOptionalCutout() {
        const image = document.getElementById("fahrerprofil-freisteller-bild");
        const placeholder = document.getElementById("fahrerprofil-freisteller-platzhalter");
        if (!image || !placeholder) return;

        const showImage = () => {
            image.hidden = false;
            placeholder.hidden = true;
        };
        const showPlaceholder = () => {
            image.hidden = true;
            placeholder.hidden = false;
        };

        image.addEventListener("load", showImage);
        image.addEventListener("error", showPlaceholder);

        if (image.complete) {
            if (image.naturalWidth > 0) showImage();
            else showPlaceholder();
        }
    }

    function renderDriver(fahrer, vehicle, championship, teams, calendar) {
        if (!root) {
            return;
        }

        const number = toNumber(fahrer.nummer, 0);
        const name = String(fahrer.name || "Unbekannter Fahrer").trim();
        const team = getTeam(fahrer);
        const entryTeam = getEntryTeam(fahrer);
        const currentParticipations = getCurrentParticipations(fahrer, calendar);
        const active = currentParticipations.length > 0;
        const placement = toNumber(fahrer.platzierung, 0);
        const seasonName = currentParticipations.length > 0
            ? currentParticipations
                .map((entry) => entry.saisonName || entry.event || getParticipationLabel(entry))
                .join(" · ")
            : "Keine aktuelle Teilnahme";
        const seasonStatus = active ? "aktiv / kommend" : "nicht aktiv";
        const driverImages = getDriverImageCandidates(fahrer);

        document.title = `GTM Control Center | ${name}`;

        root.innerHTML = `
            <section class="fahrerprofil-hero">
                <div class="container">
                    <a class="fahrerprofil-zurueck" href="pages/fahrer.html">
                        ← Zurück zu allen Fahrern
                    </a>

                    <article class="fahrerprofil-hero-karte">
                        <div class="fahrerprofil-bild" data-nummer="#${escapeHtml(number || "–")}">
                            <img
                                id="fahrerprofil-fahrerbild"
                                ${createImageAttributes(driverImages, "driver-fallback")}
                                alt="${escapeHtml(name)}"
                            >
                        </div>

                        <div class="fahrerprofil-hero-inhalt">
                            <p class="fahrerprofil-eyebrow">GTM Fahrerprofil</p>
                            <h1>${escapeHtml(name)}</h1>
                            <span class="fahrerprofil-nummer">Startnummer #${escapeHtml(number || "–")}</span>
                            <div class="fahrerprofil-events">
                                ${createEventBadges(fahrer, teams, calendar)}
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section class="fahrerprofil-bereich">
                <div class="container">
                    <div class="fahrerprofil-statistik">
                        <article>
                            <strong>${placement > 0 ? `P${placement}` : "–"}</strong>
                            <span>Platzierung</span>
                        </article>

                        <article>
                            <strong>${escapeHtml(toNumber(fahrer.punkte, 0))}</strong>
                            <span>Punkte</span>
                        </article>

                        <article>
                            <strong>${escapeHtml(toNumber(fahrer.wertung, 0))}</strong>
                            <span>Wertung</span>
                        </article>

                        <article>
                            <strong>${escapeHtml(toNumber(fahrer.fastLap, 0))}</strong>
                            <span>Schnellste Runden</span>
                        </article>

                        <article>
                            <strong>${escapeHtml(toNumber(fahrer.fahrzeugwechsel, 0))}</strong>
                            <span>Fahrzeugwechsel</span>
                        </article>
                    </div>
                </div>
            </section>

            <section class="fahrerprofil-bereich">
                <div class="container">
                    <header class="fahrerprofil-bereich-kopf">
                        <p>Aktueller Einsatz</p>
                        <h2>Team und Meisterschaft</h2>
                    </header>

                    <div class="fahrerprofil-info-grid">
                        <article class="fahrerprofil-info">
                            <span>Teamorganisation</span>
                            <h2>${escapeHtml(team)}</h2>
                            ${entryTeam !== team ? `<p>Einsatzteam: ${escapeHtml(entryTeam)}</p>` : ""}
                            ${createTeamLink(fahrer)}
                        </article>

                        <article class="fahrerprofil-info">
                            <span>Meisterschaft</span>
                            <h2>${escapeHtml(seasonName)}</h2>
                            <p>Status: ${escapeHtml(seasonStatus || (active ? "aktiv" : "nicht aktiv"))}</p>
                        </article>
                    </div>
                </div>
            </section>

            <section class="fahrerprofil-bereich">
                <div class="container">
                    <header class="fahrerprofil-bereich-kopf">
                        <p>Rennbereiche</p>
                        <h2>Teilnahmen und Historie</h2>
                    </header>

                    ${createParticipationHistory(fahrer, calendar)}
                </div>
            </section>

            ${createVehicleSection(fahrer, vehicle)}
        `;

        initializeHistorySliders();

        installImageFallback(
            document.getElementById("fahrerprofil-fahrerbild"),
            "driverFallback"
        );
        installImageFallback(
            document.getElementById("fahrerprofil-fahrzeugbild"),
            "vehicleFallback"
        );
        activateOptionalCutout();

        root.setAttribute("aria-busy", "false");
    }

    function showError(message) {
        if (!root) {
            return;
        }

        root.innerHTML = `
            <div class="container fahrerprofil-fehler">
                <p>${escapeHtml(message)}</p>
                <a class="fahrerprofil-zurueck" href="pages/fahrer.html">
                    ← Zurück zu allen Fahrern
                </a>
            </div>
        `;
        root.setAttribute("aria-busy", "false");
    }

    try {
        if (!window.GTM || typeof window.GTM.loadFahrer !== "function") {
            throw new Error("Die GTM Data Engine wurde nicht geladen.");
        }

        const requestedNumber = toNumber(
            new URLSearchParams(window.location.search).get("nummer"),
            0
        );

        if (requestedNumber < 1) {
            throw new Error("Es wurde kein Fahrer ausgewählt.");
        }

        const [drivers, vehiclesResult, championshipResult, teamsResult, calendarResult] = await Promise.all([
            window.GTM.loadFahrer({ forceReload: true }),
            window.GTM.load("fahrzeuge", { forceReload: true }).catch(() => []),
            window.GTM.load("meisterschaft", { forceReload: true }).catch(() => null),
            window.GTM.load("teams", { forceReload: true }).catch(() => []),
            window.GTM.load("kalender", { forceReload: true }).catch(() => [])
        ]);

        if (!Array.isArray(drivers)) {
            throw new Error("fahrer.json enthält keine gültige Fahrerliste.");
        }

        const driver = drivers.find((entry) => toNumber(entry?.nummer, 0) === requestedNumber);

        if (!driver) {
            throw new Error("Der ausgewählte Fahrer wurde nicht gefunden.");
        }

        const vehicles = Array.isArray(vehiclesResult) ? vehiclesResult : [];
        const vehicle = findVehicle(vehicles, driver.fahrzeug);

        renderDriver(
            driver,
            vehicle,
            championshipResult,
            Array.isArray(teamsResult) ? teamsResult : [],
            Array.isArray(calendarResult) ? calendarResult : []
        );
    } catch (error) {
        showError(error?.message || "Das Fahrerprofil konnte nicht geladen werden.");
    }
});
