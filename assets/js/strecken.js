/* ==========================================================
   GTM STRECKENÜBERSICHT
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid = document.getElementById("strecken-grid");
    const noResults = document.getElementById("keine-strecken");
    const searchInput = document.getElementById("strecken-suche");
    const seriesFilter = document.getElementById("strecken-serie-filter");
    const countryFilter = document.getElementById("strecken-land-filter");
    const sortSelect = document.getElementById("strecken-sortierung");
    const slider = document.getElementById("strecken-slider");
    const sliderDots = document.getElementById("strecken-slider-punkte");
    const sliderPrevious = document.getElementById("strecken-slider-zurueck");
    const sliderNext = document.getElementById("strecken-slider-weiter");

    const catalog = [
        { id: "barcelona", name: "Barcelona-Catalunya", land: "Spanien", photo: "barcelona.jpg", layout: "barcelona-layout.png", aliases: ["Barcelona", "Catalunya", "Circuit de Barcelona-Catalunya"] },
        { id: "bathurst", name: "Mount Panorama", land: "Australien", photo: "bathurst.jpg", layout: "bathurst-layout.png", aliases: ["Bathurst"] },
        { id: "brandshatch", name: "Brands Hatch", land: "Großbritannien", photo: "brandshatch.jpg", layout: "brandshatch-layout.png", aliases: ["Brands Hatch Circuit"] },
        { id: "cota", name: "Circuit of the Americas", land: "USA", photo: "cota.webp", layout: "cota-layout.png", aliases: ["COTA"] },
        { id: "doningtonpark", name: "Donington Park", land: "Großbritannien", photo: "doningtonpark.jpg", layout: "doningtonpark-layout.png", aliases: ["Donington"] },
        { id: "hungaroring", name: "Hungaroring", land: "Ungarn", photo: "hungaroring.jpg", layout: "hungaroring-layout.png", aliases: [] },
        { id: "imola", name: "Imola", land: "Italien", photo: "imola.jpg", layout: "imola-layout.png", aliases: [] },
        { id: "indianapolis", name: "Indianapolis", land: "USA", photo: "Indianapolis.jpg", layout: "indianapolis-layout.png", aliases: ["Indianapolis Motor Speedway"] },
        { id: "kyalami", name: "Kyalami", land: "Südafrika", photo: "kyalami.jpg", layout: "kyalami-layout.png", aliases: [] },
        { id: "lagunaseca", name: "Laguna Seca", land: "USA", photo: "lagunaseca.jpg", layout: "lagunaseca-layout.png", aliases: [] },
        { id: "misano", name: "Misano", land: "Italien", photo: "misano.jpg", layout: "misano-layout.png", aliases: [] },
        { id: "monza", name: "Monza", land: "Italien", photo: "monza.jpg", layout: "monza-layout.png", aliases: [] },
        { id: "nurburgring24h", name: "Nürburgring 24h", land: "Deutschland", photo: "nuerburgring24h.jpg", layout: "nuerburgring24h-layout.webp", aliases: ["Nordschleife", "Nürburgring 24 Stunden"] },
        { id: "nurburgringgp", name: "Nürburgring GP", land: "Deutschland", photo: "nuerburgringgp.jpg", layout: "nuerburgringgp-layout.png", aliases: ["Nürburgring", "Nürburgring Grand Prix"] },
        { id: "oultonpark", name: "Oulton Park", land: "Großbritannien", photo: "oultonpark.png", layout: "oultonpark-layout.png", aliases: [] },
        { id: "paulricard", name: "Paul Ricard", land: "Frankreich", photo: "paulricard.jpg", layout: "paulricard-layout.png", aliases: ["Paul Richard", "Circuit Paul Ricard"] },
        { id: "redbullring", name: "Red Bull Ring", land: "Österreich", photo: "redbullring.jpg", layout: "redbullring-layout.png", aliases: ["Red Bull Ring Austria"] },
        { id: "silverstone", name: "Silverstone", land: "Großbritannien", photo: "silverstone.jpg", layout: "silverstone-layout.png", aliases: [] },
        { id: "snetterton", name: "Snetterton", land: "Großbritannien", photo: "snetterton.jpg", layout: "snetterton-layout.png", aliases: [] },
        { id: "spa", name: "Spa-Francorchamps", land: "Belgien", photo: "spa.jpg", layout: "spa-layout.png", aliases: ["Spa", "Circuit de Spa-Francorchamps"] },
        { id: "suzuka", name: "Suzuka", land: "Japan", photo: "suzuka.jpg", layout: "suzuka-layout.png", aliases: [] },
        { id: "valencia", name: "Valencia", land: "Spanien", photo: "valencia.jpg", layout: "valencia-layout.png", aliases: [] },
        { id: "watkinsglen", name: "Watkins Glen", land: "USA", photo: "watkinsglen.jpg", layout: "watkinsglen-layout.png", aliases: ["Watkins Glen International"] },
        { id: "zandvoort", name: "Zandvoort", land: "Niederlande", photo: "zandvoort.jpeg", layout: "zandvoort-layout.png", aliases: [] },
        { id: "zolder", name: "Zolder", land: "Belgien", photo: "zolder.jpg", layout: "zolder-layout.png", aliases: [] }
    ];

    const seriesLabels = {
        masters: "GTM Masters",
        ta: "GTM Time Attack",
        fun: "GTM FUN Events"
    };

    let tracks = [];
    let sliderTracks = [];
    let sliderIndex = 0;
    let sliderTimer = null;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalize(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
    }

    function getSeriesId(race) {
        return String(race?.serieId || race?.modul || "masters").trim().toLowerCase();
    }

    function getStatus(race) {
        const status = String(race?.status || "").trim().toLowerCase();
        if (race?.abgeschlossen === true || ["abgeschlossen", "beendet"].includes(status)) return "abgeschlossen";
        if (race?.aktuell === true || status === "aktuell") return "aktuell";
        if (race?.naechster === true || ["nächster", "naechster"].includes(status)) return "nächster";
        return "bevorstehend";
    }

    function parseDate(value) {
        const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
        const date = parseDate(value);
        return date
            ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
            : "Termin offen";
    }

    function resolveTrack(trackName) {
        const key = normalize(trackName);
        return catalog.find((track) => (
            normalize(track.id) === key ||
            normalize(track.name) === key ||
            track.aliases.some((alias) => normalize(alias) === key)
        )) || null;
    }

    function buildTracks(calendar) {
        return catalog.map((track) => {
            const events = calendar
                .filter((race) => resolveTrack(race?.strecke)?.id === track.id)
                .sort((a, b) => (parseDate(a?.datum)?.getTime() || 0) - (parseDate(b?.datum)?.getTime() || 0));
            const upcoming = events.filter((race) => getStatus(race) !== "abgeschlossen");
            const completed = events.filter((race) => getStatus(race) === "abgeschlossen");
            const series = [...new Set(events.map(getSeriesId).filter(Boolean))];
            const nextEvent = upcoming[0] || null;

            return { ...track, events, upcoming, completed, series, nextEvent };
        });
    }

    function getTrackUrl(track) {
        return `pages/streckenprofil.html?strecke=${encodeURIComponent(track.id)}`;
    }

    function createSeriesBadges(track) {
        if (track.series.length === 0) {
            return '<span class="strecken-badge ist-neutral">Noch ohne GTM-Termin</span>';
        }

        return track.series.map((series) => `
            <span class="strecken-badge serie-${escapeHtml(series)}">
                ${escapeHtml(seriesLabels[series] || series)}
            </span>
        `).join("");
    }

    function createTrackCard(track) {
        const nextLabel = track.nextEvent
            ? `${formatDate(track.nextEvent.datum)} · ${seriesLabels[getSeriesId(track.nextEvent)] || "GTM"}`
            : "Derzeit kein weiterer Termin";

        return `
            <a
                class="strecken-karte"
                href="${getTrackUrl(track)}"
                aria-label="Streckenprofil ${escapeHtml(track.name)} öffnen"
            >
                <div class="strecken-karte-bild">
                    <img
                        class="strecken-karte-foto"
                        src="assets/images/strecken/bilder/${escapeHtml(track.photo)}"
                        alt="Charakteristische Ansicht: ${escapeHtml(track.name)}"
                        loading="lazy"
                    >
                    <span class="strecken-karte-verlauf"></span>
                    <img
                        class="strecken-karte-layout"
                        src="assets/images/strecken/layouts/${escapeHtml(track.layout)}"
                        alt="Streckenlayout: ${escapeHtml(track.name)}"
                        loading="lazy"
                    >
                    <span class="strecken-karte-land">${escapeHtml(track.land)}</span>
                </div>

                <div class="strecken-karte-inhalt">
                    <div class="strecken-karte-badges">${createSeriesBadges(track)}</div>
                    <h2>${escapeHtml(track.name)}</h2>
                    <p>${escapeHtml(nextLabel)}</p>

                    <div class="strecken-karte-statistik">
                        <span><strong>${track.events.length}</strong> GTM-Termine</span>
                        <span><strong>${track.upcoming.length}</strong> kommend</span>
                    </div>

                    <span class="strecken-karte-aktion">Streckenprofil öffnen <i>→</i></span>
                </div>
            </a>
        `;
    }

    function renderTracks(entries) {
        if (!grid) return;

        grid.innerHTML = entries.map(createTrackCard).join("");
        grid.setAttribute("aria-busy", "false");
        if (noResults) noResults.hidden = entries.length > 0;
    }

    function applyFilters() {
        const query = normalize(searchInput?.value);
        const series = String(seriesFilter?.value || "");
        const country = String(countryFilter?.value || "");
        const sorting = String(sortSelect?.value || "name");

        const filtered = tracks.filter((track) => {
            const searchText = normalize([
                track.name,
                track.land,
                ...track.aliases,
                ...track.series.map((id) => seriesLabels[id] || id)
            ].join(" "));

            return (!query || searchText.includes(query)) &&
                (!series || track.series.includes(series)) &&
                (!country || track.land === country);
        });

        filtered.sort((a, b) => {
            if (sorting === "termine") return b.events.length - a.events.length || a.name.localeCompare(b.name, "de");
            if (sorting === "kommend") return b.upcoming.length - a.upcoming.length || a.name.localeCompare(b.name, "de");
            if (sorting === "land") return a.land.localeCompare(b.land, "de") || a.name.localeCompare(b.name, "de");
            return a.name.localeCompare(b.name, "de");
        });

        renderTracks(filtered);
    }

    function createSliderSlide(track, index) {
        const isActive = index === 0;
        const next = track.nextEvent;
        const detail = next
            ? `Nächster Termin: ${formatDate(next.datum)} · ${seriesLabels[getSeriesId(next)] || "GTM"}`
            : `${track.events.length} bisherige GTM-Termine`;

        return `
            <a
                class="strecken-slider-karte${isActive ? " ist-aktiv" : ""}"
                href="${getTrackUrl(track)}"
                data-slider-index="${index}"
                aria-hidden="${isActive ? "false" : "true"}"
                aria-label="${escapeHtml(track.name)} – Streckenprofil öffnen"
            >
                <div class="strecken-slider-inhalt">
                    <span>${escapeHtml(track.land)}</span>
                    <h3>${escapeHtml(track.name)}</h3>
                    <p>${escapeHtml(detail)}</p>
                    <div class="strecken-slider-meta">
                        <span>${track.events.length} GTM-Termine</span>
                        <span>${track.series.length} Rennbereiche</span>
                    </div>
                    <strong>Streckenprofil öffnen →</strong>
                </div>

                <div class="strecken-slider-bild">
                    <img class="strecken-slider-foto" src="assets/images/strecken/bilder/${escapeHtml(track.photo)}" alt="">
                    <img class="strecken-slider-layout" src="assets/images/strecken/layouts/${escapeHtml(track.layout)}" alt="Streckenlayout: ${escapeHtml(track.name)}">
                </div>
            </a>
        `;
    }

    function showSlide(index, restart = true) {
        if (!sliderTracks.length || !slider) return;
        sliderIndex = (index + sliderTracks.length) % sliderTracks.length;

        slider.querySelectorAll("[data-slider-index]").forEach((slide, slideIndex) => {
            const active = slideIndex === sliderIndex;
            slide.classList.toggle("ist-aktiv", active);
            slide.setAttribute("aria-hidden", String(!active));
        });
        sliderDots?.querySelectorAll("[data-slider-punkt]").forEach((dot, dotIndex) => {
            const active = dotIndex === sliderIndex;
            dot.classList.toggle("ist-aktiv", active);
            dot.setAttribute("aria-current", active ? "true" : "false");
        });

        if (restart) startSliderTimer();
    }

    function stopSliderTimer() {
        if (sliderTimer) window.clearInterval(sliderTimer);
        sliderTimer = null;
    }

    function startSliderTimer() {
        stopSliderTimer();
        if (sliderTracks.length > 1) sliderTimer = window.setInterval(() => showSlide(sliderIndex + 1, false), 7000);
    }

    function renderSlider() {
        if (!slider) return;
        sliderTracks = [...tracks]
            .filter((track) => track.events.length > 0)
            .sort((a, b) => b.events.length - a.events.length || b.upcoming.length - a.upcoming.length || a.name.localeCompare(b.name, "de"))
            .slice(0, 6);

        if (sliderTracks.length === 0) {
            slider.innerHTML = '<div class="strecken-laden">Noch keine Streckentermine vorhanden.</div>';
            return;
        }

        slider.innerHTML = sliderTracks.map(createSliderSlide).join("");
        if (sliderDots) {
            sliderDots.innerHTML = sliderTracks.map((track, index) => `
                <button
                    type="button"
                    data-slider-punkt="${index}"
                    class="${index === 0 ? "ist-aktiv" : ""}"
                    aria-label="${escapeHtml(track.name)} anzeigen"
                    aria-current="${index === 0 ? "true" : "false"}"
                ></button>
            `).join("");
        }
        startSliderTimer();
    }

    function populateCountries() {
        if (!countryFilter) return;
        const countries = [...new Set(catalog.map((track) => track.land))].sort((a, b) => a.localeCompare(b, "de"));
        countryFilter.insertAdjacentHTML("beforeend", countries.map((country) => `
            <option value="${escapeHtml(country)}">${escapeHtml(country)}</option>
        `).join(""));
    }

    function updateStatistics(calendar) {
        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = String(value);
        };
        setText("strecken-anzahl", tracks.length);
        setText("strecken-laender", new Set(tracks.map((track) => track.land)).size);
        setText("strecken-termine", calendar.length);
        setText("strecken-kommend", calendar.filter((race) => getStatus(race) !== "abgeschlossen").length);
    }

    function showError(message) {
        if (!grid) return;
        grid.innerHTML = `
            <div class="strecken-fehler">
                <strong>Die Streckenbibliothek konnte nicht geladen werden.</strong>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
        grid.setAttribute("aria-busy", "false");
    }

    try {
        if (!window.GTM || typeof window.GTM.load !== "function") {
            throw new Error("Die GTM Data Engine wurde nicht geladen.");
        }

        const data = await window.GTM.load("kalender", { forceReload: true });
        const calendar = Array.isArray(data) ? data.filter((race) => race?.strecke) : [];
        tracks = buildTracks(calendar);

        populateCountries();
        updateStatistics(calendar);
        renderSlider();
        applyFilters();
    } catch (error) {
        showError(error?.message || "Unbekannter Fehler");
    }

    searchInput?.addEventListener("input", applyFilters);
    seriesFilter?.addEventListener("change", applyFilters);
    countryFilter?.addEventListener("change", applyFilters);
    sortSelect?.addEventListener("change", applyFilters);
    sliderPrevious?.addEventListener("click", () => showSlide(sliderIndex - 1));
    sliderNext?.addEventListener("click", () => showSlide(sliderIndex + 1));
    sliderDots?.addEventListener("click", (event) => {
        const dot = event.target.closest("[data-slider-punkt]");
        if (dot) showSlide(Number(dot.dataset.sliderPunkt) || 0);
    });
    slider?.addEventListener("pointerenter", stopSliderTimer);
    slider?.addEventListener("pointerleave", startSliderTimer);
});
