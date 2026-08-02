/* ==========================================================
   GTM RENNKALENDER
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid =
        document.getElementById("kalender-grid");

    const searchInput =
        document.getElementById("kalender-suche");

    const statusFilter =
        document.getElementById("kalender-status-filter");

    const sortSelect =
        document.getElementById("kalender-sortierung");

    const noResults =
        document.getElementById("keine-rennen");

    let alleRennen = [];

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
        const number = Number(value);

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
            const date = new Date(
                `${text}T00:00:00`
            );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }

        const germanMatch =
            text.match(
                /^(\d{2})\.(\d{2})\.(\d{4})$/
            );

        if (germanMatch) {
            const date = new Date(
                Number(germanMatch[3]),
                Number(germanMatch[2]) - 1,
                Number(germanMatch[1])
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
                "Datum noch offen"
            );
        }

        return new Intl.DateTimeFormat(
            "de-DE",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        ).format(date);
    }

    function formatShortDate(value) {
        const date =
            parseDate(value);

        if (!date) {
            return (
                String(value ?? "").trim() ||
                "–"
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

    function getRaceStatus(race) {
        const explicitStatus =
            normalizeText(
                race?.status
            );

        if (
            explicitStatus ===
                "abgeschlossen" ||
            race?.abgeschlossen === true
        ) {
            return "abgeschlossen";
        }

        if (
            explicitStatus === "aktuell" ||
            race?.aktuell === true
        ) {
            return "aktuell";
        }

        if (
            explicitStatus === "nachster" ||
            explicitStatus === "nächster" ||
            race?.naechster === true
        ) {
            return "nächster";
        }

        return "bevorstehend";
    }

    function getStatusLabel(status) {
        const labels = {
            abgeschlossen:
                "Abgeschlossen",

            aktuell:
                "Aktueller Lauf",

            "nächster":
                "Nächster Lauf",

            bevorstehend:
                "Bevorstehend"
        };

        return (
            labels[status] ||
            "Bevorstehend"
        );
    }

    function getStatusIcon(status) {
        const icons = {
            abgeschlossen: "✓",
            aktuell: "●",
            "nächster": "→",
            bevorstehend: "○"
        };

        return (
            icons[status] ||
            "○"
        );
    }

    function getSearchText(race) {
        const status =
            getRaceStatus(race);

        return normalizeText(
            [
                race?.laufnummer,
                race?.strecke,
                race?.datum,
                formatDate(race?.datum),
                getStatusLabel(status)
            ].join(" ")
        );
    }

    function getDaysUntil(value) {
        const raceDate =
            parseDate(value);

        if (!raceDate) {
            return null;
        }

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        raceDate.setHours(
            0,
            0,
            0,
            0
        );

        const difference =
            raceDate.getTime() -
            today.getTime();

        return Math.ceil(
            difference /
            86400000
        );
    }

    function getCountdownText(race) {
        const status =
            getRaceStatus(race);

        if (
            status ===
            "abgeschlossen"
        ) {
            return "Rennen beendet";
        }

        if (
            status ===
            "aktuell"
        ) {
            return "Rennwochenende läuft";
        }

        const days =
            getDaysUntil(
                race?.datum
            );

        if (days === null) {
            return "Termin offen";
        }

        if (days === 0) {
            return "Heute";
        }

        if (days === 1) {
            return "Morgen";
        }

        if (days > 1) {
            return `Noch ${days} Tage`;
        }

        return "Termin vergangen";
    }

    function createRaceCard(race) {
        const round =
            toNumber(
                race?.laufnummer,
                0
            );

        const track =
            escapeHtml(
                race?.strecke ||
                "Unbekannte Strecke"
            );

        const status =
            getRaceStatus(race);

        const statusLabel =
            getStatusLabel(status);

        const statusIcon =
            getStatusIcon(status);

        const dateLong =
            escapeHtml(
                formatDate(
                    race?.datum
                )
            );

        const dateShort =
            escapeHtml(
                formatShortDate(
                    race?.datum
                )
            );

        const countdown =
            escapeHtml(
                getCountdownText(race)
            );

        return `
            <article
                class="kalender-karte status-${status}"
                data-status="${status}"
            >

                <div class="kalender-karte-kopf">

                    <div class="kalender-laufnummer">

                        <span>
                            Lauf
                        </span>

                        <strong>
                            ${round || "–"}
                        </strong>

                    </div>

                    <span
                        class="kalender-status status-${status}"
                    >
                        <i>
                            ${statusIcon}
                        </i>

                        ${escapeHtml(
                            statusLabel
                        )}
                    </span>

                </div>

                <div class="kalender-strecke">

                    <span class="kalender-serie">
                        GTM Masters Saison 1
                    </span>

                    <h2>
                        ${track}
                    </h2>

                    <p>
                        ${dateLong}
                    </p>

                </div>

                <div class="kalender-details">

                    <div>

                        <span>
                            Datum
                        </span>

                        <strong>
                            ${dateShort}
                        </strong>

                    </div>

                    <div>

                        <span>
                            Status
                        </span>

                        <strong>
                            ${escapeHtml(
                                statusLabel
                            )}
                        </strong>

                    </div>

                    <div>

                        <span>
                            Countdown
                        </span>

                        <strong>
                            ${countdown}
                        </strong>

                    </div>

                </div>

                <button
                    type="button"
                    class="kalender-details-button"
                    data-laufnummer="${round}"
                >
                    Veranstaltungsdetails
                </button>

            </article>
        `;
    }

    function updateStatistics() {
        const completed =
            alleRennen.filter(
                (race) =>
                    getRaceStatus(race) ===
                    "abgeschlossen"
            );

        const remaining =
            alleRennen.filter(
                (race) =>
                    getRaceStatus(race) !==
                    "abgeschlossen"
            );

        const nextRace =
            alleRennen.find(
                (race) =>
                    getRaceStatus(race) ===
                    "nächster"
            ) ||
            alleRennen.find(
                (race) =>
                    getRaceStatus(race) ===
                    "aktuell"
            ) ||
            [...remaining].sort(
                (a, b) => {
                    const firstDate =
                        parseDate(a.datum);

                    const secondDate =
                        parseDate(b.datum);

                    if (
                        !firstDate &&
                        !secondDate
                    ) {
                        return (
                            toNumber(
                                a.laufnummer,
                                0
                            ) -
                            toNumber(
                                b.laufnummer,
                                0
                            )
                        );
                    }

                    if (!firstDate) {
                        return 1;
                    }

                    if (!secondDate) {
                        return -1;
                    }

                    return (
                        firstDate.getTime() -
                        secondDate.getTime()
                    );
                }
            )[0];

        window.GTM.Utils?.setText(
            "kalender-rennen-gesamt",
            alleRennen.length
        );

        window.GTM.Utils?.setText(
            "kalender-abgeschlossen",
            completed.length
        );

        window.GTM.Utils?.setText(
            "kalender-verbleibend",
            remaining.length
        );

        window.GTM.Utils?.setText(
            "kalender-naechster-lauf",
            nextRace?.strecke ||
            "–"
        );
    }

    function sortRaces(entries) {
        const sortValue =
            sortSelect?.value ||
            "laufnummer";

        return [...entries].sort(
            (a, b) => {
                if (
                    sortValue ===
                    "datum"
                ) {
                    const firstDate =
                        parseDate(a.datum);

                    const secondDate =
                        parseDate(b.datum);

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
                        firstDate.getTime() -
                        secondDate.getTime()
                    );
                }

                if (
                    sortValue ===
                    "status"
                ) {
                    const priority = {
                        aktuell: 1,
                        "nächster": 2,
                        bevorstehend: 3,
                        abgeschlossen: 4
                    };

                    return (
                        priority[
                            getRaceStatus(a)
                        ] -
                        priority[
                            getRaceStatus(b)
                        ]
                    );
                }

                if (
                    sortValue ===
                    "strecke"
                ) {
                    return String(
                        a.strecke || ""
                    ).localeCompare(
                        String(
                            b.strecke || ""
                        ),
                        "de",
                        {
                            sensitivity:
                                "base"
                        }
                    );
                }

                return (
                    toNumber(
                        a.laufnummer,
                        0
                    ) -
                    toNumber(
                        b.laufnummer,
                        0
                    )
                );
            }
        );
    }

    function filterRaces() {
        const query =
            normalizeText(
                searchInput?.value
            );

        const selectedStatus =
            String(
                statusFilter?.value ||
                ""
            ).trim();

        const filtered =
            alleRennen.filter(
                (race) => {
                    const matchesSearch =
                        query === "" ||
                        getSearchText(
                            race
                        ).includes(query);

                    const matchesStatus =
                        selectedStatus === "" ||
                        getRaceStatus(
                            race
                        ) ===
                            selectedStatus;

                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );

        renderRaces(
            sortRaces(
                filtered
            )
        );
    }

    function renderRaces(entries) {
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
                .map(createRaceCard)
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
                    Der Rennkalender konnte nicht geladen werden.
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

    async function loadCalendar() {
        try {
            const data =
                await window.GTM.load(
                    "kalender",
                    {
                        forceReload: true
                    }
                );

            if (!Array.isArray(data)) {
                throw new Error(
                    "kalender.json enthält keine gültige Rennliste."
                );
            }

            alleRennen =
                data.filter(
                    (race) =>
                        race &&
                        race.laufnummer &&
                        race.strecke
                );

            updateStatistics();
            filterRaces();
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    searchInput?.addEventListener(
        "input",
        filterRaces
    );

    statusFilter?.addEventListener(
        "change",
        filterRaces
    );

    sortSelect?.addEventListener(
        "change",
        filterRaces
    );

    grid?.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    ".kalender-details-button"
                );

            if (!button) {
                return;
            }

            console.info(
                `Veranstaltungsdetails für Lauf ${button.dataset.laufnummer} werden später ergänzt.`
            );
        }
    );

    await loadCalendar();
});