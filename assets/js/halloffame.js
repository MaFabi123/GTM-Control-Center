/* ==========================================================
   GTM HALL OF FAME
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const meisterGrid =
        document.getElementById("hof-meister-grid");

    const rekordeGrid =
        document.getElementById("hof-rekorde-grid");

    const fahrerGrid =
        document.getElementById("hof-fahrer-grid");

    const teamsGrid =
        document.getElementById("hof-teams-grid");

    const herstellerGrid =
        document.getElementById("hof-hersteller-grid");

    const timeline =
        document.getElementById("hof-timeline");

    if (
        !window.GTM ||
        typeof window.GTM.load !== "function" ||
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

    function toNumber(
        value,
        fallback = 0
    ) {
        const number =
            Number(value);

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

    function getDriverImage(fahrer) {
        const nummer =
            toNumber(
                fahrer?.nummer,
                0
            );

        if (nummer < 1) {
            return "assets/images/fahrer/default.png";
        }

        return `assets/images/fahrer/${nummer}.png`;
    }

    function getManufacturer(vehicle) {
        const text =
            String(vehicle ?? "").trim();

        const manufacturers = [
            "Aston Martin",
            "Mercedes-AMG",
            "Mercedes",
            "Lamborghini",
            "McLaren",
            "Porsche",
            "Ferrari",
            "Bentley",
            "Nissan",
            "Jaguar",
            "Honda",
            "Lexus",
            "Alpine",
            "Chevrolet",
            "Maserati",
            "Audi",
            "BMW",
            "Ford"
        ];

        const found =
            manufacturers.find(
                (manufacturer) =>
                    text
                        .toLowerCase()
                        .includes(
                            manufacturer.toLowerCase()
                        )
            );

        return found || "Sonstige";
    }

    function createChampionCard(fahrer) {
    if (!fahrer) {
        return `
            <article class="hof-meister-karte leer">

                <div class="hof-meister-pokal">
                    🏆
                </div>

                <span class="hof-meister-offen-label">
                    GTM Masters Saison 1
                </span>

                <h3>
                    Meisterschaft läuft
                </h3>

                <p>
                    Der Champion der aktuellen Saison
                    steht noch nicht fest.
                </p>

                <div class="hof-meister-offen-status">
                    Meister wird nach Saisonende eingetragen
                </div>

            </article>
        `;
    }

    const name =
        escapeHtml(
            fahrer.name ||
            "Unbekannter Fahrer"
        );

    const team =
        escapeHtml(
            getTeam(fahrer)
        );

    const vehicle =
        escapeHtml(
            getVehicle(fahrer)
        );

    const number =
        toNumber(
            fahrer.nummer,
            0
        );

    const points =
        toNumber(
            fahrer.punkte,
            0
        );

    const fastLaps =
        toNumber(
            fahrer.fastLap,
            0
        );

    const image =
        escapeHtml(
            getDriverImage(fahrer)
        );

    return `
        <article class="hof-meister-karte">

            <div class="hof-meister-kopf">

                <span>
                    GTM Masters Saison 1
                </span>

                <strong>
                    🏆 Champion
                </strong>

            </div>

            <div class="hof-meister-bild">

                <img
                    src="${image}"
                    alt="${name}"
                    loading="lazy"
                    onerror="
                        this.onerror = null;
                        this.src = 'assets/images/fahrer/default.png';
                    "
                >

            </div>

            <div class="hof-meister-inhalt">

                <span class="hof-meister-nummer">
                    #${number || "–"}
                </span>

                <h3>
                    ${name}
                </h3>

                <p>
                    ${team}
                </p>

                <small>
                    ${vehicle}
                </small>

            </div>

            <div class="hof-meister-werte">

                <div>
                    <strong>${points}</strong>
                    <span>Punkte</span>
                </div>

                <div>
                    <strong>${fastLaps}</strong>
                    <span>Fast Laps</span>
                </div>

            </div>

        </article>
    `;
}

    function createRecordCard(
        icon,
        title,
        fahrer,
        value,
        unit
    ) {
        const name =
            escapeHtml(
                fahrer?.name ||
                "Noch kein Rekord"
            );

        const number =
            toNumber(
                fahrer?.nummer,
                0
            );

        const team =
            escapeHtml(
                fahrer
                    ? getTeam(fahrer)
                    : "–"
            );

        return `
            <article class="hof-rekord-karte">

                <div class="hof-rekord-icon">
                    ${icon}
                </div>

                <span class="hof-rekord-label">
                    ${escapeHtml(title)}
                </span>

                <h3>
                    ${name}
                </h3>

                <p>
                    ${
                        number > 0
                            ? `#${number} · ${team}`
                            : team
                    }
                </p>

                <div class="hof-rekord-wert">

                    <strong>
                        ${toNumber(value, 0)}
                    </strong>

                    <span>
                        ${escapeHtml(unit)}
                    </span>

                </div>

            </article>
        `;
    }

    function createDriverRankingCard(
        fahrer,
        index
    ) {
        const name =
            escapeHtml(
                fahrer.name ||
                "Unbekannter Fahrer"
            );

        const team =
            escapeHtml(
                getTeam(fahrer)
            );

        const vehicle =
            escapeHtml(
                getVehicle(fahrer)
            );

        const number =
            toNumber(
                fahrer.nummer,
                0
            );

        const points =
            toNumber(
                fahrer.punkte,
                0
            );

        const fastLaps =
            toNumber(
                fahrer.fastLap,
                0
            );

        return `
            <article class="hof-fahrer-karte">

                <span class="hof-rang">
                    ${index + 1}
                </span>

                <div class="hof-fahrer-info">

                    <span class="hof-fahrer-nummer">
                        #${number || "–"}
                    </span>

                    <h3>
                        ${name}
                    </h3>

                    <p>
                        ${team}
                    </p>

                    <small>
                        ${vehicle}
                    </small>

                </div>

                <div class="hof-fahrer-werte">

                    <div>

                        <strong>
                            ${points}
                        </strong>

                        <span>
                            Punkte
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${fastLaps}
                        </strong>

                        <span>
                            Fast Laps
                        </span>

                    </div>

                </div>

            </article>
        `;
    }

    function createTeamRankingCard(
        team,
        index
    ) {
        const name =
            escapeHtml(
                team?.name ||
                "Unbekanntes Team"
            );

        const points =
            toNumber(
                team?.punkte,
                0
            );

        const driverCount =
            toNumber(
                team?.anzahlFahrer,
                Array.isArray(team?.fahrer)
                    ? team.fahrer.length
                    : 0
            );

        const vehicles =
            Array.isArray(team?.fahrzeuge) &&
            team.fahrzeuge.length > 0
                ? team.fahrzeuge
                    .map(escapeHtml)
                    .join(", ")
                : "Keine Fahrzeuge eingetragen";

        return `
            <article class="hof-team-karte">

                <div class="hof-team-rang">
                    ${index + 1}
                </div>

                <div class="hof-team-symbol">
                    GTM
                </div>

                <div class="hof-team-inhalt">

                    <h3>
                        ${name}
                    </h3>

                    <p>
                        ${driverCount} Fahrer
                    </p>

                    <small title="${vehicles}">
                        ${vehicles}
                    </small>

                </div>

                <div class="hof-team-punkte">

                    <strong>
                        ${points}
                    </strong>

                    <span>
                        Punkte
                    </span>

                </div>

            </article>
        `;
    }

    function createManufacturerCard(
        manufacturer,
        index
    ) {
        return `
            <article class="hof-hersteller-karte">

                <span class="hof-hersteller-rang">
                    ${index + 1}
                </span>

                <div class="hof-hersteller-symbol">
                    ${escapeHtml(
                        manufacturer.name.charAt(0)
                    )}
                </div>

                <div>

                    <h3>
                        ${escapeHtml(
                            manufacturer.name
                        )}
                    </h3>

                    <p>
                        ${manufacturer.drivers} Fahrer
                    </p>

                </div>

                <strong>
                    ${manufacturer.points}
                    <span>
                        Punkte
                    </span>
                </strong>

            </article>
        `;
    }

    function createTimelineEntry(
        champion
    ) {
        return `
            <article class="hof-timeline-eintrag">

                <div class="hof-timeline-jahr">
                    2026
                </div>

                <div class="hof-timeline-punkt"></div>

                <div class="hof-timeline-inhalt">

                    <span>
                        GTM Masters Saison 1
                    </span>

                    <h3>
                        ${
                            champion
                                ? escapeHtml(champion.name)
                                : "Saison läuft"
                        }
                    </h3>

                    <p>
                        ${
                            champion
                                ? `${escapeHtml(
                                    getTeam(champion)
                                )} · ${toNumber(
                                    champion.punkte,
                                    0
                                )} Punkte`
                                : "Der erste GTM-Meister wird nach Saisonende eingetragen."
                        }
                    </p>

                </div>

            </article>
        `;
    }

    function getTopEntry(
        entries,
        property
    ) {
        return [...entries]
            .sort(
                (a, b) =>
                    toNumber(
                        b?.[property],
                        0
                    ) -
                    toNumber(
                        a?.[property],
                        0
                    )
            )[0] || null;
    }

    function buildManufacturers(
        drivers
    ) {
        const map =
            new Map();

        drivers.forEach(
            (fahrer) => {
                const vehicle =
                    getVehicle(fahrer);

                if (
                    !vehicle ||
                    vehicle ===
                        "Kein Fahrzeug eingetragen"
                ) {
                    return;
                }

                const manufacturer =
                    getManufacturer(vehicle);

                if (
                    !map.has(
                        manufacturer
                    )
                ) {
                    map.set(
                        manufacturer,
                        {
                            name:
                                manufacturer,

                            drivers:
                                0,

                            points:
                                0
                        }
                    );
                }

                const entry =
                    map.get(
                        manufacturer
                    );

                entry.drivers += 1;

                entry.points +=
                    toNumber(
                        fahrer.punkte,
                        0
                    );
            }
        );

        return Array.from(
            map.values()
        ).sort(
            (a, b) =>
                b.points -
                a.points ||
                b.drivers -
                a.drivers
        );
    }

    function showError(message) {
        console.error(message);

        const html = `
            <div class="gtm-data-error">

                <strong>
                    Die Hall of Fame konnte nicht geladen werden.
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>
        `;

        [
            meisterGrid,
            rekordeGrid,
            fahrerGrid,
            teamsGrid,
            herstellerGrid,
            timeline
        ].forEach(
            (container) => {
                if (container) {
                    container.innerHTML =
                        html;
                }
            }
        );
    }

    async function loadHallOfFame() {
        try {
            const [
                drivers,
                teams,
                races
            ] = await Promise.all([
                window.GTM.loadFahrer({
                    forceReload: true
                }),

                window.GTM.load(
                    "teams",
                    {
                        forceReload: true
                    }
                ),

                window.GTM.load(
                    "kalender",
                    {
                        forceReload: true
                    }
                )
            ]);

            const allDrivers =
                Array.isArray(drivers)
                    ? drivers
                    : [];

            const seasonDrivers =
                allDrivers.filter(
                    (fahrer) =>
                        fahrer &&
                        fahrer.aktiveSaison === true
                );

            const seasonTeams =
                Array.isArray(teams)
                    ? teams
                    : [];

            const calendar =
                Array.isArray(races)
                    ? races
                    : [];

            const completedRaces =
                calendar.filter(
                    (race) =>
                        race?.abgeschlossen === true ||
                        String(
                            race?.status || ""
                        ).toLowerCase() ===
                            "abgeschlossen"
                );

            const sortedDrivers =
                [...seasonDrivers].sort(
                    (a, b) =>
                        toNumber(
                            b.punkte,
                            0
                        ) -
                        toNumber(
                            a.punkte,
                            0
                        )
                );

            const sortedTeams =
                [...seasonTeams].sort(
                    (a, b) =>
                        toNumber(
                            b.punkte,
                            0
                        ) -
                        toNumber(
                            a.punkte,
                            0
                        )
                );

            const champion =
                completedRaces.length ===
                    calendar.length &&
                calendar.length > 0
                    ? sortedDrivers[0] ||
                        null
                    : null;

            const pointsLeader =
                getTopEntry(
                    seasonDrivers,
                    "punkte"
                );

            const fastLapLeader =
                getTopEntry(
                    seasonDrivers,
                    "fastLap"
                );

            const ratingLeader =
                getTopEntry(
                    seasonDrivers,
                    "wertung"
                );

            const changeLeader =
                getTopEntry(
                    seasonDrivers,
                    "fahrzeugwechsel"
                );

            const manufacturers =
                buildManufacturers(
                    seasonDrivers
                );

            window.GTM.Utils?.setText(
                "hof-meister",
                champion ? 1 : 0
            );

            window.GTM.Utils?.setText(
                "hof-rennen",
                completedRaces.length
            );

            window.GTM.Utils?.setText(
                "hof-fahrer",
                allDrivers.length
            );

            window.GTM.Utils?.setText(
                "hof-teams",
                seasonTeams.length
            );

            if (meisterGrid) {
                meisterGrid.innerHTML =
                    createChampionCard(
                        champion
                    );
            }

            if (rekordeGrid) {
                rekordeGrid.innerHTML = [
                    createRecordCard(
                        "🏆",
                        "Meiste Punkte",
                        pointsLeader,
                        pointsLeader?.punkte,
                        "Punkte"
                    ),

                    createRecordCard(
                        "⚡",
                        "Meiste Fast Laps",
                        fastLapLeader,
                        fastLapLeader?.fastLap,
                        "Fast Laps"
                    ),

                    createRecordCard(
                        "📊",
                        "Höchste Wertung",
                        ratingLeader,
                        ratingLeader?.wertung,
                        "Wertungspunkte"
                    ),

                    createRecordCard(
                        "🔄",
                        "Meiste Fahrzeugwechsel",
                        changeLeader,
                        changeLeader?.fahrzeugwechsel,
                        "Wechsel"
                    )
                ].join("");
            }

            if (fahrerGrid) {
                fahrerGrid.innerHTML =
                    sortedDrivers
                        .slice(0, 10)
                        .map(
                            createDriverRankingCard
                        )
                        .join("");
            }

            if (teamsGrid) {
                teamsGrid.innerHTML =
                    sortedTeams
                        .slice(0, 10)
                        .map(
                            createTeamRankingCard
                        )
                        .join("");
            }

            if (herstellerGrid) {
                herstellerGrid.innerHTML =
                    manufacturers
                        .slice(0, 10)
                        .map(
                            createManufacturerCard
                        )
                        .join("");
            }

            if (timeline) {
                timeline.innerHTML =
                    createTimelineEntry(
                        champion
                    );
            }
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    await loadHallOfFame();
});