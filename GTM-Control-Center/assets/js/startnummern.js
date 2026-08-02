/* ==========================================================
   GTM STARTNUMMERNVERWALTUNG
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid =
        document.getElementById("startnummern-grid");

    const searchInput =
        document.getElementById("startnummern-suche");

    const statusFilter =
        document.getElementById("startnummern-status-filter");

    const teamFilter =
        document.getElementById("startnummern-team-filter");

    const sortSelect =
        document.getElementById("startnummern-sortierung");

    const noResults =
        document.getElementById("keine-startnummern");

    const ersteStartnummer = 1;
    const letzteStartnummer = 999;

    let alleStartnummern = [];

    if (
        !window.GTM ||
        typeof window.GTM.load !== "function"
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
            Number(
                String(value ?? "")
                    .replace(/[^0-9.-]/g, "")
            );

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function getNumber(entry) {
        return toNumber(
            entry?.nummer ||
            entry?.startnummer ||
            entry?.fahrernummer,
            0
        );
    }

    function getDriver(entry) {
        return String(
            entry?.fahrer ||
            entry?.name ||
            entry?.anzeigename ||
            ""
        ).trim();
    }

    function getTeam(entry) {
        return String(
            entry?.team ||
            entry?.teamZuordnung ||
            ""
        ).trim();
    }

    function getVehicle(entry) {
        return String(
            entry?.fahrzeug ||
            ""
        ).trim();
    }

    function getStatus(entry) {
        const driver =
            getDriver(entry);

        const status =
            normalizeText(
                entry?.status
            );

        if (
            status === "vergeben" ||
            status === "belegt" ||
            driver !== ""
        ) {
            return "vergeben";
        }

        return "frei";
    }

    function buildNumberList(entries) {
        const assignedMap =
            new Map();

        entries.forEach((entry) => {
            const number =
                getNumber(entry);

            if (
                number < ersteStartnummer ||
                number > letzteStartnummer
            ) {
                return;
            }

            if (!assignedMap.has(number)) {
                assignedMap.set(
                    number,
                    entry
                );
            }
        });

        const result = [];

        for (
            let number = ersteStartnummer;
            number <= letzteStartnummer;
            number++
        ) {
            const assignedEntry =
                assignedMap.get(number);

            if (assignedEntry) {
                result.push({
                    nummer: number,
                    status: "vergeben",
                    fahrer:
                        getDriver(
                            assignedEntry
                        ),
                    team:
                        getTeam(
                            assignedEntry
                        ),
                    fahrzeug:
                        getVehicle(
                            assignedEntry
                        )
                });
            } else {
                result.push({
                    nummer: number,
                    status: "frei",
                    fahrer: "",
                    team: "",
                    fahrzeug: ""
                });
            }
        }

        return result;
    }

    function getSearchText(entry) {
        return normalizeText(
            [
                entry.nummer,
                entry.status,
                entry.fahrer,
                entry.team,
                entry.fahrzeug,
                entry.status === "frei"
                    ? "frei verfügbar"
                    : "vergeben belegt"
            ].join(" ")
        );
    }

    function createNumberCard(entry) {
        const number =
            toNumber(
                entry.nummer,
                0
            );

        const status =
            getStatus(entry);

        const isAssigned =
            status === "vergeben";

        const driver =
            escapeHtml(
                entry.fahrer ||
                "Noch nicht vergeben"
            );

        const team =
            escapeHtml(
                entry.team ||
                "Kein Team"
            );

        const vehicle =
            escapeHtml(
                entry.fahrzeug ||
                "Kein Fahrzeug eingetragen"
            );

        return `
            <article
                class="startnummer-karte status-${status}"
                data-status="${status}"
                data-nummer="${number}"
            >

                <div class="startnummer-nummer">
                    ${number}
                </div>

                <div class="startnummer-inhalt">

                    <div class="startnummer-kopf">

                        <span class="startnummer-label">
                            GTM Startnummer
                        </span>

                        <span class="startnummer-status ${status}">
                            ${
                                isAssigned
                                    ? "Vergeben"
                                    : "Verfügbar"
                            }
                        </span>

                    </div>

                    <h2>
                        ${
                            isAssigned
                                ? driver
                                : `Nummer ${number}`
                        }
                    </h2>

                    ${
                        isAssigned
                            ? `
                                <div class="startnummer-details">

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
                                            ${vehicle}
                                        </strong>

                                    </div>

                                </div>
                            `
                            : `
                                <div class="startnummer-frei-hinweis">

                                    Diese Startnummer ist derzeit
                                    nicht vergeben.

                                </div>
                            `
                    }

                </div>

            </article>
        `;
    }

    function fillTeamFilter() {
        if (!teamFilter) {
            return;
        }

        const currentValue =
            teamFilter.value;

        const teams = [
            ...new Set(
                alleStartnummern
                    .filter(
                        (entry) =>
                            entry.status ===
                                "vergeben" &&
                            entry.team
                    )
                    .map(
                        (entry) =>
                            entry.team.trim()
                    )
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

        teamFilter.innerHTML = `
            <option value="">
                Alle Teams
            </option>
        `;

        teams.forEach((team) => {
            const option =
                document.createElement(
                    "option"
                );

            option.value = team;
            option.textContent = team;

            teamFilter.appendChild(
                option
            );
        });

        if (
            teams.includes(
                currentValue
            )
        ) {
            teamFilter.value =
                currentValue;
        }
    }

    function updateStatistics() {
        const assigned =
            alleStartnummern.filter(
                (entry) =>
                    entry.status ===
                    "vergeben"
            );

        const available =
            alleStartnummern.filter(
                (entry) =>
                    entry.status ===
                    "frei"
            );

        const highestAssigned =
            assigned.reduce(
                (
                    highest,
                    entry
                ) =>
                    Math.max(
                        highest,
                        toNumber(
                            entry.nummer,
                            0
                        )
                    ),
                0
            );

        window.GTM.Utils?.setText(
            "startnummern-gesamt",
            alleStartnummern.length
        );

        window.GTM.Utils?.setText(
            "startnummern-vergeben",
            assigned.length
        );

        window.GTM.Utils?.setText(
            "startnummern-frei",
            available.length
        );

        window.GTM.Utils?.setText(
            "startnummern-hoechste",
            highestAssigned || "–"
        );
    }

    function sortNumbers(entries) {
        const sortValue =
            sortSelect?.value ||
            "nummer";

        return [...entries].sort(
            (a, b) => {
                if (
                    sortValue ===
                    "fahrer"
                ) {
                    const firstDriver =
                        a.fahrer ||
                        "ZZZZZZ";

                    const secondDriver =
                        b.fahrer ||
                        "ZZZZZZ";

                    const comparison =
                        firstDriver.localeCompare(
                            secondDriver,
                            "de",
                            {
                                sensitivity:
                                    "base"
                            }
                        );

                    if (comparison !== 0) {
                        return comparison;
                    }
                }

                if (
                    sortValue ===
                    "team"
                ) {
                    const firstTeam =
                        a.team ||
                        "ZZZZZZ";

                    const secondTeam =
                        b.team ||
                        "ZZZZZZ";

                    const comparison =
                        firstTeam.localeCompare(
                            secondTeam,
                            "de",
                            {
                                sensitivity:
                                    "base"
                            }
                        );

                    if (comparison !== 0) {
                        return comparison;
                    }
                }

                if (
                    sortValue ===
                    "status"
                ) {
                    const priority = {
                        vergeben: 1,
                        frei: 2
                    };

                    const difference =
                        priority[a.status] -
                        priority[b.status];

                    if (difference !== 0) {
                        return difference;
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

    function filterNumbers() {
        const query =
            normalizeText(
                searchInput?.value
            );

        const selectedStatus =
            String(
                statusFilter?.value ||
                ""
            ).trim();

        const selectedTeam =
            String(
                teamFilter?.value ||
                ""
            ).trim();

        const filtered =
            alleStartnummern.filter(
                (entry) => {
                    const matchesSearch =
                        query === "" ||
                        getSearchText(
                            entry
                        ).includes(query);

                    const matchesStatus =
                        selectedStatus === "" ||
                        entry.status ===
                            selectedStatus;

                    const matchesTeam =
                        selectedTeam === "" ||
                        entry.team ===
                            selectedTeam;

                    return (
                        matchesSearch &&
                        matchesStatus &&
                        matchesTeam
                    );
                }
            );

        renderNumbers(
            sortNumbers(
                filtered
            )
        );
    }

    function renderNumbers(entries) {
        if (!grid) {
            return;
        }

        if (entries.length === 0) {
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
                .map(createNumberCard)
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

    function showError(message) {
        console.error(message);

        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="gtm-data-error">

                <strong>
                    Die Startnummern konnten nicht geladen werden.
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

    async function loadNumbers() {
        try {
            const data =
                await window.GTM.load(
                    "startnummern",
                    {
                        forceReload: true
                    }
                );

            if (!Array.isArray(data)) {
                throw new Error(
                    "startnummern.json enthält keine gültige Liste."
                );
            }

            alleStartnummern =
                buildNumberList(data);

            fillTeamFilter();
            updateStatistics();
            filterNumbers();
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    searchInput?.addEventListener(
        "input",
        filterNumbers
    );

    statusFilter?.addEventListener(
        "change",
        filterNumbers
    );

    teamFilter?.addEventListener(
        "change",
        filterNumbers
    );

    sortSelect?.addEventListener(
        "change",
        filterNumbers
    );

    await loadNumbers();
});