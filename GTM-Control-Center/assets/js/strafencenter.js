/* ==========================================================
   GTM STRAFENCENTER
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid =
        document.getElementById("strafen-grid");

    const searchInput =
        document.getElementById("strafen-suche");

    const statusFilter =
        document.getElementById("strafen-status-filter");

    const typeFilter =
        document.getElementById("strafen-art-filter");

    const sortSelect =
        document.getElementById("strafen-sortierung");

    const noResults =
        document.getElementById("keine-strafen");

    let alleStrafen = [];

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
            Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function parseDate(value) {
        if (!value) {
            return null;
        }

        const text =
            String(value).trim();

        if (
            /^\d{4}-\d{2}-\d{2}$/.test(text)
        ) {
            const date =
                new Date(
                    `${text}T00:00:00`
                );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }

        const germanDate =
            text.match(
                /^(\d{2})\.(\d{2})\.(\d{4})$/
            );

        if (germanDate) {
            const date =
                new Date(
                    Number(germanDate[3]),
                    Number(germanDate[2]) - 1,
                    Number(germanDate[1])
                );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }

        const date =
            new Date(text);

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }

    function formatDate(value) {
        const date =
            parseDate(value);

        if (!date) {
            return (
                String(value ?? "").trim() ||
                "Kein Datum"
            );
        }

        return new Intl.DateTimeFormat(
            "de-DE",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(date);
    }

    function getDriverName(entry) {
        return String(
            entry?.fahrer ||
            entry?.name ||
            entry?.anzeigename ||
            "Unbekannter Fahrer"
        ).trim();
    }

    function getDriverNumber(entry) {
        return toNumber(
            entry?.nummer ||
            entry?.fahrernummer ||
            entry?.startnummer,
            0
        );
    }

    function getTeam(entry) {
        return String(
            entry?.team ||
            entry?.teamZuordnung ||
            "Kein Team"
        ).trim();
    }

    function getIncident(entry) {
        return String(
            entry?.vorfall ||
            entry?.beschreibung ||
            entry?.entscheidung ||
            "Keine Beschreibung vorhanden"
        ).trim();
    }

    function getPenaltyType(entry) {
        const value =
            normalizeText(
                entry?.strafart ||
                entry?.art ||
                entry?.strafe
            );

        if (
            value.includes("renn") &&
            value.includes("sper")
        ) {
            return "rennssperre";
        }

        if (
            value.includes("disqual")
        ) {
            return "disqualifikation";
        }

        if (
            value.includes("verwarn")
        ) {
            return "verwarnung";
        }

        if (
            value.includes("punkt")
        ) {
            return "strafpunkte";
        }

        return value || "sonstige";
    }

    function getPenaltyTypeLabel(type) {
        const labels = {
            verwarnung:
                "Verwarnung",

            strafpunkte:
                "Strafpunkte",

            rennssperre:
                "Rennsperre",

            disqualifikation:
                "Disqualifikation",

            sonstige:
                "Sonstige Strafe"
        };

        return (
            labels[type] ||
            "Sonstige Strafe"
        );
    }

    function getPenaltyStatus(entry) {
        const value =
            normalizeText(
                entry?.status
            );

        if (
            value === "erledigt" ||
            value === "abgeschlossen" ||
            value === "aufgehoben" ||
            entry?.erledigt === true
        ) {
            return "erledigt";
        }

        return "aktiv";
    }

    function getPenaltyPoints(entry) {
        return toNumber(
            entry?.strafpunkte ||
            entry?.punkte ||
            0,
            0
        );
    }

    function getRaceBanCount(entry) {
        return toNumber(
            entry?.rennsperren ||
            entry?.rennssperre ||
            entry?.sperren ||
            0,
            0
        );
    }

    function getSearchText(entry) {
        return normalizeText(
            [
                getDriverName(entry),
                getDriverNumber(entry),
                getTeam(entry),
                getIncident(entry),
                getPenaltyTypeLabel(
                    getPenaltyType(entry)
                ),
                getPenaltyStatus(entry),
                getPenaltyPoints(entry),
                getRaceBanCount(entry),
                entry?.datum,
                entry?.strecke,
                entry?.lauf
            ].join(" ")
        );
    }    function createPenaltyCard(entry) {
        const driverName =
            escapeHtml(
                getDriverName(entry)
            );

        const driverNumber =
            getDriverNumber(entry);

        const team =
            escapeHtml(
                getTeam(entry)
            );

        const incident =
            escapeHtml(
                getIncident(entry)
            );

        const type =
            getPenaltyType(entry);

        const typeLabel =
            escapeHtml(
                getPenaltyTypeLabel(type)
            );

        const status =
            getPenaltyStatus(entry);

        const penaltyPoints =
            getPenaltyPoints(entry);

        const raceBans =
            getRaceBanCount(entry);

        const date =
            escapeHtml(
                formatDate(entry?.datum)
            );

        const track =
            escapeHtml(
                entry?.strecke ||
                entry?.lauf ||
                "Keine Veranstaltung angegeben"
            );

        const decision =
            escapeHtml(
                entry?.entscheidung ||
                entry?.strafe ||
                typeLabel
            );

        return `
            <article
                class="strafe-karte status-${status} art-${type}"
                data-status="${status}"
                data-art="${type}"
            >

                <div class="strafe-karte-kopf">

                    <div class="strafe-fahrer">

                        <span class="strafe-nummer">
                            #${driverNumber || "–"}
                        </span>

                        <div>

                            <h2>
                                ${driverName}
                            </h2>

                            <p>
                                ${team}
                            </p>

                        </div>

                    </div>

                    <span class="strafe-status ${status}">
                        ${
                            status === "aktiv"
                                ? "Aktiv"
                                : "Erledigt"
                        }
                    </span>

                </div>

                <div class="strafe-meta">

                    <div>

                        <span>
                            Datum
                        </span>

                        <strong>
                            ${date}
                        </strong>

                    </div>

                    <div>

                        <span>
                            Veranstaltung
                        </span>

                        <strong>
                            ${track}
                        </strong>

                    </div>

                    <div>

                        <span>
                            Strafart
                        </span>

                        <strong>
                            ${typeLabel}
                        </strong>

                    </div>

                </div>

                <div class="strafe-vorfall">

                    <span>
                        Vorfall
                    </span>

                    <p>
                        ${incident}
                    </p>

                </div>

                <div class="strafe-entscheidung">

                    <span>
                        Entscheidung
                    </span>

                    <strong>
                        ${decision}
                    </strong>

                </div>

                <div class="strafe-werte">

                    <div>

                        <strong>
                            ${penaltyPoints}
                        </strong>

                        <span>
                            Strafpunkte
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${raceBans}
                        </strong>

                        <span>
                            Rennsperren
                        </span>

                    </div>

                </div>

            </article>
        `;
    }

    function updateStatistics() {
        const active =
            alleStrafen.filter(
                (entry) =>
                    getPenaltyStatus(entry) ===
                    "aktiv"
            );

        const raceBans =
            alleStrafen.reduce(
                (
                    total,
                    entry
                ) =>
                    total +
                    getRaceBanCount(entry),
                0
            );

        const points =
            alleStrafen.reduce(
                (
                    total,
                    entry
                ) =>
                    total +
                    getPenaltyPoints(entry),
                0
            );

        window.GTM.Utils?.setText(
            "strafen-gesamt",
            alleStrafen.length
        );

        window.GTM.Utils?.setText(
            "strafen-aktiv",
            active.length
        );

        window.GTM.Utils?.setText(
            "strafen-sperren",
            raceBans
        );

        window.GTM.Utils?.setText(
            "strafen-punkte",
            points
        );
    }

    function sortPenalties(entries) {
        const sortValue =
            sortSelect?.value ||
            "datum";

        return [...entries].sort(
            (a, b) => {
                if (
                    sortValue ===
                    "fahrer"
                ) {
                    return getDriverName(a)
                        .localeCompare(
                            getDriverName(b),
                            "de",
                            {
                                sensitivity:
                                    "base"
                            }
                        );
                }

                if (
                    sortValue ===
                    "punkte"
                ) {
                    return (
                        getPenaltyPoints(b) -
                        getPenaltyPoints(a)
                    );
                }

                if (
                    sortValue ===
                    "status"
                ) {
                    const priority = {
                        aktiv: 1,
                        erledigt: 2
                    };

                    return (
                        priority[
                            getPenaltyStatus(a)
                        ] -
                        priority[
                            getPenaltyStatus(b)
                        ]
                    );
                }

                const firstDate =
                    parseDate(a?.datum);

                const secondDate =
                    parseDate(b?.datum);

                if (
                    !firstDate &&
                    !secondDate
                ) {
                    return 0;
                }

                if (!firstDate) {
                    return 1;
                }

                if (!secondDate) {
                    return -1;
                }

                return (
                    secondDate.getTime() -
                    firstDate.getTime()
                );
            }
        );
    }

    function filterPenalties() {
        const query =
            normalizeText(
                searchInput?.value
            );

        const selectedStatus =
            String(
                statusFilter?.value ||
                ""
            ).trim();

        const selectedType =
            String(
                typeFilter?.value ||
                ""
            ).trim();

        const filtered =
            alleStrafen.filter(
                (entry) => {
                    const matchesSearch =
                        query === "" ||
                        getSearchText(
                            entry
                        ).includes(query);

                    const matchesStatus =
                        selectedStatus === "" ||
                        getPenaltyStatus(
                            entry
                        ) ===
                            selectedStatus;

                    const matchesType =
                        selectedType === "" ||
                        getPenaltyType(
                            entry
                        ) ===
                            selectedType;

                    return (
                        matchesSearch &&
                        matchesStatus &&
                        matchesType
                    );
                }
            );

        renderPenalties(
            sortPenalties(
                filtered
            )
        );
    }

    function renderPenalties(entries) {
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
                .map(createPenaltyCard)
                .join("");

        grid.setAttribute(
            "aria-busy",
            "false"
        );

        if (noResults) {
            noResults.hidden = true;
        }
    }    function showError(message) {
        console.error(message);

        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="gtm-data-error">

                <strong>
                    Die Strafendaten konnten nicht geladen werden.
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

    async function loadPenalties() {
        try {
            const data =
                await window.GTM.load(
                    "strafen",
                    {
                        forceReload: true
                    }
                );

            if (!Array.isArray(data)) {
                throw new Error(
                    "strafen.json enthält keine gültige Strafliste."
                );
            }

            alleStrafen =
                data.filter(
                    (entry) =>
                        entry &&
                        (
                            entry.fahrer ||
                            entry.name ||
                            entry.anzeigename
                        )
                );

            updateStatistics();
            filterPenalties();
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    searchInput?.addEventListener(
        "input",
        filterPenalties
    );

    statusFilter?.addEventListener(
        "change",
        filterPenalties
    );

    typeFilter?.addEventListener(
        "change",
        filterPenalties
    );

    sortSelect?.addEventListener(
        "change",
        filterPenalties
    );

    await loadPenalties();
});