/* ==========================================================
   GTM TEAMSEITE
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid =
        document.getElementById("teams-grid");

    const searchInput =
        document.getElementById("team-suche");

    const vehicleFilter =
        document.getElementById("fahrzeug-filter");

    const championshipFilter =
        document.getElementById("meisterschaft-filter");

    const sortSelect =
        document.getElementById("team-sortierung");

    const noResults =
        document.getElementById("keine-teams");

    let alleTeams = [];

    /* ======================================================
       GRUNDPRÜFUNG
    ====================================================== */

    if (
        !window.GTM ||
        typeof window.GTM.loadFahrer !== "function"
    ) {
        showError(
            "Die GTM Data Engine wurde nicht geladen."
        );

        return;
    }

    /* ======================================================
       HILFSFUNKTIONEN
    ====================================================== */

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

    function getDriverTeam(fahrer) {
        return String(
            fahrer?.teamZuordnung ||
            fahrer?.team ||
            ""
        ).trim();
    }

    function getDriverVehicle(fahrer) {
        return String(
            fahrer?.fahrzeug ||
            ""
        ).trim();
    }

    function getTeamLogo(teamName) {
    const fallback =
        "assets/images/teams/default.png";

    let normalizedName =
        String(teamName ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ß/g, "ss");

    /*
     * Team-Zusätze am Ende entfernen:
     * Rennsteig Racing I   -> Rennsteig Racing
     * Rennsteig Racing II  -> Rennsteig Racing
     * MAD Racer 1          -> MAD Racer
     * MAD Racer Team II    -> MAD Racer Team
     */
    normalizedName =
        normalizedName.replace(
            /\s+(?:i{1,3}|iv|v|vi{0,3}|ix|x|\d+)$/,
            ""
        );

    const slug =
        normalizedName
            .replace(/&/g, "und")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    if (!slug) {
        return fallback;
    }

    return `assets/images/teams/${slug}.png`;
}

    function isValidTeam(team) {
        const value =
            String(team ?? "").trim();

        return (
            value !== "" &&
            normalizeText(value) !== "kein team" &&
            value !== "0"
        );
    }

    function participatesInChampionship(team) {
        return (
            team?.aktiveMeisterschaft === true
        );
    }

    function getTeamSearchText(team) {
        const drivers =
            Array.isArray(team.fahrer)
                ? team.fahrer
                    .map(
                        (fahrer) =>
                            fahrer.name
                    )
                    .join(" ")
                : "";

        const vehicles =
            Array.isArray(team.fahrzeuge)
                ? team.fahrzeuge.join(" ")
                : "";

        return normalizeText(
            [
                team.name,
                drivers,
                vehicles,
                team.punkte,
                participatesInChampionship(team)
                    ? "aktuelle meisterschaft aktiv"
                    : "keine aktuelle teilnahme inaktiv"
            ].join(" ")
        );
    }

    /* ======================================================
       FILTER BEFÜLLEN
    ====================================================== */

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
                            String(
                                value ?? ""
                            ).trim()
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
            document.createElement(
                "option"
            );

        defaultOption.value = "";
        defaultOption.textContent =
            defaultLabel;

        select.appendChild(
            defaultOption
        );

        uniqueValues.forEach(
            (value) => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value = value;
                option.textContent =
                    value;

                select.appendChild(
                    option
                );
            }
        );

        if (
            uniqueValues.includes(
                currentValue
            )
        ) {
            select.value =
                currentValue;
        }
    }

    /* ======================================================
       TEAMS AUS FAHRERN UND MEISTERSCHAFT BAUEN
    ====================================================== */

    function buildTeams(
        drivers,
        championshipTeams
    ) {
        const championshipMap =
            new Map();

        championshipTeams.forEach(
            (team) => {
                const name =
                    String(
                        team?.name ||
                        team?.team ||
                        ""
                    ).trim();

                if (!name) {
                    return;
                }

                championshipMap.set(
                    normalizeText(name),
                    team
                );
            }
        );

        const teamMap =
            new Map();

        drivers.forEach(
            (fahrer) => {
                const teamName =
                    getDriverTeam(fahrer);

                if (
                    !isValidTeam(
                        teamName
                    )
                ) {
                    return;
                }

                const key =
                    normalizeText(
                        teamName
                    );

                if (
                    !teamMap.has(key)
                ) {
                    teamMap.set(
                        key,
                        {
                            name: teamName,
                            fahrer: [],
                            fahrzeuge:
                                new Set(),
                            aktiveFahrer: 0,
                            aktiveMeisterschaft:
                                false,
                            punkte: 0,
                            platzierung: 0
                        }
                    );
                }

                const team =
                    teamMap.get(key);

                const vehicle =
                    getDriverVehicle(
                        fahrer
                    );

                team.fahrer.push({
                    nummer:
                        toNumber(
                            fahrer.nummer,
                            0
                        ),

                    name:
                        String(
                            fahrer.name ||
                            fahrer.anzeigename ||
                            fahrer.fahrer ||
                            "Unbekannter Fahrer"
                        ).trim(),

                    fahrzeug:
                        vehicle,

                    aktiveSaison:
                        fahrer.aktiveSaison ===
                        true,

                    punkte:
                        toNumber(
                            fahrer.punkte,
                            0
                        ),

                    platzierung:
                        toNumber(
                            fahrer.platzierung,
                            0
                        )
                });

                if (vehicle) {
                    team.fahrzeuge.add(
                        vehicle
                    );
                }

                if (
                    fahrer.aktiveSaison ===
                    true
                ) {
                    team.aktiveFahrer++;
                }
            }
        );

        championshipMap.forEach(
            (
                championshipTeam,
                key
            ) => {
                if (
                    !teamMap.has(key)
                ) {
                    teamMap.set(
                        key,
                        {
                            name:
                                championshipTeam.name ||
                                championshipTeam.team,

                            fahrer: [],

                            fahrzeuge:
                                new Set(),

                            aktiveFahrer: 0,

                            aktiveMeisterschaft:
                                true,

                            punkte:
                                toNumber(
                                    championshipTeam.punkte,
                                    0
                                ),

                            platzierung:
                                toNumber(
                                    championshipTeam.platzierung,
                                    0
                                )
                        }
                    );
                }

                const team =
                    teamMap.get(key);

                team.aktiveMeisterschaft =
                    true;

                team.punkte =
                    toNumber(
                        championshipTeam.punkte,
                        team.punkte
                    );

                team.platzierung =
                    toNumber(
                        championshipTeam.platzierung,
                        team.platzierung
                    );

                const vehicles =
                    Array.isArray(
                        championshipTeam.fahrzeuge
                    )
                        ? championshipTeam.fahrzeuge
                        : [];

                vehicles.forEach(
                    (vehicle) => {
                        if (vehicle) {
                            team.fahrzeuge.add(
                                vehicle
                            );
                        }
                    }
                );
            }
        );

        return Array.from(
            teamMap.values()
        ).map(
            (team) => ({
                ...team,

                fahrzeuge:
                    Array.from(
                        team.fahrzeuge
                    ).sort(
                        (a, b) =>
                            a.localeCompare(
                                b,
                                "de",
                                {
                                    sensitivity:
                                        "base"
                                }
                            )
                    ),

                fahrer:
                    [...team.fahrer]
                        .sort(
                            (a, b) =>
                                a.nummer -
                                b.nummer
                        )
            })
        );
    }

    /* ======================================================
       FAHRERLISTE
    ====================================================== */

    function createDriverList(team) {
        if (
            !Array.isArray(
                team.fahrer
            ) ||
            team.fahrer.length === 0
        ) {
            return `
                <div class="team-fahrer-leer">
                    Keine Fahrer zugeordnet
                </div>
            `;
        }

        return team.fahrer
            .map(
                (fahrer) => `
                    <div class="team-fahrer">

                        <span class="team-fahrer-nummer">
                            #${escapeHtml(
                                fahrer.nummer ||
                                "–"
                            )}
                        </span>

                        <div class="team-fahrer-inhalt">

                            <strong>
                                ${escapeHtml(
                                    fahrer.name
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    fahrer.fahrzeug ||
                                    "Kein Fahrzeug eingetragen"
                                )}
                            </span>

                        </div>

                        <span
                            class="team-fahrer-status ${
                                fahrer.aktiveSaison
                                    ? "aktiv"
                                    : "inaktiv"
                            }"
                        >
                            ${
                                fahrer.aktiveSaison
                                    ? "Masters"
                                    : "GTM"
                            }
                        </span>

                    </div>
                `
            )
            .join("");
    }

    /* ======================================================
       TEAMKARTE
    ====================================================== */

    function createTeamCard(team) {
        const name =
            escapeHtml(
                team.name
            );

        const logo =
            escapeHtml(
                getTeamLogo(
                    team.name
                )
            );

        const active =
            participatesInChampionship(
                team
            );

        const driverCount =
            Array.isArray(
                team.fahrer
            )
                ? team.fahrer.length
                : 0;

        const activeDriverCount =
            toNumber(
                team.aktiveFahrer,
                0
            );

        const vehicleCount =
            Array.isArray(
                team.fahrzeuge
            )
                ? team.fahrzeuge.length
                : 0;

        const points =
            toNumber(
                team.punkte,
                0
            );

        const ranking =
            toNumber(
                team.platzierung,
                0
            );

        const vehicles =
            vehicleCount > 0
                ? team.fahrzeuge
                    .map(
                        (vehicle) =>
                            escapeHtml(
                                vehicle
                            )
                    )
                    .join(", ")
                : "Keine Fahrzeuge eingetragen";

        return `
            <article
                class="team-card"
                data-status="${
                    active
                        ? "aktiv"
                        : "inaktiv"
                }"
            >

                <div class="team-card-kopf">

                    <div class="team-card-identitaet">

                        <div class="team-card-logo">

                            <img
                                src="${logo}"
                                alt="Logo ${name}"
                                loading="lazy"
                                onerror="
                                    this.onerror = null;
                                    this.src = 'assets/images/teams/default.png';
                                "
                            >

                        </div>

                        <div class="team-card-name">

                            <span class="team-card-label">
                                GTM Team
                            </span>

                            <h2>
                                ${name}
                            </h2>

                        </div>

                    </div>

                    <span
                        class="team-card-status ${
                            active
                                ? "aktiv"
                                : "inaktiv"
                        }"
                    >
                        ${
                            active
                                ? "Aktuelle Meisterschaft"
                                : "Keine aktuelle Teilnahme"
                        }
                    </span>

                </div>

                <div class="team-card-statistik">

                    <div>

                        <strong>
                            ${driverCount}
                        </strong>

                        <span>
                            Fahrer
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${activeDriverCount}
                        </strong>

                        <span>
                            Masters-Fahrer
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${vehicleCount}
                        </strong>

                        <span>
                            Fahrzeuge
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${
                                active
                                    ? points
                                    : "–"
                            }
                        </strong>

                        <span>
                            Punkte
                        </span>

                    </div>

                </div>

                <div class="team-card-info">

                    <span>
                        Fahrzeuge
                    </span>

                    <strong>
                        ${vehicles}
                    </strong>

                </div>

                ${
                    active
                        ? `
                            <div class="team-meisterschaft-info">

                                <span>
                                    Teamwertung
                                </span>

                                <strong>
                                    ${
                                        ranking > 0
                                            ? `Platz ${ranking}`
                                            : "Aktive Teilnahme"
                                    }
                                </strong>

                            </div>
                        `
                        : ""
                }

                <div class="team-fahrer-liste">

                    <h3>
                        Fahrer
                    </h3>

                    ${createDriverList(
                        team
                    )}

                </div>

                <button
                    type="button"
                    class="team-profil-button"
                    data-team-name="${name}"
                >
                    Teamprofil
                </button>

            </article>
        `;
    }

    /* ======================================================
       STATISTIKEN
    ====================================================== */

    function updateStatistics() {
        const activeTeams =
            alleTeams.filter(
                participatesInChampionship
            );

        const drivers =
            alleTeams.reduce(
                (
                    total,
                    team
                ) =>
                    total +
                    (
                        Array.isArray(
                            team.fahrer
                        )
                            ? team.fahrer.length
                            : 0
                    ),
                0
            );

        const vehicles =
            new Set(
                alleTeams.flatMap(
                    (team) =>
                        Array.isArray(
                            team.fahrzeuge
                        )
                            ? team.fahrzeuge
                            : []
                )
            );

        window.GTM.Utils?.setText(
            "teams-anzahl",
            alleTeams.length
        );

        window.GTM.Utils?.setText(
            "teams-meisterschaft",
            activeTeams.length
        );

        window.GTM.Utils?.setText(
            "teams-fahrer",
            drivers
        );

        window.GTM.Utils?.setText(
            "teams-fahrzeuge",
            vehicles.size
        );
    }

    /* ======================================================
       SORTIERUNG
    ====================================================== */

    function sortTeams(entries) {
        const sortValue =
            sortSelect?.value ||
            "name";

        return [...entries].sort(
            (a, b) => {
                if (
                    sortValue ===
                    "fahrer"
                ) {
                    const difference =
                        b.fahrer.length -
                        a.fahrer.length;

                    if (difference !== 0) {
                        return difference;
                    }
                }

                if (
                    sortValue ===
                    "status"
                ) {
                    const difference =
                        Number(
                            participatesInChampionship(
                                b
                            )
                        ) -
                        Number(
                            participatesInChampionship(
                                a
                            )
                        );

                    if (
                        difference !== 0
                    ) {
                        return difference;
                    }
                }

                if (
                    sortValue ===
                    "punkte"
                ) {
                    const difference =
                        toNumber(
                            b.punkte,
                            0
                        ) -
                        toNumber(
                            a.punkte,
                            0
                        );

                    if (
                        difference !== 0
                    ) {
                        return difference;
                    }
                }

                return a.name.localeCompare(
                    b.name,
                    "de",
                    {
                        sensitivity: "base"
                    }
                );
            }
        );
    }

    /* ======================================================
       FILTER
    ====================================================== */

    function filterTeams() {
        const query =
            normalizeText(
                searchInput?.value
            );

        const selectedVehicle =
            String(
                vehicleFilter?.value ||
                ""
            ).trim();

        const selectedStatus =
            String(
                championshipFilter
                    ?.value ||
                ""
            ).trim();

        const filtered =
            alleTeams.filter(
                (team) => {
                    const matchesSearch =
                        query === "" ||
                        getTeamSearchText(
                            team
                        ).includes(query);

                    const matchesVehicle =
                        selectedVehicle ===
                            "" ||
                        team.fahrzeuge.includes(
                            selectedVehicle
                        );

                    const active =
                        participatesInChampionship(
                            team
                        );

                    const matchesStatus =
                        selectedStatus ===
                            "" ||
                        (
                            selectedStatus ===
                                "aktiv" &&
                            active
                        ) ||
                        (
                            selectedStatus ===
                                "inaktiv" &&
                            !active
                        );

                    return (
                        matchesSearch &&
                        matchesVehicle &&
                        matchesStatus
                    );
                }
            );

        renderTeams(
            sortTeams(
                filtered
            )
        );
    }

    /* ======================================================
       RENDERN
    ====================================================== */

    function renderTeams(entries) {
        if (!grid) {
            return;
        }

        if (
            entries.length === 0
        ) {
            grid.innerHTML = "";

            if (noResults) {
                noResults.hidden =
                    false;
            }

            grid.setAttribute(
                "aria-busy",
                "false"
            );

            return;
        }

        grid.innerHTML =
            entries
                .map(createTeamCard)
                .join("");

        grid.setAttribute(
            "aria-busy",
            "false"
        );

        if (noResults) {
            noResults.hidden =
                true;
        }
    }

    /* ======================================================
       FEHLER
    ====================================================== */

    function showError(message) {
        console.error(message);

        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="gtm-data-error">

                <strong>
                    Die Teamdaten konnten nicht geladen werden.
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

    /* ======================================================
       DATEN LADEN
    ====================================================== */

    async function loadTeams() {
        try {
            const [
                drivers,
                championshipTeams
            ] = await Promise.all([
                window.GTM.loadFahrer({
                    forceReload: true
                }),

                window.GTM.load(
                    "teams",
                    {
                        forceReload: true
                    }
                ).catch(() => [])
            ]);

            if (
                !Array.isArray(
                    drivers
                )
            ) {
                throw new Error(
                    "fahrer.json enthält keine gültige Fahrerliste."
                );
            }

            alleTeams =
                buildTeams(
                    drivers,
                    Array.isArray(
                        championshipTeams
                    )
                        ? championshipTeams
                        : []
                );

            fillSelect(
                vehicleFilter,
                alleTeams.flatMap(
                    (team) =>
                        team.fahrzeuge
                ),
                "Alle Fahrzeuge"
            );

            updateStatistics();
            filterTeams();
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    /* ======================================================
       EVENTS
    ====================================================== */

    searchInput?.addEventListener(
        "input",
        filterTeams
    );

    vehicleFilter?.addEventListener(
        "change",
        filterTeams
    );

    championshipFilter
        ?.addEventListener(
            "change",
            filterTeams
        );

    sortSelect?.addEventListener(
        "change",
        filterTeams
    );

    grid?.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    ".team-profil-button"
                );

            if (!button) {
                return;
            }

            console.info(
                `Teamprofil „${button.dataset.teamName}“ wird später ergänzt.`
            );
        }
    );

    await loadTeams();
});