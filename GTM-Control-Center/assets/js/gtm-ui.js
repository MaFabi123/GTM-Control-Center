/* ==========================================
   GTM UI ENGINE
   Gemeinsame Darstellung für das
   gesamte GTM Control Center
========================================== */

(function () {
    "use strict";

    window.GTM = window.GTM || {};

    const Utils = window.GTM.Utils;

    if (!Utils) {
        console.error(
            "GTM UI konnte nicht gestartet werden: " +
            "gtm-utils.js wurde nicht geladen."
        );

        return;
    }

    function resolveElement(elementOrSelector) {
        if (!elementOrSelector) {
            return null;
        }

        if (typeof elementOrSelector === "string") {
            return document.querySelector(
                elementOrSelector
            );
        }

        return elementOrSelector;
    }

    function getDriverName(driver) {
        return String(
            driver?.name ??
            driver?.fahrer ??
            driver?.anzeigename ??
            "Unbekannter Fahrer"
        ).trim();
    }

    function getDriverTeam(driver) {
        return String(
            driver?.teamZuordnung ??
            driver?.team ??
            "Kein Team"
        ).trim();
    }

    function getDriverNumber(driver) {
        return Utils.toInteger(
            driver?.nummer ??
            driver?.startnummer,
            0
        );
    }

    function getDriverPoints(driver) {
        return Utils.toNumber(
            driver?.punkte ??
            driver?.wertung,
            0
        );
    }

    function getDriverPosition(driver) {
        return Utils.toInteger(
            driver?.platzierung,
            0
        );
    }

    function getTeamName(team) {
        return String(
            team?.name ??
            team?.team ??
            "Unbekanntes Team"
        ).trim();
    }

    function getTeamPoints(team) {
        return Utils.toNumber(
            team?.punkte,
            0
        );
    }

    function getRaceStatusLabel(status) {
        const normalizedStatus =
            String(status ?? "")
                .trim()
                .toLowerCase();

        const labels = {
            abgeschlossen: "Abgeschlossen",
            aktuell: "Aktuell",
            nächster: "Nächstes Rennen",
            naechster: "Nächstes Rennen",
            bevorstehend: "Bevorstehend"
        };

        return (
            labels[normalizedStatus] ??
            status ??
            "Bevorstehend"
        );
    }

    function createEmptyState(message) {
        return `
            <div class="gtm-empty-state">
                ${Utils.escapeHtml(message)}
            </div>
        `;
    }

    function createDriverCard(driver) {
        const name =
            getDriverName(driver);

        const team =
            getDriverTeam(driver);

        const number =
            getDriverNumber(driver);

        const position =
            getDriverPosition(driver);

        const points =
            getDriverPoints(driver);

        const vehicle =
            String(
                driver?.fahrzeug ??
                "Kein Fahrzeug eingetragen"
            ).trim();

        const fastLap =
            Utils.toNumber(
                driver?.fastLap,
                0
            );

        const vehicleChange =
            Utils.toNumber(
                driver?.fahrzeugwechsel,
                0
            );

        const rating =
            Utils.toNumber(
                driver?.wertung,
                0
            );

        const initials =
            Utils.getInitials(name);

        return `
            <article
                class="fahrer-card"
                data-team="${Utils.escapeHtml(team)}"
                data-search="${Utils.escapeHtml(
                    Utils.createSearchText(
                        position,
                        number,
                        name,
                        team,
                        vehicle,
                        points
                    )
                )}"
            >
                <div class="fahrer-card-number">
                    ${number || "–"}
                </div>

                <div class="fahrer-card-visual">
                    <div class="fahrer-placeholder">
                        ${Utils.escapeHtml(initials)}
                    </div>
                </div>

                <div class="fahrer-card-content">
                    <span class="fahrer-team">
                        ${Utils.escapeHtml(team)}
                    </span>

                    <h2>
                        ${Utils.escapeHtml(name)}
                    </h2>

                    <p class="fahrer-fahrzeug">
                        ${Utils.escapeHtml(vehicle)}
                    </p>

                    <div class="fahrer-stats">
                        <div>
                            <strong>
                                ${position || "–"}
                            </strong>

                            <span>Platz</span>
                        </div>

                        <div>
                            <strong>
                                ${Utils.formatNumber(points)}
                            </strong>

                            <span>Punkte</span>
                        </div>

                        <div>
                            <strong>
                                ${Utils.formatNumber(fastLap)}
                            </strong>

                            <span>Fast Lap</span>
                        </div>
                    </div>

                    <div class="fahrer-stats">
                        <div>
                            <strong>
                                ${number ? `#${number}` : "–"}
                            </strong>

                            <span>Startnummer</span>
                        </div>

                        <div>
                            <strong>
                                ${Utils.formatNumber(vehicleChange)}
                            </strong>

                            <span>Fahrzeugwechsel</span>
                        </div>

                        <div>
                            <strong>
                                ${Utils.formatNumber(rating)}
                            </strong>

                            <span>Wertung</span>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    function createTeamCard(team, index = 0) {
        const name =
            getTeamName(team);

        const points =
            getTeamPoints(team);

        const position =
            Utils.toInteger(
                team?.platzierung,
                index + 1
            );

        const drivers =
            Array.isArray(team?.fahrer)
                ? team.fahrer
                : [];

        const vehicles =
            Array.isArray(team?.fahrzeuge)
                ? team.fahrzeuge
                : [];

        const initials =
            Utils.getInitials(name);

        const driversHtml =
            drivers.length > 0
                ? drivers
                    .map((driver) => {
                        const driverName =
                            getDriverName(driver);

                        const number =
                            getDriverNumber(driver);

                        const driverPoints =
                            getDriverPoints(driver);

                        return `
                            <div class="team-driver">
                                <span>
                                    ${
                                        number
                                            ? `#${number}`
                                            : "–"
                                    }
                                </span>

                                <div>
                                    <strong>
                                        ${Utils.escapeHtml(
                                            driverName
                                        )}
                                    </strong>

                                    <small>
                                        ${Utils.formatPoints(
                                            driverPoints
                                        )}
                                    </small>
                                </div>
                            </div>
                        `;
                    })
                    .join("")
                : `
                    <div class="team-driver">
                        <span>–</span>

                        <div>
                            <strong>
                                Keine Fahrer eingetragen
                            </strong>
                        </div>
                    </div>
                `;

        const vehicleText =
            vehicles.length > 0
                ? vehicles.join(", ")
                : "Kein Fahrzeug eingetragen";

        return `
            <article
                class="team-card"
                data-search="${Utils.escapeHtml(
                    Utils.createSearchText(
                        name,
                        points,
                        vehicles,
                        drivers.map(
                            (driver) =>
                                getDriverName(driver)
                        )
                    )
                )}"
                data-fahrzeug="${Utils.escapeHtml(
                    vehicles.join("|")
                )}"
            >
                <div class="team-card-number">
                    ${String(position).padStart(2, "0")}
                </div>

                <div class="team-card-header">
                    <div class="team-logo-placeholder">
                        ${Utils.escapeHtml(initials)}
                    </div>

                    <div>
                        <span class="team-category">
                            GTM Masters Saison 1
                        </span>

                        <h2>
                            ${Utils.escapeHtml(name)}
                        </h2>

                        <p>
                            ${Utils.escapeHtml(vehicleText)}
                        </p>
                    </div>
                </div>

                <div class="team-drivers">
                    ${driversHtml}
                </div>

                <div class="team-stats">
                    <div>
                        <strong>
                            ${Utils.formatNumber(points)}
                        </strong>

                        <span>Punkte</span>
                    </div>

                    <div>
                        <strong>
                            ${drivers.length}
                        </strong>

                        <span>Fahrer</span>
                    </div>

                    <div>
                        <strong>
                            ${vehicles.length}
                        </strong>

                        <span>Fahrzeuge</span>
                    </div>
                </div>
            </article>
        `;
    }

    function createStartNumberCard(entry) {
        const number =
            Utils.toInteger(
                entry?.nummer,
                0
            );

        const isAssigned =
            String(entry?.status)
                .trim()
                .toLowerCase() === "vergeben";

        const status =
            isAssigned
                ? "vergeben"
                : "frei";

        const driver =
            isAssigned
                ? String(
                    entry?.fahrer ??
                    "Unbekannter Fahrer"
                )
                : "Verfügbar";

        const team =
            isAssigned
                ? String(
                    entry?.team ??
                    "Kein Team"
                )
                : "Diese Nummer ist frei";

        const vehicle =
            isAssigned
                ? String(
                    entry?.fahrzeug ??
                    ""
                )
                : "";

        return `
            <article
                class="startnummer-card ${status}"
                data-nummer="${number}"
                data-status="${status}"
                data-search="${Utils.escapeHtml(
                    Utils.createSearchText(
                        number,
                        status,
                        driver,
                        team,
                        vehicle
                    )
                )}"
            >
                <div class="startnummer-wert">
                    ${number}
                </div>

                <div class="startnummer-status">
                    ${isAssigned ? "Vergeben" : "Frei"}
                </div>

                <div class="startnummer-details">
                    <strong>
                        ${Utils.escapeHtml(driver)}
                    </strong>

                    <span>
                        ${Utils.escapeHtml(team)}
                    </span>

                    ${
                        vehicle
                            ? `
                                <small>
                                    ${Utils.escapeHtml(vehicle)}
                                </small>
                            `
                            : ""
                    }
                </div>
            </article>
        `;
    }

    function createRaceCard(race) {
        const round =
            Utils.toInteger(
                race?.laufnummer,
                0
            );

        const track =
            String(
                race?.strecke ??
                "Unbekannte Strecke"
            );

        const date =
            Utils.formatLongDate(
                race?.datum
            );

        const status =
            String(
                race?.status ??
                "bevorstehend"
            ).toLowerCase();

        const statusLabel =
            getRaceStatusLabel(status);

        let cardClass =
            "race-card-upcoming";

        if (status === "abgeschlossen") {
            cardClass =
                "race-card-completed";
        }

        if (
            status === "aktuell" ||
            status === "nächster" ||
            status === "naechster"
        ) {
            cardClass =
                "race-card-next";
        }

        return `
            <article
                class="race-card ${cardClass}"
                data-status="${Utils.escapeHtml(status)}"
                data-search="${Utils.escapeHtml(
                    Utils.createSearchText(
                        round,
                        track,
                        race?.datum,
                        statusLabel
                    )
                )}"
            >
                <div class="race-round">
                    Round ${String(round).padStart(2, "0")}
                </div>

                <div class="race-status">
                    ${Utils.escapeHtml(statusLabel)}
                </div>

                <div class="race-content">
                    <span class="race-country">
                        GTM Masters Saison 1
                    </span>

                    <h2>
                        ${Utils.escapeHtml(track)}
                    </h2>

                    <p>
                        ${Utils.escapeHtml(date)}
                    </p>

                    <dl class="race-details">
                        <div>
                            <dt>Lauf</dt>
                            <dd>${round}</dd>
                        </div>

                        <div>
                            <dt>Status</dt>
                            <dd>
                                ${Utils.escapeHtml(statusLabel)}
                            </dd>
                        </div>

                        <div>
                            <dt>Datum</dt>
                            <dd>
                                ${Utils.escapeHtml(
                                    Utils.formatDate(
                                        race?.datum
                                    )
                                )}
                            </dd>
                        </div>
                    </dl>
                </div>
            </article>
        `;
    }

    function createRankingRows(drivers) {
        return drivers
            .map((driver, index) => {
                const position =
                    getDriverPosition(driver) ||
                    index + 1;

                const number =
                    getDriverNumber(driver);

                const name =
                    getDriverName(driver);

                const team =
                    getDriverTeam(driver);

                const vehicle =
                    String(
                        driver?.fahrzeug ??
                        "Kein Fahrzeug"
                    );

                const points =
                    getDriverPoints(driver);

                return `
                    <tr>
                        <td>
                            <strong>
                                ${position}
                            </strong>
                        </td>

                        <td>
                            ${number ? `#${number}` : "–"}
                        </td>

                        <td>
                            ${Utils.escapeHtml(name)}
                        </td>

                        <td>
                            ${Utils.escapeHtml(team)}
                        </td>

                        <td>
                            ${Utils.escapeHtml(vehicle)}
                        </td>

                        <td>
                            <strong>
                                ${Utils.formatNumber(points)}
                            </strong>
                        </td>
                    </tr>
                `;
            })
            .join("");
    }

    function renderCollection(
        container,
        entries,
        renderer,
        emptyMessage
    ) {
        const element =
            resolveElement(container);

        if (!element) {
            return false;
        }

        const validEntries =
            Array.isArray(entries)
                ? entries
                : [];

        if (validEntries.length === 0) {
            element.innerHTML =
                createEmptyState(emptyMessage);

            element.setAttribute(
                "aria-busy",
                "false"
            );

            return true;
        }

        element.innerHTML =
            validEntries
                .map(renderer)
                .join("");

        element.setAttribute(
            "aria-busy",
            "false"
        );

        return true;
    }

    const UI = {
        renderDriverCards(
            container,
            drivers
        ) {
            return renderCollection(
                container,
                drivers,
                createDriverCard,
                "Keine Fahrer vorhanden."
            );
        },

        renderTeamCards(
            container,
            teams
        ) {
            return renderCollection(
                container,
                teams,
                createTeamCard,
                "Keine Teams vorhanden."
            );
        },

        renderStartNumberCards(
            container,
            entries
        ) {
            return renderCollection(
                container,
                entries,
                createStartNumberCard,
                "Keine Startnummern vorhanden."
            );
        },

        renderRaceCards(
            container,
            races
        ) {
            return renderCollection(
                container,
                races,
                createRaceCard,
                "Keine Rennen vorhanden."
            );
        },

        renderRanking(
            container,
            drivers
        ) {
            const element =
                resolveElement(container);

            if (!element) {
                return false;
            }

            const entries =
                Array.isArray(drivers)
                    ? drivers
                    : [];

            if (entries.length === 0) {
                element.innerHTML = `
                    <tr>
                        <td colspan="6">
                            Keine Wertungsdaten vorhanden.
                        </td>
                    </tr>
                `;

                return true;
            }

            element.innerHTML =
                createRankingRows(entries);

            return true;
        },

        renderLoading(
            container,
            message
        ) {
            return Utils.renderLoading(
                container,
                message
            );
        },

        renderError(
            container,
            title,
            message
        ) {
            return Utils.renderError(
                container,
                title,
                message
            );
        },

        renderEmpty(
            container,
            message
        ) {
            const element =
                resolveElement(container);

            if (!element) {
                return false;
            }

            element.innerHTML =
                createEmptyState(message);

            return true;
        },

        fillSelect(
            select,
            values,
            defaultLabel = "Alle"
        ) {
            const element =
                resolveElement(select);

            if (!element) {
                return false;
            }

            const uniqueValues =
                Utils.uniqueStrings(values);

            element.innerHTML = "";

            const defaultOption =
                document.createElement("option");

            defaultOption.value = "";
            defaultOption.textContent =
                defaultLabel;

            element.appendChild(
                defaultOption
            );

            uniqueValues.forEach((value) => {
                const option =
                    document.createElement("option");

                option.value = value;
                option.textContent = value;

                element.appendChild(option);
            });

            return true;
        },

        setProgress(
            elementOrSelector,
            current,
            total
        ) {
            const element =
                resolveElement(
                    elementOrSelector
                );

            if (!element) {
                return false;
            }

            const percentage =
                Utils.calculatePercentage(
                    current,
                    total
                );

            element.style.width =
                `${percentage}%`;

            element.setAttribute(
                "aria-valuenow",
                String(percentage)
            );

            return true;
        },

        createDriverCard,
        createTeamCard,
        createStartNumberCard,
        createRaceCard,
        createRankingRows
    };

    window.GTM.UI = UI;

    console.info(
        "GTM UI Engine wurde erfolgreich geladen."
    );
})();