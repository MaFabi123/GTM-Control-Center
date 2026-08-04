/* ==========================================================
   GTM FAHRERSEITE
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid =
        document.getElementById("fahrer-grid");

    const searchInput =
        document.getElementById("fahrer-suche");

    const teamFilter =
        document.getElementById("team-filter");

    const vehicleFilter =
        document.getElementById("fahrzeug-filter");

    const sortSelect =
        document.getElementById("fahrer-sortierung");

    const noResults =
        document.getElementById("keine-fahrer");

    let alleFahrer = [];
    let alleTeams = [];
    let alleKalender = [];

    const serienNamen = {
        masters: "GTM Masters",
        ta: "GTM Time Attack",
        fun: "GTM FUN Events"
    };

    const serienReihenfolge = ["masters", "ta", "fun"];

    if (
        !window.GTM ||
        typeof window.GTM.loadFahrer !== "function"
    ) {
        showError(
            "Die GTM Data Engine wurde nicht geladen."
        );

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

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function getTeam(fahrer) {
        return String(
            fahrer?.teamZuordnung ||
            fahrer?.team ||
            "Kein Team"
        ).trim();
    }

    function getVehicle(fahrer) {
        return String(
            fahrer?.fahrzeug ||
            "Kein Fahrzeug eingetragen"
        ).trim();
    }

    function getParticipationDate(participation) {
        const match = String(participation?.event || "")
            .match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);

        if (!match) return "";

        const year = Number(match[3]) < 100
            ? 2000 + Number(match[3])
            : Number(match[3]);

        return [
            String(year).padStart(4, "0"),
            String(Number(match[2])).padStart(2, "0"),
            String(Number(match[1])).padStart(2, "0")
        ].join("-");
    }

    function getCalendarEntries(participation) {
        const seriesId = normalizeText(participation?.serieId);
        const season = toNumber(participation?.saison, 0);
        const eventDate = getParticipationDate(participation);

        return alleKalender.filter((entry) => {
            if (normalizeText(entry?.serieId) !== seriesId) return false;
            if (seriesId === "fun" && eventDate) {
                return String(entry?.datum || "") === eventDate;
            }
            return season <= 0 || toNumber(entry?.saison, 0) === season;
        });
    }

    function isHistoricalParticipation(participation) {
        const entries = getCalendarEntries(participation);

        if (entries.length > 0) {
            return entries.every((entry) => (
                normalizeText(entry?.status) === "abgeschlossen"
            ));
        }

        const eventDate = getParticipationDate(participation);
        if (eventDate) {
            const today = new Date();
            const todayIso = [
                today.getFullYear(),
                String(today.getMonth() + 1).padStart(2, "0"),
                String(today.getDate()).padStart(2, "0")
            ].join("-");
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

    function getCurrentParticipations(fahrer) {
        return (Array.isArray(fahrer?.teilnahmen) ? fahrer.teilnahmen : [])
            .filter((entry) => entry && !isHistoricalParticipation(entry));
    }

    function getEventSeries(fahrer) {
        const nummer = toNumber(fahrer?.nummer, 0);
        const teamNames = new Set([
            normalizeText(fahrer?.team),
            normalizeText(fahrer?.teamZuordnung)
        ].filter(Boolean));
        const series = new Set();

        const hasDirectParticipationData =
            Array.isArray(fahrer?.teilnahmen);

        getCurrentParticipations(fahrer)
            .map((entry) => normalizeText(entry?.serieId))
            .filter(Boolean)
            .forEach((serie) => series.add(serie));

        if (hasDirectParticipationData) {
            return serienReihenfolge.filter((serie) => series.has(serie));
        }

        // Abwaertskompatibilitaet fuer alte fahrer.json-Dateien:
        // Nur wenn direkte Fahrer-Teilnahmen fehlen, wird ueber Teams ermittelt.
        alleTeams.forEach((team) => {
            if (!teamNames.has(normalizeText(team?.name))) {
                return;
            }

            const driverIsAssigned = !Array.isArray(team?.fahrer) ||
                team.fahrer.length === 0 ||
                team.fahrer.some((entry) => toNumber(entry?.nummer, 0) === nummer);

            if (!driverIsAssigned) {
                return;
            }

            (Array.isArray(team?.serien) ? team.serien : [])
                .map(normalizeText)
                .filter(Boolean)
                .forEach((serie) => series.add(serie));

            (Array.isArray(team?.teilnahmen) ? team.teilnahmen : [])
                .filter((entry) => !isHistoricalParticipation(entry))
                .map((entry) => normalizeText(entry?.serieId))
                .filter(Boolean)
                .forEach((serie) => series.add(serie));
        });

        return serienReihenfolge.filter((serie) => series.has(serie));
    }

    function createEventBadges(fahrer) {
        const participations = getCurrentParticipations(fahrer);
        const hasHistory = (Array.isArray(fahrer?.teilnahmen) ? fahrer.teilnahmen : [])
            .some(isHistoricalParticipation);

        if (participations.length > 0) {
            return participations.map((entry) => {
                const seriesId = normalizeText(entry?.serieId);
                const season = toNumber(entry?.saison, 0);
                const label = seriesId === "masters"
                    ? `Masters S${season || "?"}`
                    : seriesId === "ta"
                        ? `TA ${season || ""}`.trim()
                        : entry?.event || "GTM FUN Event";

                return `
                    <span
                        class="fahrer-event-badge ${escapeHtml(seriesId)}"
                        title="${escapeHtml(entry?.saisonName || entry?.event || label)}"
                    >
                        ${escapeHtml(label)}
                    </span>
                `;
            }).join("");
        }

        const series = getEventSeries(fahrer);

        if (series.length === 0) {
            return `
                <span class="fahrer-event-badge keine">
                    ${hasHistory ? "Derzeit keine Teilnahme" : "Keine erfasste Teilnahme"}
                </span>
            `;
        }

        return series.map((serie) => `
            <span class="fahrer-event-badge ${escapeHtml(serie)}">
                ${escapeHtml(serienNamen[serie] || serie)}
            </span>
        `).join("");
    }

    function getDriverImage(fahrer) {
        const nummer =
            toNumber(fahrer?.nummer, 0);

        if (nummer < 1) {
            return "assets/images/fahrer/default.png";
        }

        return `assets/images/fahrer/${nummer}.png`;
    }

    function getSearchText(fahrer) {
        return normalizeText(
            [
                fahrer?.nummer,
                fahrer?.name,
                getTeam(fahrer),
                getVehicle(fahrer),
                ...getEventSeries(fahrer).map((serie) => serienNamen[serie] || serie),
                getEventSeries(fahrer).length > 0
                    ? "teilnahme aktiv"
                    : "keine teilnahme inaktiv"
            ].join(" ")
        );
    }

    function createDriverCard(fahrer) {
        const nummer =
            toNumber(fahrer.nummer, 0);

        const name =
            escapeHtml(
                fahrer.name ||
                "Unbekannter Fahrer"
            );

        const team =
            escapeHtml(
                getTeam(fahrer)
            );

        const fahrzeug =
            escapeHtml(
                getVehicle(fahrer)
            );

        const imagePath =
            escapeHtml(
                getDriverImage(fahrer)
            );

        const eventSeries = getEventSeries(fahrer);

        return `
            <article
                class="fahrer-card"
                data-team="${team}"
                data-fahrzeug="${fahrzeug}"
                data-status="${escapeHtml(eventSeries.join(" ") || "inaktiv")}"
            >
                <div class="fahrer-card-bild">

                    <img
                        src="${imagePath}"
                        alt="${name}"
                        loading="lazy"
                        onerror="
                            this.onerror = null;
                            this.src = 'assets/images/fahrer/default.png';
                        "
                    >

                </div>

                <div class="fahrer-card-inhalt">

                    <div class="fahrer-card-kopf">

                        <span class="fahrer-card-nummer">
                            #${nummer || "–"}
                        </span>

                        <div class="fahrer-card-events">
                            ${createEventBadges(fahrer)}
                        </div>

                    </div>

                    <h2>
                        ${name}
                    </h2>

                    <p class="fahrer-card-team">
                        ${team}
                    </p>

                    <p class="fahrer-card-fahrzeug">
                        ${fahrzeug}
                    </p>

                    <div class="fahrer-card-info">

                        <div>
                            <span>
                                Startnummer
                            </span>

                            <strong>
                                #${nummer || "–"}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Team
                            </span>

                            <strong>
                                ${team}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Fahrzeug
                            </span>

                            <strong>
                                ${fahrzeug}
                            </strong>
                        </div>

                    </div>

                    <a
                        class="fahrer-profil-button"
                        href="pages/fahrerprofil.html?nummer=${encodeURIComponent(nummer)}"
                    >
                        Fahrerprofil
                    </a>

                </div>

            </article>
        `;
    }

    function fillSelect(
        select,
        values,
        defaultLabel
    ) {
        if (!select) {
            return;
        }

        const currentValue =
            select.value;

        const uniqueValues = [
            ...new Set(
                values
                    .map(
                        (value) =>
                            String(value ?? "").trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "de",
                    {
                        sensitivity: "base"
                    }
                )
        );

        select.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
            defaultLabel;

        select.appendChild(
            defaultOption
        );

        uniqueValues.forEach((value) => {
            const option =
                document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(option);
        });

        if (
            uniqueValues.includes(
                currentValue
            )
        ) {
            select.value =
                currentValue;
        }
    }

    function updateStatistics() {
        const teams = [
            ...new Set(
                alleFahrer
                    .map(getTeam)
                    .filter(
                        (team) =>
                            team &&
                            team !== "Kein Team"
                    )
            )
        ];

        const vehicles = [
            ...new Set(
                alleFahrer
                    .map(getVehicle)
                    .filter(
                        (vehicle) =>
                            vehicle &&
                            vehicle !==
                                "Kein Fahrzeug eingetragen"
                    )
            )
        ];

        window.GTM.Utils?.setText(
            "fahrer-anzahl",
            alleFahrer.length
        );

        window.GTM.Utils?.setText(
            "fahrer-team-anzahl",
            teams.length
        );

        window.GTM.Utils?.setText(
            "fahrer-fahrzeug-anzahl",
            vehicles.length
        );
    }

    function sortDrivers(entries) {
        const sortValue =
            sortSelect?.value ||
            "startnummer";

        return [...entries].sort(
            (a, b) => {
                if (
                    sortValue ===
                    "name"
                ) {
                    return String(
                        a.name || ""
                    ).localeCompare(
                        String(
                            b.name || ""
                        ),
                        "de",
                        {
                            sensitivity: "base"
                        }
                    );
                }

                if (
                    sortValue ===
                    "team"
                ) {
                    return getTeam(a).localeCompare(
                        getTeam(b),
                        "de",
                        {
                            sensitivity: "base"
                        }
                    );
                }

                if (
                    sortValue ===
                    "status"
                ) {
                    const statusDifference =
                        getEventSeries(b).length -
                        getEventSeries(a).length;

                    if (statusDifference !== 0) {
                        return statusDifference;
                    }
                }

                return (
                    toNumber(
                        a.nummer,
                        0
                    ) -
                    toNumber(
                        b.nummer,
                        0
                    )
                );
            }
        );
    }

    function filterDrivers() {
        const query =
            normalizeText(
                searchInput?.value
            );

        const selectedTeam =
            String(
                teamFilter?.value || ""
            ).trim();

        const selectedVehicle =
            String(
                vehicleFilter?.value || ""
            ).trim();

        const filteredDrivers =
            alleFahrer.filter(
                (fahrer) => {
                    const matchesSearch =
                        query === "" ||
                        getSearchText(
                            fahrer
                        ).includes(query);

                    const matchesTeam =
                        selectedTeam === "" ||
                        getTeam(fahrer) ===
                            selectedTeam;

                    const matchesVehicle =
                        selectedVehicle === "" ||
                        getVehicle(fahrer) ===
                            selectedVehicle;

                    return (
                        matchesSearch &&
                        matchesTeam &&
                        matchesVehicle
                    );
                }
            );

        renderDrivers(
            sortDrivers(
                filteredDrivers
            )
        );
    }

    function renderDrivers(entries) {
        if (!grid) {
            return;
        }

        if (entries.length === 0) {
            grid.innerHTML = "";

            if (noResults) {
                noResults.hidden = false;
            }

            grid.setAttribute(
                "aria-busy",
                "false"
            );

            return;
        }

        grid.innerHTML =
            entries
                .map(createDriverCard)
                .join("");

        grid.setAttribute(
            "aria-busy",
            "false"
        );

        if (noResults) {
            noResults.hidden = true;
        }
    }

    function showError(message) {
        console.error(message);

        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="gtm-data-error">

                <strong>
                    Die Fahrerdaten konnten nicht geladen werden.
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>
        `;

        grid.setAttribute(
            "aria-busy",
            "false"
        );
    }

    async function loadDrivers() {
        try {
            const [data, teamData, calendarData] = await Promise.all([
                window.GTM.loadFahrer({
                    forceReload: true
                }),
                window.GTM.load("teams", {
                    forceReload: true
                }).catch(() => []),
                window.GTM.load("kalender", {
                    forceReload: true
                }).catch(() => [])
            ]);

            if (!Array.isArray(data)) {
                throw new Error(
                    "fahrer.json enthält keine gültige Fahrerliste."
                );
            }

            alleFahrer =
                data.filter(
                    (fahrer) =>
                        fahrer &&
                        fahrer.nummer &&
                        fahrer.name
                );

            alleTeams = Array.isArray(teamData)
                ? teamData
                : [];

            alleKalender = Array.isArray(calendarData)
                ? calendarData
                : [];

            fillSelect(
                teamFilter,
                alleFahrer.map(getTeam),
                "Alle Teams"
            );

            fillSelect(
                vehicleFilter,
                alleFahrer.map(getVehicle),
                "Alle Fahrzeuge"
            );

            updateStatistics();
            filterDrivers();
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    searchInput?.addEventListener(
        "input",
        filterDrivers
    );

    teamFilter?.addEventListener(
        "change",
        filterDrivers
    );

    vehicleFilter?.addEventListener(
        "change",
        filterDrivers
    );

    sortSelect?.addEventListener(
        "change",
        filterDrivers
    );

    await loadDrivers();
});
