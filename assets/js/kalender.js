/* ==========================================================
   GTM RENNKALENDER
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid = document.getElementById("kalender-grid");
    const searchInput = document.getElementById("kalender-suche");
    const serieFilter = document.getElementById("kalender-serie-filter");
    const saisonFilter = document.getElementById("kalender-saison-filter");
    const statusFilter = document.getElementById("kalender-status-filter");
    const sortSelect = document.getElementById("kalender-sortierung");
    const noResults = document.getElementById("keine-rennen");
    const eyebrow = document.getElementById("kalender-eyebrow");
    const intro = document.getElementById("kalender-intro");
    const slider = document.getElementById("kalender-slider");
    const sliderDots = document.getElementById("kalender-slider-punkte");
    const sliderPrevious = document.getElementById("kalender-slider-zurueck");
    const sliderNext = document.getElementById("kalender-slider-weiter");
    const viewCurrentButton = document.getElementById("kalender-ansicht-aktuell");
    const viewHistoryButton = document.getElementById("kalender-ansicht-historie");
    const viewHint = document.getElementById("kalender-ansicht-hinweis");

    const nextSeasonCard = document.getElementById("kalender-naechste-saison-karte");
    const nextSeasonStatus = document.getElementById("kalender-naechste-saison-status");
    const nextSeasonTitle = document.getElementById("kalender-naechste-saison-titel");
    const nextSeasonHint = document.getElementById("kalender-naechste-saison-hinweis");
    const nextSeasonAction = document.getElementById("kalender-naechste-saison-aktion");

    const taCard = document.getElementById("kalender-ta-karte");
    const taStatus = document.getElementById("kalender-ta-status");
    const taTitle = document.getElementById("kalender-ta-titel");
    const taHint = document.getElementById("kalender-ta-hinweis");
    const taAction = document.getElementById("kalender-ta-aktion");

    const nextTaSeasonCard = document.getElementById("kalender-ta-naechste-saison-karte");
    const nextTaSeasonStatus = document.getElementById("kalender-ta-naechste-saison-status");
    const nextTaSeasonTitle = document.getElementById("kalender-ta-naechste-saison-titel");
    const nextTaSeasonHint = document.getElementById("kalender-ta-naechste-saison-hinweis");
    const nextTaSeasonAction = document.getElementById("kalender-ta-naechste-saison-aktion");

    const funCard = document.getElementById("kalender-fun-karte");
    const funStatus = document.getElementById("kalender-fun-status");
    const funTitle = document.getElementById("kalender-fun-titel");
    const funHint = document.getElementById("kalender-fun-hinweis");
    const funAction = document.getElementById("kalender-fun-aktion");

    let alleRennen = [];
    let sliderRennen = [];
    let sliderIndex = 0;
    let sliderTimer = null;
    let kalenderAnsicht = "aktuell";

    const trackAssets = {
        barcelona: {
            photo: "barcelona.jpg",
            layout: "barcelona-layout.png"
        },
        bathurst: {
            photo: "bathurst.jpg",
            layout: "bathurst-layout.png"
        },
        brandshatch: {
            photo: "brandshatch.jpg",
            layout: "brandshatch-layout.png"
        },
        cota: {
            photo: "cota.webp",
            layout: "cota-layout.png"
        },
        doningtonpark: {
            photo: "doningtonpark.jpg",
            layout: "doningtonpark-layout.png"
        },
        hungaroring: {
            photo: "hungaroring.jpg",
            layout: "hungaroring-layout.png"
        },
        imola: {
            photo: "imola.jpg",
            layout: "imola-layout.png"
        },
        indianapolis: {
            photo: "Indianapolis.jpg",
            layout: "indianapolis-layout.png"
        },
        kyalami: {
            photo: "kyalami.jpg",
            layout: "kyalami-layout.png"
        },
        lagunaseca: {
            photo: "lagunaseca.jpg",
            layout: "lagunaseca-layout.png"
        },
        misano: {
            photo: "misano.jpg",
            layout: "misano-layout.png"
        },
        monza: {
            photo: "monza.jpg",
            layout: "monza-layout.png"
        },
        nurburgring24h: {
            photo: "nuerburgring24h.jpg",
            layout: "nuerburgring24h-layout.webp"
        },
        nurburgringgp: {
            photo: "nuerburgringgp.jpg",
            layout: "nuerburgringgp-layout.png"
        },
        oultonpark: {
            photo: "oultonpark.png",
            layout: "oultonpark-layout.png"
        },
        paulricard: {
            photo: "paulricard.jpg",
            layout: "paulricard-layout.png"
        },
        redbullring: {
            photo: "redbullring.jpg",
            layout: "redbullring-layout.png"
        },
        silverstone: {
            photo: "silverstone.jpg",
            layout: "silverstone-layout.png"
        },
        snetterton: {
            photo: "snetterton.jpg",
            layout: "snetterton-layout.png"
        },
        spa: {
            photo: "spa.jpg",
            layout: "spa-layout.png"
        },
        suzuka: {
            photo: "suzuka.jpg",
            layout: "suzuka-layout.png"
        },
        valencia: {
            photo: "valencia.jpg",
            layout: "valencia-layout.png"
        },
        watkinsglen: {
            photo: "watkinsglen.jpg",
            layout: "watkinsglen-layout.png"
        },
        zandvoort: {
            photo: "zandvoort.jpeg",
            layout: "zandvoort-layout.png"
        },
        zolder: {
            photo: "zolder.jpg",
            layout: "zolder-layout.png"
        }
    };

    const trackAliases = {
        circuitdebarcelonacatalunya: "barcelona",
        barcelonacatalunya: "barcelona",
        catalunya: "barcelona",
        brandshatchcircuit: "brandshatch",
        circuitoftheamericas: "cota",
        donington: "doningtonpark",
        indianapolismotorspeedway: "indianapolis",
        mountpanorama: "bathurst",
        circuitpaulricard: "paulricard",
        paulrichard: "paulricard",
        redbullringaustria: "redbullring",
        spafrancorchamps: "spa",
        circuitdespafrancorchamps: "spa",
        watkinsgleninternational: "watkinsglen",
        nurburgring: "nurburgringgp",
        nurburgringgrandprix: "nurburgringgp",
        nurburgringgpstrecke: "nurburgringgp",
        nurburgring24stunden: "nurburgring24h",
        nordschleife: "nurburgring24h"
    };

    if (!window.GTM || typeof window.GTM.load !== "function") {
        showError("Die GTM Data Engine wurde nicht geladen.");
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

    function normalizeTrackKey(value) {
        const key = normalizeText(value).replace(/[^a-z0-9]/g, "");
        return trackAliases[key] || key;
    }

    function toNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function isTrue(value) {
        if (value === true) {
            return true;
        }

        return ["true", "ja", "1", "x"].includes(normalizeText(value));
    }

    function getSerieId(race) {
        return normalizeText(race?.serieId || race?.modul || "masters") || "masters";
    }

    function getSerieName(race) {
        if (race?.serie) {
            return String(race.serie);
        }

        const labels = {
            masters: "GTM Masters",
            ta: "GTM Time Attack",
            fun: "GTM FUN Events"
        };

        return labels[getSerieId(race)] || "GTM Rennserie";
    }

    function getSeasonNumber(race) {
        return toNumber(race?.saison, 1);
    }

    function getSeasonId(race) {
        return String(race?.saisonId || `${getSerieId(race)}-s${getSeasonNumber(race)}`);
    }

    function getSeasonName(race) {
        return String(race?.saisonName || `${getSerieName(race)} Saison ${getSeasonNumber(race)}`);
    }

    function getTrackMedia(race) {
        return trackAssets[normalizeTrackKey(race?.strecke)] || null;
    }

    function parseDate(value) {
        if (!value) {
            return null;
        }

        const text = String(value).trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            const date = new Date(`${text}T00:00:00`);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        const germanMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

        if (germanMatch) {
            const date = new Date(
                Number(germanMatch[3]),
                Number(germanMatch[2]) - 1,
                Number(germanMatch[1])
            );

            return Number.isNaN(date.getTime()) ? null : date;
        }

        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
        const date = parseDate(value);

        if (!date) {
            return String(value ?? "").trim() || "Datum noch offen";
        }

        return new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(date);
    }

    function formatShortDate(value) {
        const date = parseDate(value);

        if (!date) {
            return String(value ?? "").trim() || "–";
        }

        return new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);
    }

    function formatRaceDateLong(race) {
        const startDate = parseDate(race?.datum);
        const endDate = parseDate(race?.datumBis);

        if (!startDate || !endDate) {
            return formatDate(race?.datum);
        }

        const sameYear = startDate.getFullYear() === endDate.getFullYear();
        const startText = new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "long",
            year: sameYear ? undefined : "numeric"
        }).format(startDate);
        const endText = new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(endDate);

        return `${startText} – ${endText}`;
    }

    function formatRaceDateShort(race) {
        const startDate = parseDate(race?.datum);
        const endDate = parseDate(race?.datumBis);

        if (!startDate || !endDate) {
            return formatShortDate(race?.datum);
        }

        const formatter = new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit"
        });

        return `${formatter.format(startDate)}–${formatter.format(endDate)}`;
    }

    function getRaceStatus(race) {
        const explicitStatus = normalizeText(race?.status);

        if (explicitStatus === "abgeschlossen" || isTrue(race?.abgeschlossen)) {
            return "abgeschlossen";
        }

        if (explicitStatus === "aktuell" || isTrue(race?.aktuell)) {
            return "aktuell";
        }

        if (explicitStatus === "nachster" || isTrue(race?.naechster)) {
            return "nächster";
        }

        return "bevorstehend";
    }

    function getCompletedSeasonIds() {
        const seasons = new Map();

        alleRennen
            .filter((race) => ["masters", "ta"].includes(getSerieId(race)))
            .forEach((race) => {
                const seasonId = getSeasonId(race);

                if (!seasons.has(seasonId)) {
                    seasons.set(seasonId, []);
                }

                seasons.get(seasonId).push(race);
            });

        return new Set(
            [...seasons.entries()]
                .filter(([, entries]) => {
                    return (
                        entries.length > 0 &&
                        entries.every((race) => getRaceStatus(race) === "abgeschlossen")
                    );
                })
                .map(([seasonId]) => seasonId)
        );
    }

    function matchesCalendarView(race, completedSeasonIds) {
        const serieId = getSerieId(race);
        const isCompleted = getRaceStatus(race) === "abgeschlossen";

        if (kalenderAnsicht === "historie") {
            if (serieId === "fun") {
                return isCompleted;
            }

            if (serieId === "masters" || serieId === "ta") {
                return completedSeasonIds.has(getSeasonId(race));
            }

            return isCompleted;
        }

        if (serieId === "fun") {
            return !isCompleted;
        }

        if (serieId === "masters" || serieId === "ta") {
            return !completedSeasonIds.has(getSeasonId(race));
        }

        return !isCompleted;
    }

    function getStatusLabel(status) {
        const labels = {
            abgeschlossen: "Abgeschlossen",
            aktuell: "Aktueller Termin",
            "nächster": "Nächster Termin",
            bevorstehend: "Bevorstehend"
        };

        return labels[status] || "Bevorstehend";
    }

    function getStatusIcon(status) {
        const icons = {
            abgeschlossen: "✓",
            aktuell: "●",
            "nächster": "→",
            bevorstehend: "○"
        };

        return icons[status] || "○";
    }

    function getSearchText(race) {
        const status = getRaceStatus(race);

        return normalizeText([
            race?.laufnummer,
            race?.strecke,
            race?.datum,
            race?.datumBis,
            race?.zeitraum,
            formatDate(race?.datum),
            getSerieName(race),
            getSeasonName(race),
            getStatusLabel(status)
        ].join(" "));
    }

    function getDaysUntil(value) {
        const raceDate = parseDate(value);

        if (!raceDate) {
            return null;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        raceDate.setHours(0, 0, 0, 0);

        return Math.ceil((raceDate.getTime() - today.getTime()) / 86400000);
    }

    function getCountdownText(race) {
        const status = getRaceStatus(race);

        if (status === "abgeschlossen") {
            return "Termin beendet";
        }

        if (status === "aktuell") {
            return getSerieId(race) === "ta" ? "Time Attack läuft" : "Rennwochenende läuft";
        }

        const days = getDaysUntil(race?.datum);

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

    function createTrackMedia(race) {
        const media = getTrackMedia(race);

        if (!media) {
            return "";
        }

        const track = escapeHtml(race?.strecke || "Strecke");
        const photoPath = escapeHtml(`assets/images/strecken/bilder/${media.photo}`);
        const layoutPath = escapeHtml(`assets/images/strecken/layouts/${media.layout}`);

        return `
            <div class="kalender-streckenmedium">
                <img
                    class="kalender-streckenfoto"
                    src="${photoPath}"
                    alt="Charakteristische Ansicht: ${track}"
                    loading="lazy"
                >

                <span class="kalender-streckenverlauf"></span>

                <img
                    class="kalender-streckenlayout"
                    src="${layoutPath}"
                    alt="Streckenlayout: ${track}"
                    loading="lazy"
                >
            </div>
        `;
    }

    function createRaceCard(race) {
        const round = toNumber(race?.laufnummer, 0);
        const track = escapeHtml(race?.strecke || "Unbekannte Strecke");
        const status = getRaceStatus(race);
        const statusLabel = getStatusLabel(status);
        const statusIcon = getStatusIcon(status);
        const dateLong = escapeHtml(formatRaceDateLong(race));
        const dateShort = escapeHtml(formatRaceDateShort(race));
        const countdown = escapeHtml(getCountdownText(race));
        const seasonName = escapeHtml(getSeasonName(race));
        const serieId = escapeHtml(getSerieId(race));
        const terminId = escapeHtml(race?.id || `${getSeasonId(race)}-lauf-${round}`);
        const entryLabel = getSerieId(race) === "fun"
            ? "Event"
            : getSerieId(race) === "ta"
                ? "Termin"
                : "Lauf";
        const detailsLabel = getSerieId(race) === "fun"
            ? "Eventdetails"
            : "Veranstaltungsdetails";

        return `
            <article
                class="kalender-karte status-${status} serie-${serieId}"
                data-status="${status}"
                data-serie-id="${serieId}"
                data-saison-id="${escapeHtml(getSeasonId(race))}"
            >
                <div class="kalender-karte-kopf">
                    <div class="kalender-laufnummer">
                        <span>${entryLabel}</span>
                        <strong>${round || "–"}</strong>
                    </div>

                    <span class="kalender-status status-${status}">
                        <i>${statusIcon}</i>
                        ${escapeHtml(statusLabel)}
                    </span>
                </div>

                ${createTrackMedia(race)}

                <div class="kalender-strecke">
                    <span class="kalender-serie">${seasonName}</span>
                    <h2>${track}</h2>
                    <p>${dateLong}</p>
                </div>

                <div class="kalender-details">
                    <div>
                        <span>Datum</span>
                        <strong>${dateShort}</strong>
                    </div>

                    <div>
                        <span>Status</span>
                        <strong>${escapeHtml(statusLabel)}</strong>
                    </div>

                    <div>
                        <span>Countdown</span>
                        <strong>${countdown}</strong>
                    </div>
                </div>

                <button
                    type="button"
                    class="kalender-details-button"
                    data-termin-id="${terminId}"
                >
                    ${detailsLabel}
                </button>
            </article>
        `;
    }

    function compareText(a, b) {
        return String(a || "").localeCompare(String(b || ""), "de", {
            sensitivity: "base"
        });
    }

    function getSeriesOrder(serieId) {
        const order = {
            masters: 1,
            ta: 2,
            fun: 3
        };

        return order[serieId] || 99;
    }

    function compareDates(a, b) {
        const firstDate = parseDate(a);
        const secondDate = parseDate(b);

        if (!firstDate && !secondDate) {
            return 0;
        }

        if (!firstDate) {
            return 1;
        }

        if (!secondDate) {
            return -1;
        }

        return firstDate.getTime() - secondDate.getTime();
    }

    function sortRaces(entries) {
        const sortValue = sortSelect?.value || "laufnummer";

        return [...entries].sort((a, b) => {
            if (sortValue === "datum") {
                return compareDates(a?.datum, b?.datum);
            }

            if (sortValue === "serie") {
                return (
                    getSeriesOrder(getSerieId(a)) - getSeriesOrder(getSerieId(b)) ||
                    compareText(getSerieName(a), getSerieName(b)) ||
                    getSeasonNumber(a) - getSeasonNumber(b) ||
                    toNumber(a?.laufnummer) - toNumber(b?.laufnummer)
                );
            }

            if (sortValue === "saison") {
                return (
                    getSeasonNumber(a) - getSeasonNumber(b) ||
                    compareText(getSerieName(a), getSerieName(b)) ||
                    toNumber(a?.laufnummer) - toNumber(b?.laufnummer)
                );
            }

            if (sortValue === "status") {
                const priority = {
                    aktuell: 1,
                    "nächster": 2,
                    bevorstehend: 3,
                    abgeschlossen: 4
                };

                return (
                    priority[getRaceStatus(a)] - priority[getRaceStatus(b)] ||
                    compareDates(a?.datum, b?.datum)
                );
            }

            if (sortValue === "strecke") {
                return compareText(a?.strecke, b?.strecke);
            }

            return (
                getSeriesOrder(getSerieId(a)) - getSeriesOrder(getSerieId(b)) ||
                compareText(getSerieId(a), getSerieId(b)) ||
                getSeasonNumber(a) - getSeasonNumber(b) ||
                toNumber(a?.laufnummer) - toNumber(b?.laufnummer)
            );
        });
    }

    function getSliderRaces() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const statusPriority = {
            aktuell: 1,
            "nächster": 2,
            bevorstehend: 3
        };

        return ["masters", "ta", "fun"]
            .map((serieId) => {
                return alleRennen
                    .filter((race) => {
                        if (getSerieId(race) !== serieId) {
                            return false;
                        }

                        const status = getRaceStatus(race);

                        if (status === "abgeschlossen") {
                            return false;
                        }

                        if (status === "aktuell" || status === "nächster") {
                            return true;
                        }

                        const endDate = parseDate(race?.datumBis || race?.datum);

                        if (!endDate) {
                            return false;
                        }

                        endDate.setHours(0, 0, 0, 0);
                        return endDate.getTime() >= today.getTime();
                    })
                    .sort((a, b) => {
                        return (
                            (statusPriority[getRaceStatus(a)] || 9) -
                                (statusPriority[getRaceStatus(b)] || 9) ||
                            compareDates(a?.datum, b?.datum)
                        );
                    })[0];
            })
            .filter(Boolean)
            .sort((a, b) => compareDates(a?.datum, b?.datum));
    }

    function createSliderSlide(race, index) {
        const media = getTrackMedia(race);
        const serieId = escapeHtml(getSerieId(race));
        const serieName = escapeHtml(getSerieName(race));
        const seasonName = escapeHtml(getSeasonName(race));
        const track = escapeHtml(race?.strecke || "Strecke noch offen");
        const date = escapeHtml(formatRaceDateLong(race));
        const countdown = escapeHtml(getCountdownText(race));
        const status = getRaceStatus(race);
        const statusLabel = escapeHtml(getStatusLabel(status));
        const activeClass = index === 0 ? " ist-aktiv" : "";
        const ariaHidden = index === 0 ? "false" : "true";
        const lead = getSerieId(race) === "fun"
            ? "Nächstes FUN Event"
            : getSerieId(race) === "ta"
                ? "Nächster Time-Attack-Termin"
                : "Nächstes Masters-Rennen";

        const mediaHtml = media
            ? `
                <img
                    class="kalender-slider-foto"
                    src="assets/images/strecken/bilder/${escapeHtml(media.photo)}"
                    alt="Charakteristische Ansicht: ${track}"
                >

                <img
                    class="kalender-slider-layout"
                    src="assets/images/strecken/layouts/${escapeHtml(media.layout)}"
                    alt="Streckenlayout: ${track}"
                >
            `
            : `
                <div class="kalender-slider-ohne-bild" aria-hidden="true">
                    GTM
                </div>
            `;

        return `
            <article
                class="kalender-slider-karte serie-${serieId}${activeClass}"
                data-slider-index="${index}"
                role="group"
                aria-roledescription="Folie"
                aria-label="${index + 1} von ${sliderRennen.length}: ${track}"
                aria-hidden="${ariaHidden}"
            >
                <div class="kalender-slider-inhalt">
                    <span class="kalender-slider-serie">${serieName}</span>
                    <span>${escapeHtml(lead)}</span>
                    <h3>${track}</h3>
                    <p class="kalender-slider-datum">${date}</p>

                    <div class="kalender-slider-meta">
                        <span>${seasonName}</span>
                        <span>${statusLabel}</span>
                        <span>${countdown}</span>
                    </div>

                    <button
                        class="kalender-slider-aktion"
                        type="button"
                        data-slider-serie-id="${serieId}"
                        data-slider-saison-id="${escapeHtml(getSeasonId(race))}"
                    >
                        Kalender anzeigen
                    </button>
                </div>

                <div class="kalender-slider-bild">
                    ${mediaHtml}
                </div>
            </article>
        `;
    }

    function showSliderSlide(index, restartTimer = true) {
        if (sliderRennen.length === 0) {
            return;
        }

        sliderIndex = (index + sliderRennen.length) % sliderRennen.length;

        slider?.querySelectorAll(".kalender-slider-karte").forEach((slide, slideIndex) => {
            const isActive = slideIndex === sliderIndex;
            slide.classList.toggle("ist-aktiv", isActive);
            slide.setAttribute("aria-hidden", String(!isActive));
        });

        sliderDots?.querySelectorAll("button").forEach((dot, dotIndex) => {
            const isActive = dotIndex === sliderIndex;
            dot.classList.toggle("ist-aktiv", isActive);
            dot.setAttribute("aria-current", isActive ? "true" : "false");
        });

        if (restartTimer) {
            startSliderTimer();
        }
    }

    function stopSliderTimer() {
        if (sliderTimer !== null) {
            window.clearInterval(sliderTimer);
            sliderTimer = null;
        }
    }

    function startSliderTimer() {
        stopSliderTimer();

        if (sliderRennen.length <= 1 || document.hidden) {
            return;
        }

        sliderTimer = window.setInterval(() => {
            showSliderSlide(sliderIndex + 1, false);
        }, 7500);
    }

    function renderSlider() {
        if (!slider) {
            return;
        }

        sliderRennen = getSliderRaces();
        sliderIndex = 0;

        if (sliderRennen.length === 0) {
            slider.innerHTML = `
                <div class="kalender-slider-leer">
                    Momentan ist noch kein weiterer Renntermin eingetragen.
                </div>
            `;

            if (sliderDots) {
                sliderDots.innerHTML = "";
            }

            if (sliderPrevious) {
                sliderPrevious.disabled = true;
            }

            if (sliderNext) {
                sliderNext.disabled = true;
            }

            stopSliderTimer();
            return;
        }

        slider.innerHTML = sliderRennen.map(createSliderSlide).join("");

        if (sliderDots) {
            sliderDots.innerHTML = sliderRennen.map((race, index) => {
                const activeClass = index === 0 ? " class=\"ist-aktiv\"" : "";
                const current = index === 0 ? "true" : "false";

                return `
                    <button
                        type="button"
                        data-slider-punkt="${index}"
                        aria-label="${escapeHtml(getSerieName(race))}: ${escapeHtml(race?.strecke)} anzeigen"
                        aria-current="${current}"
                        ${activeClass}
                    ></button>
                `;
            }).join("");
        }

        const hasMultipleSlides = sliderRennen.length > 1;

        if (sliderPrevious) {
            sliderPrevious.disabled = !hasMultipleSlides;
        }

        if (sliderNext) {
            sliderNext.disabled = !hasMultipleSlides;
        }

        startSliderTimer();
    }

    function getSeries() {
        const series = new Map();

        alleRennen.forEach((race) => {
            series.set(getSerieId(race), getSerieName(race));
        });

        return [...series.entries()]
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => {
                return getSeriesOrder(a.id) - getSeriesOrder(b.id) || compareText(a.name, b.name);
            });
    }

    function getSeasons(serieId = "") {
        const seasons = new Map();

        alleRennen
            .filter((race) => !serieId || getSerieId(race) === serieId)
            .forEach((race) => {
                seasons.set(getSeasonId(race), {
                    id: getSeasonId(race),
                    serieId: getSerieId(race),
                    serieName: getSerieName(race),
                    number: getSeasonNumber(race),
                    name: getSeasonName(race)
                });
            });

        return [...seasons.values()].sort((a, b) => {
            return compareText(a.serieName, b.serieName) || a.number - b.number;
        });
    }

    function populateSeriesFilter(selectedValue = "") {
        if (!serieFilter) {
            return;
        }

        serieFilter.innerHTML = [
            '<option value="">Alle Serien</option>',
            ...getSeries().map((serie) => {
                return `<option value="${escapeHtml(serie.id)}">${escapeHtml(serie.name)}</option>`;
            })
        ].join("");

        serieFilter.value = getSeries().some((serie) => serie.id === selectedValue)
            ? selectedValue
            : "";
    }

    function populateSeasonFilter(selectedValue = "") {
        if (!saisonFilter) {
            return;
        }

        const selectedSerie = String(serieFilter?.value || "");
        const seasons = getSeasons(selectedSerie);

        saisonFilter.innerHTML = [
            '<option value="">Alle Saisons</option>',
            ...seasons.map((season) => {
                const label = selectedSerie
                    ? `Saison ${season.number}`
                    : season.name;

                return `<option value="${escapeHtml(season.id)}">${escapeHtml(label)}</option>`;
            })
        ].join("");

        saisonFilter.value = seasons.some((season) => season.id === selectedValue)
            ? selectedValue
            : "";
    }

    function getDefaultRace(serieId = "") {
        const entries = alleRennen.filter((race) => !serieId || getSerieId(race) === serieId);

        return (
            entries.find((race) => getRaceStatus(race) === "aktuell") ||
            entries.find((race) => getRaceStatus(race) === "nächster") ||
            [...entries].sort((a, b) => {
                return getSeasonNumber(b) - getSeasonNumber(a) || compareDates(a?.datum, b?.datum);
            })[0] ||
            null
        );
    }

    function selectInitialCalendar() {
        populateSeriesFilter("");
        populateSeasonFilter("");
    }

    function setPreviewState(card, elements, state) {
        if (!card) {
            return;
        }

        card.disabled = !state.available;
        card.classList.toggle("ist-gesperrt", !state.available);
        card.classList.toggle("ist-verfuegbar", state.available);
        card.dataset.targetSerieId = state.serieId || "";
        card.dataset.targetSaisonId = state.saisonId || "";

        if (elements.status) {
            elements.status.textContent = state.status;
        }

        if (elements.title) {
            elements.title.textContent = state.title;
        }

        if (elements.hint) {
            elements.hint.textContent = state.hint;
        }

        if (elements.action) {
            elements.action.textContent = state.action;
        }
    }

    function updatePreviewCards() {
        const mastersSeasons = getSeasons("masters");
        const selectedSeasonId = String(saisonFilter?.value || "");
        const selectedMastersSeason = mastersSeasons.find((season) => season.id === selectedSeasonId);
        const currentMastersRace = getDefaultRace("masters");
        const currentMastersNumber = selectedMastersSeason?.number ||
            (currentMastersRace ? getSeasonNumber(currentMastersRace) : 0);
        const nextMastersSeason = mastersSeasons.find((season) => season.number > currentMastersNumber);

        if (nextMastersSeason) {
            const count = alleRennen.filter((race) => getSeasonId(race) === nextMastersSeason.id).length;

            setPreviewState(
                nextSeasonCard,
                {
                    status: nextSeasonStatus,
                    title: nextSeasonTitle,
                    hint: nextSeasonHint,
                    action: nextSeasonAction
                },
                {
                    available: true,
                    serieId: "masters",
                    saisonId: nextMastersSeason.id,
                    status: "Kalender verfügbar",
                    title: nextMastersSeason.name,
                    hint: `${count} ${count === 1 ? "Termin ist" : "Termine sind"} bereits eingetragen.`,
                    action: "Saison anzeigen"
                }
            );
        } else {
            const nextNumber = currentMastersNumber > 0 ? currentMastersNumber + 1 : 1;

            setPreviewState(
                nextSeasonCard,
                {
                    status: nextSeasonStatus,
                    title: nextSeasonTitle,
                    hint: nextSeasonHint,
                    action: nextSeasonAction
                },
                {
                    available: false,
                    serieId: "masters",
                    saisonId: "",
                    status: "In Vorbereitung",
                    title: `GTM Masters Saison ${nextNumber}`,
                    hint: "Der neue Rennkalender erscheint hier, sobald erste Termine feststehen.",
                    action: "Noch nicht verfügbar"
                }
            );
        }

        const taSeasons = getSeasons("ta");
        const defaultTaRace = getDefaultRace("ta");
        const targetTaSeason = defaultTaRace
            ? taSeasons.find((season) => season.id === getSeasonId(defaultTaRace))
            : null;

        if (targetTaSeason) {
            const count = alleRennen.filter((race) => getSeasonId(race) === targetTaSeason.id).length;

            setPreviewState(
                taCard,
                {
                    status: taStatus,
                    title: taTitle,
                    hint: taHint,
                    action: taAction
                },
                {
                    available: true,
                    serieId: "ta",
                    saisonId: targetTaSeason.id,
                    status: "Kalender verfügbar",
                    title: targetTaSeason.name,
                    hint: `${count} ${count === 1 ? "Termin ist" : "Termine sind"} bereits eingetragen.`,
                    action: "Time Attack anzeigen"
                }
            );
        } else {
            setPreviewState(
                taCard,
                {
                    status: taStatus,
                    title: taTitle,
                    hint: taHint,
                    action: taAction
                },
                {
                    available: false,
                    serieId: "ta",
                    saisonId: "",
                    status: "In Vorbereitung",
                    title: "GTM Time Attack Saison 2026",
                    hint: "Der Time-Attack-Bereich wird freigeschaltet, sobald Termine vorhanden sind.",
                    action: "Noch nicht verfügbar"
                }
            );
        }

        const nextTaSeason = targetTaSeason
            ? taSeasons.find((season) => season.number > targetTaSeason.number)
            : null;

        if (nextTaSeason) {
            const count = alleRennen.filter((race) => getSeasonId(race) === nextTaSeason.id).length;

            setPreviewState(
                nextTaSeasonCard,
                {
                    status: nextTaSeasonStatus,
                    title: nextTaSeasonTitle,
                    hint: nextTaSeasonHint,
                    action: nextTaSeasonAction
                },
                {
                    available: true,
                    serieId: "ta",
                    saisonId: nextTaSeason.id,
                    status: "Kalender verfügbar",
                    title: nextTaSeason.name,
                    hint: `${count} ${count === 1 ? "Termin ist" : "Termine sind"} bereits eingetragen.`,
                    action: "TA-Saison anzeigen"
                }
            );
        } else {
            const nextTaNumber = targetTaSeason ? targetTaSeason.number + 1 : 2027;

            setPreviewState(
                nextTaSeasonCard,
                {
                    status: nextTaSeasonStatus,
                    title: nextTaSeasonTitle,
                    hint: nextTaSeasonHint,
                    action: nextTaSeasonAction
                },
                {
                    available: false,
                    serieId: "ta",
                    saisonId: "",
                    status: "In Vorbereitung",
                    title: `GTM Time Attack Saison ${nextTaNumber}`,
                    hint: "Weitere Time-Attack-Saisons erscheinen hier, sobald erste Termine feststehen.",
                    action: "Noch nicht verfügbar"
                }
            );
        }

        const funSeasons = getSeasons("fun");
        const availableFunRaces = alleRennen.filter((race) => {
            return (
                getSerieId(race) === "fun" &&
                getRaceStatus(race) !== "abgeschlossen"
            );
        });
        const defaultFunRace =
            availableFunRaces.find((race) => getRaceStatus(race) === "aktuell") ||
            availableFunRaces.find((race) => getRaceStatus(race) === "nächster") ||
            [...availableFunRaces].sort((a, b) => compareDates(a?.datum, b?.datum))[0] ||
            null;
        const targetFunSeason = defaultFunRace
            ? funSeasons.find((season) => season.id === getSeasonId(defaultFunRace))
            : null;

        if (targetFunSeason) {
            const count = availableFunRaces.filter((race) => {
                return getSeasonId(race) === targetFunSeason.id;
            }).length;

            setPreviewState(
                funCard,
                {
                    status: funStatus,
                    title: funTitle,
                    hint: funHint,
                    action: funAction
                },
                {
                    available: true,
                    serieId: "fun",
                    saisonId: targetFunSeason.id,
                    status: "Events verfügbar",
                    title: targetFunSeason.name,
                    hint: `${count} ${count === 1 ? "FUN Event ist" : "FUN Events sind"} aktuell oder bevorstehend.`,
                    action: "FUN Events anzeigen"
                }
            );
        } else {
            setPreviewState(
                funCard,
                {
                    status: funStatus,
                    title: funTitle,
                    hint: funHint,
                    action: funAction
                },
                {
                    available: false,
                    serieId: "fun",
                    saisonId: "",
                    status: "In Vorbereitung",
                    title: "GTM FUN Events",
                    hint: "Neue FUN Events erscheinen hier automatisch, sobald ein konkreter Excel-Eventreiter vorhanden ist.",
                    action: "Noch keine neuen Termine"
                }
            );
        }
    }

    function getCalendarSelection() {
        const selectedSerie = String(serieFilter?.value || "");
        const selectedSeason = String(saisonFilter?.value || "");
        const completedSeasonIds = getCompletedSeasonIds();

        return alleRennen.filter((race) => {
            const matchesSerie = !selectedSerie || getSerieId(race) === selectedSerie;
            const matchesSeason = !selectedSeason || getSeasonId(race) === selectedSeason;
            const matchesView = matchesCalendarView(race, completedSeasonIds);
            return matchesSerie && matchesSeason && matchesView;
        });
    }

    function updateContextText() {
        if (eyebrow) {
            eyebrow.textContent = kalenderAnsicht === "historie"
                ? "GTM Historie"
                : "GTM Rennserien";
        }

        if (intro) {
            intro.textContent = kalenderAnsicht === "historie"
                ? "Vollständig abgeschlossene Masters- und Time-Attack-Saisons sowie beendete GTM FUN Events."
                : "Laufende Saisons sowie aktuelle und kommende Termine aus GTM Masters, GTM Time Attack und den GTM FUN Events.";
        }

        if (viewHint) {
            viewHint.textContent = kalenderAnsicht === "historie"
                ? "Hier erscheinen nur vollständig abgeschlossene Saisons und beendete FUN Events."
                : "Laufende Saisons und noch bevorstehende FUN Events.";
        }
    }

    function updateStatistics(entries) {
        const completed = entries.filter((race) => getRaceStatus(race) === "abgeschlossen");
        const remaining = entries.filter((race) => getRaceStatus(race) !== "abgeschlossen");
        const nextRace =
            entries.find((race) => getRaceStatus(race) === "aktuell") ||
            entries.find((race) => getRaceStatus(race) === "nächster") ||
            [...remaining].sort((a, b) => compareDates(a?.datum, b?.datum))[0];

        window.GTM.Utils?.setText("kalender-rennen-gesamt", entries.length);
        window.GTM.Utils?.setText("kalender-abgeschlossen", completed.length);
        window.GTM.Utils?.setText("kalender-verbleibend", remaining.length);
        window.GTM.Utils?.setText("kalender-naechster-lauf", nextRace?.strecke || "–");
    }

    function groupRacesBySeason(entries) {
        const groups = new Map();

        entries.forEach((race) => {
            const seasonId = getSeasonId(race);

            if (!groups.has(seasonId)) {
                groups.set(seasonId, {
                    id: seasonId,
                    serieId: getSerieId(race),
                    serieName: getSerieName(race),
                    seasonNumber: getSeasonNumber(race),
                    seasonName: getSeasonName(race),
                    entries: []
                });
            }

            groups.get(seasonId).entries.push(race);
        });

        return [...groups.values()].sort((a, b) => {
            return (
                getSeriesOrder(a.serieId) - getSeriesOrder(b.serieId) ||
                compareText(a.serieName, b.serieName) ||
                a.seasonNumber - b.seasonNumber
            );
        });
    }

    function createSeasonGroup(group) {
        const count = group.entries.length;
        const completed = group.entries.filter((race) => {
            return getRaceStatus(race) === "abgeschlossen";
        }).length;
        const groupTitle = group.serieId === "fun"
            ? `Events ${group.seasonNumber}`
            : `Saison ${group.seasonNumber}`;

        return `
            <section
                class="kalender-saison-gruppe serie-${escapeHtml(group.serieId)}"
                data-serie-id="${escapeHtml(group.serieId)}"
                data-saison-id="${escapeHtml(group.id)}"
                aria-labelledby="kalender-saison-${escapeHtml(group.id)}"
            >
                <header class="kalender-saison-kopf">
                    <div>
                        <span>${escapeHtml(group.serieName)}</span>

                        <h2 id="kalender-saison-${escapeHtml(group.id)}">
                            ${groupTitle}
                        </h2>
                    </div>

                    <p>
                        <strong>${count}</strong>
                        ${count === 1 ? "Termin" : "Termine"}
                        <small>${completed} abgeschlossen</small>
                    </p>
                </header>

                <div class="kalender-saison-grid">
                    ${group.entries.map(createRaceCard).join("")}
                </div>
            </section>
        `;
    }

    function renderRaces(entries) {
        if (!grid) {
            return;
        }

        if (entries.length === 0) {
            grid.innerHTML = "";

            if (noResults) {
                noResults.hidden = false;
            }

            grid.setAttribute("aria-busy", "false");
            return;
        }

        grid.innerHTML = groupRacesBySeason(entries)
            .map(createSeasonGroup)
            .join("");
        grid.setAttribute("aria-busy", "false");

        if (noResults) {
            noResults.hidden = true;
        }
    }

    function applyFilters() {
        const selectedEntries = getCalendarSelection();
        const query = normalizeText(searchInput?.value);
        const selectedStatus = String(statusFilter?.value || "").trim();

        const filtered = selectedEntries.filter((race) => {
            const matchesSearch = query === "" || getSearchText(race).includes(query);
            const matchesStatus = selectedStatus === "" || getRaceStatus(race) === selectedStatus;
            return matchesSearch && matchesStatus;
        });

        updateContextText(selectedEntries);
        updateStatistics(selectedEntries);

        if (noResults) {
            noResults.textContent = kalenderAnsicht === "historie"
                ? "Noch keine vollständig abgeschlossene Saison oder beendeten FUN Events gefunden."
                : "Keine passenden aktuellen oder bevorstehenden Termine gefunden.";
        }

        renderRaces(sortRaces(filtered));
    }

    function setCalendarView(view) {
        kalenderAnsicht = view === "historie" ? "historie" : "aktuell";

        const isHistory = kalenderAnsicht === "historie";

        viewCurrentButton?.classList.toggle("ist-aktiv", !isHistory);
        viewCurrentButton?.setAttribute("aria-selected", String(!isHistory));
        viewHistoryButton?.classList.toggle("ist-aktiv", isHistory);
        viewHistoryButton?.setAttribute("aria-selected", String(isHistory));

        if (serieFilter) {
            serieFilter.value = "";
        }

        populateSeasonFilter("");

        if (statusFilter) {
            statusFilter.value = "";
        }

        if (searchInput) {
            searchInput.value = "";
        }

        applyFilters();
    }

    function activateCalendarSelection(serieId, seasonId) {
        if (kalenderAnsicht !== "aktuell") {
            setCalendarView("aktuell");
        }

        if (serieFilter) {
            serieFilter.value = serieId;
        }

        populateSeasonFilter(seasonId);
        updatePreviewCards();
        applyFilters();

        document.querySelector(".kalender-filterbereich")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function showError(message) {
        console.error(message);

        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="gtm-data-error">
                <strong>Der Rennkalender konnte nicht geladen werden.</strong>
                <p>${escapeHtml(message)}</p>
            </div>
        `;

        grid.setAttribute("aria-busy", "false");
    }

    async function loadCalendar() {
        try {
            const data = await window.GTM.load("kalender", {
                forceReload: true
            });

            if (!Array.isArray(data)) {
                throw new Error("kalender.json enthält keine gültige Terminliste.");
            }

            alleRennen = data.filter((race) => {
                return race && toNumber(race.laufnummer) > 0 && race.strecke;
            });

            if (alleRennen.length === 0) {
                throw new Error("kalender.json enthält keine gültigen Termine.");
            }

            selectInitialCalendar();
            renderSlider();
            updatePreviewCards();
            applyFilters();
        } catch (error) {
            showError(error?.message || "Unbekannter Fehler");
        }
    }

    searchInput?.addEventListener("input", applyFilters);
    statusFilter?.addEventListener("change", applyFilters);
    sortSelect?.addEventListener("change", applyFilters);

    serieFilter?.addEventListener("change", () => {
        populateSeasonFilter();
        updatePreviewCards();
        applyFilters();
    });

    saisonFilter?.addEventListener("change", () => {
        updatePreviewCards();
        applyFilters();
    });

    viewCurrentButton?.addEventListener("click", () => {
        setCalendarView("aktuell");
    });

    viewHistoryButton?.addEventListener("click", () => {
        setCalendarView("historie");
    });

    sliderPrevious?.addEventListener("click", () => {
        showSliderSlide(sliderIndex - 1);
    });

    sliderNext?.addEventListener("click", () => {
        showSliderSlide(sliderIndex + 1);
    });

    sliderDots?.addEventListener("click", (event) => {
        const dot = event.target.closest("[data-slider-punkt]");

        if (!dot) {
            return;
        }

        showSliderSlide(toNumber(dot.dataset.sliderPunkt, 0));
    });

    slider?.addEventListener("click", (event) => {
        const button = event.target.closest(".kalender-slider-aktion");

        if (!button) {
            return;
        }

        activateCalendarSelection(
            button.dataset.sliderSerieId,
            button.dataset.sliderSaisonId
        );
    });

    slider?.addEventListener("pointerenter", stopSliderTimer);
    slider?.addEventListener("pointerleave", startSliderTimer);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopSliderTimer();
        } else {
            startSliderTimer();
        }
    });

    nextSeasonCard?.addEventListener("click", () => {
        if (nextSeasonCard.disabled) {
            return;
        }

        activateCalendarSelection(
            nextSeasonCard.dataset.targetSerieId,
            nextSeasonCard.dataset.targetSaisonId
        );
    });

    taCard?.addEventListener("click", () => {
        if (taCard.disabled) {
            return;
        }

        activateCalendarSelection(
            taCard.dataset.targetSerieId,
            taCard.dataset.targetSaisonId
        );
    });

    nextTaSeasonCard?.addEventListener("click", () => {
        if (nextTaSeasonCard.disabled) {
            return;
        }

        activateCalendarSelection(
            nextTaSeasonCard.dataset.targetSerieId,
            nextTaSeasonCard.dataset.targetSaisonId
        );
    });

    funCard?.addEventListener("click", () => {
        if (funCard.disabled) {
            return;
        }

        activateCalendarSelection(
            funCard.dataset.targetSerieId,
            funCard.dataset.targetSaisonId
        );
    });

    grid?.addEventListener("click", (event) => {
        const button = event.target.closest(".kalender-details-button");

        if (!button) {
            return;
        }

        console.info(
            `Veranstaltungsdetails für ${button.dataset.terminId} werden später ergänzt.`
        );
    });

    await loadCalendar();
});
