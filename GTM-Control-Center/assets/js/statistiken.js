/* ==========================================================
   GTM STATISTIKEN
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const topDriverGrid =
        document.getElementById("statistik-top-fahrer");

    const topTeamGrid =
        document.getElementById("statistik-top-teams");

    const vehicleGrid =
        document.getElementById("statistik-fahrzeug-grid");

    const driverGrid =
        document.getElementById("statistik-fahrer-grid");

    const noResults =
        document.getElementById("keine-statistiken");

    const viewSelect =
        document.getElementById("statistik-ansicht");

    const searchInput =
        document.getElementById("statistik-suche");

    const sortSelect =
        document.getElementById("statistik-sortierung");

    let saisonFahrer = [];
    let saisonTeams = [];
    let kalender = [];

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

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
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

    function getSearchText(fahrer) {
        return normalizeText(
            [
                fahrer?.platzierung,
                fahrer?.nummer,
                fahrer?.name,
                getTeam(fahrer),
                getVehicle(fahrer),
                fahrer?.punkte,
                fahrer?.fastLap,
                fahrer?.fahrzeugwechsel
            ].join(" ")
        );
    }

    function getRaceStatus(race) {
        const status =
            normalizeText(
                race?.status
            );

        if (
            status === "abgeschlossen" ||
            race?.abgeschlossen === true
        ) {
            return "abgeschlossen";
        }

        if (
            status === "aktuell" ||
            race?.aktuell === true
        ) {
            return "aktuell";
        }

        if (
            status === "nachster" ||
            status === "nächster" ||
            race?.naechster === true
        ) {
            return "nächster";
        }

        return "bevorstehend";
    }

    function createTopDriverCard(fahrer, index) {
    const placement =
        toNumber(
            fahrer?.platzierung,
            index + 1
        );

    const number =
        toNumber(
            fahrer?.nummer,
            0
        );

    const points =
        toNumber(
            fahrer?.punkte,
            0
        );

    const fastLaps =
        toNumber(
            fahrer?.fastLap,
            0
        );

    const name =
        escapeHtml(
            fahrer?.name ||
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

    const image =
        escapeHtml(
            getDriverImage(fahrer)
        );

    const medal =
        placement === 1
            ? "🥇"
            : placement === 2
                ? "🥈"
                : "🥉";

    return `
        <article class="statistik-podium-karte fahrer platz-${placement}">

            <div class="statistik-podium-kopf">

                <span class="statistik-podium-medaille">
                    ${medal}
                </span>

                <span class="statistik-podium-nummer">
                    #${number || "–"}
                </span>

            </div>

            <div class="statistik-podium-bild">

                <img
                    src="${image}"
                    alt="${name}"
                    loading="lazy"
                    onerror="
                        this.onerror = null;
                        this.src = 'assets/images/fahrer/default.png';
                    "
                >

                <span class="statistik-podium-platz">
                    ${placement}
                </span>

            </div>

            <div class="statistik-podium-inhalt">

                <h3>
                    ${name}
                </h3>

                <p>
                    ${team}
                </p>

                <small title="${vehicle}">
                    ${vehicle}
                </small>

            </div>

            <div class="statistik-podium-ergebnis">

                <strong>
                    ${points}
                </strong>

                <span>
                    Punkte
                </span>

            </div>

            <div class="statistik-podium-zusatz">

                <span>
                    Fast Laps
                </span>

                <strong>
                    ${fastLaps}
                </strong>

            </div>

        </article>
    `;
}

    function createTopTeamCard(team, index) {
    const placement =
        toNumber(
            team?.platzierung,
            index + 1
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

    const name =
        escapeHtml(
            team?.name ||
            "Unbekanntes Team"
        );

    const vehicles =
        Array.isArray(team?.fahrzeuge) &&
        team.fahrzeuge.length > 0
            ? team.fahrzeuge
                .map(escapeHtml)
                .join(", ")
            : "Keine Fahrzeuge eingetragen";

    const medal =
        placement === 1
            ? "🥇"
            : placement === 2
                ? "🥈"
                : "🥉";

    return `
        <article class="statistik-podium-karte team platz-${placement}">

            <div class="statistik-podium-kopf">

                <span class="statistik-podium-medaille">
                    ${medal}
                </span>

                <span class="statistik-team-badge">
                    Teamwertung
                </span>

            </div>

            <div class="statistik-team-logo">
                GTM
            </div>

            <div class="statistik-podium-inhalt">

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

            <div class="statistik-podium-ergebnis">

                <strong>
                    ${points}
                </strong>

                <span>
                    Punkte
                </span>

            </div>

            <div class="statistik-podium-zusatz">

                <span>
                    Teamwertung
                </span>

                <strong>
                    Platz ${placement}
                </strong>

            </div>

        </article>
    `;
}

    function createVehicleCard(
        vehicle,
        index
    ) {
        const percent =
            saisonFahrer.length > 0
                ? Math.round(
                    (
                        vehicle.count /
                        saisonFahrer.length
                    ) * 100
                )
                : 0;

        return `
            <article class="statistik-fahrzeug-karte">

                <div class="statistik-fahrzeug-rang">
                    ${index + 1}
                </div>

                <div class="statistik-fahrzeug-inhalt">

                    <h3>
                        ${escapeHtml(
                            vehicle.name
                        )}
                    </h3>

                    <div class="statistik-fahrzeug-balken">

                        <span
                            style="width: ${percent}%"
                        ></span>

                    </div>

                </div>

                <div class="statistik-fahrzeug-wert">

                    <strong>
                        ${vehicle.count}
                    </strong>

                    <span>
                        Fahrer
                    </span>

                    <small>
                        ${percent} %
                    </small>

                </div>

            </article>
        `;
    }

    function createDriverStatisticCard(
        fahrer
    ) {
        const placement =
            toNumber(
                fahrer?.platzierung,
                0
            );

        const number =
            toNumber(
                fahrer?.nummer,
                0
            );

        const points =
            toNumber(
                fahrer?.punkte,
                0
            );

        const fastLaps =
            toNumber(
                fahrer?.fastLap,
                0
            );

        const changes =
            toNumber(
                fahrer?.fahrzeugwechsel,
                0
            );

        const rating =
            toNumber(
                fahrer?.wertung,
                0
            );

        const name =
            escapeHtml(
                fahrer?.name ||
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

        return `
            <article class="statistik-fahrer-karte">

                <div class="statistik-fahrer-kopf">

                    <span class="statistik-fahrer-platz">
                        ${placement || "–"}
                    </span>

                    <div>

                        <span class="statistik-fahrer-nummer">
                            #${number || "–"}
                        </span>

                        <h3>
                            ${name}
                        </h3>

                    </div>

                    <strong class="statistik-fahrer-punkte">
                        ${points}
                        <small>
                            Punkte
                        </small>
                    </strong>

                </div>

                <div class="statistik-fahrer-meta">

                    <span>
                        ${team}
                    </span>

                    <span>
                        ${vehicle}
                    </span>

                </div>

                <div class="statistik-fahrer-werte">

                    <div>

                        <strong>
                            ${placement || "–"}
                        </strong>

                        <span>
                            Platz
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${rating}
                        </strong>

                        <span>
                            Wertung
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

                    <div>

                        <strong>
                            ${changes}
                        </strong>

                        <span>
                            Wechsel
                        </span>

                    </div>

                </div>

            </article>
        `;
    }

    function updateOverview() {
        const completedRaces =
            kalender.filter(
                (race) =>
                    getRaceStatus(race) ===
                    "abgeschlossen"
            ).length;

        const totalRaces =
            kalender.length;

        const totalFastLaps =
            saisonFahrer.reduce(
                (
                    total,
                    fahrer
                ) =>
                    total +
                    toNumber(
                        fahrer.fastLap,
                        0
                    ),
                0
            );

        const totalChanges =
            saisonFahrer.reduce(
                (
                    total,
                    fahrer
                ) =>
                    total +
                    toNumber(
                        fahrer.fahrzeugwechsel,
                        0
                    ),
                0
            );

        const totalPoints =
            saisonFahrer.reduce(
                (
                    total,
                    fahrer
                ) =>
                    total +
                    toNumber(
                        fahrer.punkte,
                        0
                    ),
                0
            );

        const vehicles =
            new Set(
                saisonFahrer
                    .map(getVehicle)
                    .filter(
                        (vehicle) =>
                            vehicle &&
                            vehicle !==
                                "Kein Fahrzeug eingetragen"
                    )
            );

        window.GTM.Utils?.setText(
            "statistik-fahrer",
            saisonFahrer.length
        );

        window.GTM.Utils?.setText(
            "statistik-teams",
            saisonTeams.length
        );

        window.GTM.Utils?.setText(
            "statistik-rennen",
            totalRaces
        );

        window.GTM.Utils?.setText(
            "statistik-fortschritt",
            `${completedRaces}/${totalRaces}`
        );

        window.GTM.Utils?.setText(
            "statistik-fastlaps",
            totalFastLaps
        );

        window.GTM.Utils?.setText(
            "statistik-wechsel",
            totalChanges
        );

        window.GTM.Utils?.setText(
            "statistik-punkte",
            totalPoints
        );

        window.GTM.Utils?.setText(
            "statistik-fahrzeuge",
            vehicles.size
        );
    }

    function renderTopDrivers() {
        if (!topDriverGrid) {
            return;
        }

        const topDrivers =
            [...saisonFahrer]
                .sort(
                    (a, b) =>
                        toNumber(
                            a.platzierung,
                            9999
                        ) -
                        toNumber(
                            b.platzierung,
                            9999
                        )
                )
                .slice(0, 3);

        topDriverGrid.innerHTML =
            topDrivers
                .map(createTopDriverCard)
                .join("");
    }

    function renderTopTeams() {
        if (!topTeamGrid) {
            return;
        }

        const topTeams =
            [...saisonTeams]
                .sort(
                    (a, b) =>
                        toNumber(
                            a.platzierung,
                            9999
                        ) -
                        toNumber(
                            b.platzierung,
                            9999
                        )
                )
                .slice(0, 3);

        topTeamGrid.innerHTML =
            topTeams
                .map(createTopTeamCard)
                .join("");
    }

    function renderVehicles() {
        if (!vehicleGrid) {
            return;
        }

        const vehicleMap =
            new Map();

        saisonFahrer.forEach(
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

                vehicleMap.set(
                    vehicle,
                    (
                        vehicleMap.get(
                            vehicle
                        ) || 0
                    ) + 1
                );
            }
        );

        const vehicles =
            Array.from(
                vehicleMap.entries()
            )
                .map(
                    (
                        [
                            name,
                            count
                        ]
                    ) => ({
                        name,
                        count
                    })
                )
                .sort(
                    (a, b) =>
                        b.count -
                        a.count ||
                        a.name.localeCompare(
                            b.name,
                            "de",
                            {
                                sensitivity:
                                    "base"
                            }
                        )
                );

        vehicleGrid.innerHTML =
            vehicles
                .map(createVehicleCard)
                .join("");
    }

    function sortDrivers(entries) {
        const sortValue =
            sortSelect?.value ||
            "punkte";

        return [...entries].sort(
            (a, b) => {
                if (
                    sortValue ===
                    "platzierung"
                ) {
                    return (
                        toNumber(
                            a.platzierung,
                            9999
                        ) -
                        toNumber(
                            b.platzierung,
                            9999
                        )
                    );
                }

                if (
                    sortValue ===
                    "fastlaps"
                ) {
                    return (
                        toNumber(
                            b.fastLap,
                            0
                        ) -
                        toNumber(
                            a.fastLap,
                            0
                        )
                    );
                }

                if (
                    sortValue ===
                    "startnummer"
                ) {
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

                return (
                    toNumber(
                        b.punkte,
                        0
                    ) -
                    toNumber(
                        a.punkte,
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

        return saisonFahrer.filter(
            (fahrer) =>
                query === "" ||
                getSearchText(
                    fahrer
                ).includes(query)
        );
    }

    function applyView() {
        const view =
            viewSelect?.value ||
            "gesamt";

        document.body.setAttribute(
            "data-statistik-ansicht",
            view
        );

        renderDriverStatistics();
    }

    function renderDriverStatistics() {
        if (!driverGrid) {
            return;
        }

        const filtered =
            sortDrivers(
                filterDrivers()
            );

        if (filtered.length === 0) {
            driverGrid.innerHTML = "";

            if (noResults) {
                noResults.hidden =
                    false;
            }

            driverGrid.setAttribute(
                "aria-busy",
                "false"
            );

            return;
        }

        driverGrid.innerHTML =
            filtered
                .map(
                    createDriverStatisticCard
                )
                .join("");

        driverGrid.setAttribute(
            "aria-busy",
            "false"
        );

        if (noResults) {
            noResults.hidden =
                true;
        }
    }

    function showError(message) {
        console.error(message);

        const errorHtml = `
            <div class="gtm-data-error">

                <strong>
                    Die Statistiken konnten nicht geladen werden.
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>
        `;

        if (driverGrid) {
            driverGrid.innerHTML =
                errorHtml;
        }

        if (topDriverGrid) {
            topDriverGrid.innerHTML =
                errorHtml;
        }

        if (topTeamGrid) {
            topTeamGrid.innerHTML =
                errorHtml;
        }

        if (vehicleGrid) {
            vehicleGrid.innerHTML =
                errorHtml;
        }
    }

    async function loadStatistics() {
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

            if (!Array.isArray(drivers)) {
                throw new Error(
                    "fahrer.json enthält keine gültige Fahrerliste."
                );
            }

            saisonFahrer =
                drivers.filter(
                    (fahrer) =>
                        fahrer &&
                        fahrer.aktiveSaison === true
                );

            saisonTeams =
                Array.isArray(teams)
                    ? teams
                    : [];

            kalender =
                Array.isArray(races)
                    ? races
                    : [];

            updateOverview();
            renderTopDrivers();
            renderTopTeams();
            renderVehicles();
            applyView();
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    viewSelect?.addEventListener(
        "change",
        applyView
    );

    searchInput?.addEventListener(
        "input",
        renderDriverStatistics
    );

    sortSelect?.addEventListener(
        "change",
        renderDriverStatistics
    );

    await loadStatistics();
});