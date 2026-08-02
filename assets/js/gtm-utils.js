/* ==========================================
   GTM UTILS
   Gemeinsame Hilfsfunktionen für das
   gesamte GTM Control Center
========================================== */

(function () {
    "use strict";

    window.GTM = window.GTM || {};

    const Utils = {
        /**
         * Wandelt einen Wert sicher in Text um und schützt
         * vor unerwünschtem HTML-Code.
         */
        escapeHtml(value) {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        /**
         * Wandelt einen Wert sicher in eine Zahl um.
         */
        toNumber(value, fallback = 0) {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return fallback;
            }

            const normalizedValue =
                typeof value === "string"
                    ? value
                        .replace(/\./g, "")
                        .replace(",", ".")
                        .trim()
                    : value;

            const number = Number(normalizedValue);

            return Number.isFinite(number)
                ? number
                : fallback;
        },

        /**
         * Wandelt einen Wert sicher in eine ganze Zahl um.
         */
        toInteger(value, fallback = 0) {
            const number = this.toNumber(value, fallback);

            return Number.isFinite(number)
                ? Math.trunc(number)
                : fallback;
        },

        /**
         * Formatiert Zahlen für die deutsche Darstellung.
         */
        formatNumber(value, options = {}) {
            const number = this.toNumber(value, 0);

            return new Intl.NumberFormat(
                "de-DE",
                options
            ).format(number);
        },

        /**
         * Formatiert Punkte.
         */
        formatPoints(value) {
            return `${this.formatNumber(value)} Pkt.`;
        },

        /**
         * Formatiert ein Datum in deutscher Schreibweise.
         *
         * Unterstützte Beispiele:
         * 2026-08-02
         * 02.08.2026
         * JavaScript-Date-Objekt
         */
        formatDate(value, fallback = "Datum noch offen") {
            if (!value) {
                return fallback;
            }

            if (value instanceof Date) {
                if (Number.isNaN(value.getTime())) {
                    return fallback;
                }

                return new Intl.DateTimeFormat(
                    "de-DE",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }
                ).format(value);
            }

            const text = String(value).trim();

            const germanDateMatch =
                text.match(
                    /^(\d{2})\.(\d{2})\.(\d{4})$/
                );

            if (germanDateMatch) {
                return text;
            }

            const isoDateMatch =
                text.match(
                    /^(\d{4})-(\d{2})-(\d{2})$/
                );

            if (isoDateMatch) {
                const date = new Date(
                    `${text}T00:00:00`
                );

                if (!Number.isNaN(date.getTime())) {
                    return new Intl.DateTimeFormat(
                        "de-DE",
                        {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                        }
                    ).format(date);
                }
            }

            const parsedDate = new Date(text);

            if (!Number.isNaN(parsedDate.getTime())) {
                return new Intl.DateTimeFormat(
                    "de-DE",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }
                ).format(parsedDate);
            }

            return text || fallback;
        },

        /**
         * Formatiert ein Datum ausführlich.
         * Beispiel: 2. August 2026
         */
        formatLongDate(value, fallback = "Datum noch offen") {
            if (!value) {
                return fallback;
            }

            const text = String(value).trim();

            let date;

            if (
                /^\d{4}-\d{2}-\d{2}$/.test(text)
            ) {
                date = new Date(`${text}T00:00:00`);
            } else {
                date = new Date(text);
            }

            if (Number.isNaN(date.getTime())) {
                return this.formatDate(value, fallback);
            }

            return new Intl.DateTimeFormat(
                "de-DE",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            ).format(date);
        },

        /**
         * Erstellt Initialen aus einem Namen.
         *
         * Fabienne Hopf -> FH
         * Pascal -> PA
         */
        getInitials(name, fallback = "GTM") {
            const words = String(name ?? "")
                .trim()
                .split(/\s+/)
                .filter(Boolean);

            if (words.length === 0) {
                return fallback;
            }

            if (words.length === 1) {
                return words[0]
                    .slice(0, 2)
                    .toUpperCase();
            }

            return (
                words[0].charAt(0) +
                words[words.length - 1].charAt(0)
            ).toUpperCase();
        },

        /**
         * Erzeugt einen durchsuchbaren Kleinbuchstaben-Text.
         */
        createSearchText(...values) {
            return values
                .flat(Infinity)
                .filter(
                    (value) =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                )
                .join(" ")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        },

        /**
         * Normalisiert einen Suchbegriff.
         */
        normalizeSearch(value) {
            return String(value ?? "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        },

        /**
         * Prüft, ob ein Suchtext einen Suchbegriff enthält.
         */
        matchesSearch(searchableText, query) {
            const normalizedQuery =
                this.normalizeSearch(query);

            if (normalizedQuery === "") {
                return true;
            }

            return this.normalizeSearch(
                searchableText
            ).includes(normalizedQuery);
        },

        /**
         * Schreibt Text sicher in ein vorhandenes Element.
         */
        setText(id, value, fallback = "–") {
            const element =
                document.getElementById(id);

            if (!element) {
                return false;
            }

            const hasValue =
                value !== null &&
                value !== undefined &&
                String(value).trim() !== "";

            element.textContent =
                hasValue
                    ? String(value)
                    : fallback;

            return true;
        },

        /**
         * Schreibt HTML in ein vorhandenes Element.
         * Nur mit bereits geprüftem oder selbst erzeugtem HTML verwenden.
         */
        setHtml(id, html) {
            const element =
                document.getElementById(id);

            if (!element) {
                return false;
            }

            element.innerHTML =
                String(html ?? "");

            return true;
        },

        /**
         * Leert ein Element.
         */
        clearElement(id) {
            const element =
                document.getElementById(id);

            if (!element) {
                return false;
            }

            element.innerHTML = "";

            return true;
        },

        /**
         * Entfernt doppelte leere oder ungültige Einträge
         * und sortiert alphabetisch.
         */
        uniqueStrings(values) {
            return [
                ...new Set(
                    values
                        .map(
                            (value) =>
                                String(value ?? "").trim()
                        )
                        .filter(Boolean)
                )
            ].sort(
                (first, second) =>
                    first.localeCompare(
                        second,
                        "de",
                        {
                            sensitivity: "base"
                        }
                    )
            );
        },

        /**
         * Sortiert Datensätze nach einer Zahl.
         */
        sortByNumber(
            entries,
            property,
            direction = "asc"
        ) {
            const multiplier =
                direction === "desc" ? -1 : 1;

            return [...entries].sort(
                (first, second) => {
                    const firstValue =
                        this.toNumber(
                            first?.[property],
                            0
                        );

                    const secondValue =
                        this.toNumber(
                            second?.[property],
                            0
                        );

                    return (
                        firstValue -
                        secondValue
                    ) * multiplier;
                }
            );
        },

        /**
         * Sortiert Datensätze alphabetisch.
         */
        sortByText(
            entries,
            property,
            direction = "asc"
        ) {
            const multiplier =
                direction === "desc" ? -1 : 1;

            return [...entries].sort(
                (first, second) => {
                    const firstValue =
                        String(
                            first?.[property] ?? ""
                        );

                    const secondValue =
                        String(
                            second?.[property] ?? ""
                        );

                    return firstValue.localeCompare(
                        secondValue,
                        "de",
                        {
                            sensitivity: "base"
                        }
                    ) * multiplier;
                }
            );
        },

        /**
         * Berechnet einen Prozentwert zwischen 0 und 100.
         */
        calculatePercentage(
            current,
            total
        ) {
            const currentValue =
                this.toNumber(current, 0);

            const totalValue =
                this.toNumber(total, 0);

            if (totalValue <= 0) {
                return 0;
            }

            return Math.min(
                100,
                Math.max(
                    0,
                    Math.round(
                        currentValue /
                        totalValue *
                        100
                    )
                )
            );
        },

        /**
         * Wandelt verschiedene Wahrheitswerte in true oder false um.
         */
        toBoolean(value) {
            if (typeof value === "boolean") {
                return value;
            }

            const normalized =
                String(value ?? "")
                    .trim()
                    .toLowerCase();

            return [
                "true",
                "1",
                "ja",
                "yes",
                "aktiv",
                "läuft"
            ].includes(normalized);
        },

        /**
         * Erzeugt einen sicheren URL-kompatiblen Text.
         *
         * Beispiel:
         * Rennsteig Racing -> rennsteig-racing
         */
        slugify(value) {
            return String(value ?? "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/ß/g, "ss")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
        },

        /**
         * Zeigt ein Element an.
         */
        show(elementOrId) {
            const element =
                typeof elementOrId === "string"
                    ? document.getElementById(
                        elementOrId
                    )
                    : elementOrId;

            if (!element) {
                return false;
            }

            element.hidden = false;

            return true;
        },

        /**
         * Blendet ein Element aus.
         */
        hide(elementOrId) {
            const element =
                typeof elementOrId === "string"
                    ? document.getElementById(
                        elementOrId
                    )
                    : elementOrId;

            if (!element) {
                return false;
            }

            element.hidden = true;

            return true;
        },

        /**
         * Zeigt eine einheitliche Fehlermeldung
         * innerhalb eines Containers.
         */
        renderError(
            container,
            title,
            message = ""
        ) {
            const element =
                typeof container === "string"
                    ? document.querySelector(container)
                    : container;

            if (!element) {
                return false;
            }

            element.innerHTML = `
                <div class="gtm-data-error">
                    <strong>
                        ${this.escapeHtml(title)}
                    </strong>

                    ${
                        message
                            ? `
                                <p>
                                    ${this.escapeHtml(message)}
                                </p>
                            `
                            : ""
                    }
                </div>
            `;

            element.setAttribute(
                "aria-busy",
                "false"
            );

            return true;
        },

        /**
         * Zeigt eine einheitliche Ladeanzeige.
         */
        renderLoading(
            container,
            message = "Daten werden geladen …"
        ) {
            const element =
                typeof container === "string"
                    ? document.querySelector(container)
                    : container;

            if (!element) {
                return false;
            }

            element.innerHTML = `
                <div class="gtm-data-loading">
                    ${this.escapeHtml(message)}
                </div>
            `;

            element.setAttribute(
                "aria-busy",
                "true"
            );

            return true;
        },
        /**
         * Liefert automatisch den Pfad zum Teamlogo.
         */
        getTeamLogo(teamName) {

            const fallback =
                "assets/images/teams/default.png";

            const fileName =
                this.slugify(teamName);

            if (!fileName) {
                return fallback;
            }

            return `assets/images/teams/${fileName}.png`;
        }
    };

    window.GTM.Utils = Utils;

    console.info(
        "GTM Utils wurden erfolgreich geladen."
    );
})();