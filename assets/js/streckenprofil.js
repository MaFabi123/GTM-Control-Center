/* ==========================================================
   GTM STRECKENPROFIL
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const root = document.getElementById("streckenprofil-inhalt");

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

    function resolveTrack(value) {
        const key = normalize(value);
        return catalog.find((track) => (
            normalize(track.id) === key ||
            normalize(track.name) === key ||
            track.aliases.some((alias) => normalize(alias) === key)
        )) || null;
    }

    function getSeriesId(race) {
        return String(race?.serieId || race?.modul || "masters").trim().toLowerCase();
    }

    function getSeriesName(race) {
        return String(race?.serie || seriesLabels[getSeriesId(race)] || "GTM Rennserie");
    }

    function getSeasonName(race) {
        return String(race?.saisonName || `${getSeriesName(race)} Saison ${race?.saison || 1}`);
    }

    function getStatus(race) {
        const status = String(race?.status || "").trim().toLowerCase();
        if (race?.abgeschlossen === true || ["abgeschlossen", "beendet"].includes(status)) return "abgeschlossen";
        if (race?.aktuell === true || status === "aktuell") return "aktuell";
        if (race?.naechster === true || ["nächster", "naechster"].includes(status)) return "nächster";
        return "bevorstehend";
    }

    function getStatusLabel(status) {
        return {
            abgeschlossen: "Abgeschlossen",
            aktuell: "Aktuell",
            "nächster": "Nächster Termin",
            bevorstehend: "Bevorstehend"
        }[status] || "Bevorstehend";
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
            ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(date)
            : "Termin offen";
    }

    function formatPeriod(race) {
        if (race?.zeitraum) return String(race.zeitraum);
        const start = formatDate(race?.datum);
        if (!race?.datumBis) return start;
        return `${start} bis ${formatDate(race.datumBis)}`;
    }

    function createEventCard(race) {
        const seriesId = getSeriesId(race);
        const status = getStatus(race);
        const entryLabel = seriesId === "fun" ? "Event" : seriesId === "ta" ? "Runde" : "Lauf";

        return `
            <article class="streckenprofil-termin serie-${escapeHtml(seriesId)} status-${escapeHtml(status)}">
                <div class="streckenprofil-termin-kopf">
                    <span>${escapeHtml(getSeasonName(race))}</span>
                    <strong class="status-${escapeHtml(status)}">${escapeHtml(getStatusLabel(status))}</strong>
                </div>
                <h3>${entryLabel} ${escapeHtml(race?.laufnummer || "–")}</h3>
                <p>${escapeHtml(formatPeriod(race))}</p>
                <a href="pages/kalender.html?strecke=${encodeURIComponent(race?.strecke || "")}">
                    Im Rennkalender anzeigen →
                </a>
            </article>
        `;
    }

    function createOtherTracks(track) {
        const currentIndex = catalog.findIndex((entry) => entry.id === track.id);
        const others = [];
        for (let offset = 1; others.length < 4; offset += 1) {
            const entry = catalog[(currentIndex + offset) % catalog.length];
            if (entry.id !== track.id) others.push(entry);
        }

        return others.map((entry) => `
            <a class="streckenprofil-weitere-karte" href="pages/streckenprofil.html?strecke=${encodeURIComponent(entry.id)}">
                <img src="assets/images/strecken/bilder/${escapeHtml(entry.photo)}" alt="" loading="lazy">
                <span>${escapeHtml(entry.land)}</span>
                <strong>${escapeHtml(entry.name)}</strong>
            </a>
        `).join("");
    }

    function renderProfile(track, events) {
        const sortedEvents = [...events].sort((a, b) => (parseDate(a?.datum)?.getTime() || 0) - (parseDate(b?.datum)?.getTime() || 0));
        const upcoming = sortedEvents.filter((race) => getStatus(race) !== "abgeschlossen");
        const history = sortedEvents.filter((race) => getStatus(race) === "abgeschlossen").reverse();
        const series = [...new Set(sortedEvents.map(getSeriesId))];
        const firstEvent = sortedEvents[0] || null;
        const lastEvent = sortedEvents[sortedEvents.length - 1] || null;

        document.title = `GTM Control Center | ${track.name}`;

        root.innerHTML = `
            <section class="streckenprofil-hero">
                <div class="container">
                    <a class="streckenprofil-zurueck" href="pages/strecken.html">← Zurück zu allen Strecken</a>

                    <article class="streckenprofil-hero-karte">
                        <div class="streckenprofil-hero-bild">
                            <img
                                class="streckenprofil-foto"
                                src="assets/images/strecken/bilder/${escapeHtml(track.photo)}"
                                alt="Charakteristische Ansicht: ${escapeHtml(track.name)}"
                            >
                            <span class="streckenprofil-bild-verlauf"></span>
                            <img
                                class="streckenprofil-layout"
                                src="assets/images/strecken/layouts/${escapeHtml(track.layout)}"
                                alt="Streckenlayout: ${escapeHtml(track.name)}"
                            >
                        </div>

                        <div class="streckenprofil-hero-inhalt">
                            <p class="streckenprofil-eyebrow">GTM Streckenprofil</p>
                            <h1>${escapeHtml(track.name)}</h1>
                            <span class="streckenprofil-land">${escapeHtml(track.land)}</span>

                            <div class="streckenprofil-serien">
                                ${series.length > 0
                                    ? series.map((id) => `<span class="serie-${escapeHtml(id)}">${escapeHtml(seriesLabels[id] || id)}</span>`).join("")
                                    : '<span class="ist-neutral">Noch ohne GTM-Termin</span>'}
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section class="streckenprofil-bereich">
                <div class="container">
                    <div class="streckenprofil-statistik">
                        <article><strong>${events.length}</strong><span>GTM-Termine</span></article>
                        <article><strong>${series.length}</strong><span>Rennbereiche</span></article>
                        <article><strong>${history.length}</strong><span>Abgeschlossen</span></article>
                        <article><strong>${upcoming.length}</strong><span>Aktuell / kommend</span></article>
                    </div>
                </div>
            </section>

            <section class="streckenprofil-bereich">
                <div class="container">
                    <header class="streckenprofil-bereich-kopf">
                        <p>GTM Einsatz</p>
                        <h2>Streckendaten im Control Center</h2>
                    </header>

                    <div class="streckenprofil-daten">
                        <article><span>Land</span><strong>${escapeHtml(track.land)}</strong></article>
                        <article><span>Erster GTM-Termin</span><strong>${firstEvent ? escapeHtml(formatDate(firstEvent.datum)) : "–"}</strong></article>
                        <article><span>Letzter geplanter Termin</span><strong>${lastEvent ? escapeHtml(formatDate(lastEvent.datumBis || lastEvent.datum)) : "–"}</strong></article>
                        <article><span>Serien</span><strong>${series.length ? escapeHtml(series.map((id) => seriesLabels[id] || id).join(", ")) : "Noch keine"}</strong></article>
                    </div>
                </div>
            </section>

            <section class="streckenprofil-bereich">
                <div class="container">
                    <header class="streckenprofil-bereich-kopf">
                        <p>Aktuell und kommend</p>
                        <h2>Nächste GTM-Termine</h2>
                    </header>

                    <div class="streckenprofil-termin-grid">
                        ${upcoming.length
                            ? upcoming.map(createEventCard).join("")
                            : '<div class="streckenprofil-leer">Für diese Strecke ist derzeit kein weiterer GTM-Termin eingetragen.</div>'}
                    </div>
                </div>
            </section>

            <section class="streckenprofil-bereich streckenprofil-historie">
                <div class="container">
                    <header class="streckenprofil-bereich-kopf">
                        <p>Historie</p>
                        <h2>Abgeschlossene GTM-Termine</h2>
                    </header>

                    <div class="streckenprofil-termin-grid">
                        ${history.length
                            ? history.map(createEventCard).join("")
                            : '<div class="streckenprofil-leer">Noch keine abgeschlossenen Termine vorhanden.</div>'}
                    </div>
                </div>
            </section>

            <section class="streckenprofil-bereich">
                <div class="container">
                    <header class="streckenprofil-bereich-kopf">
                        <p>Streckenbibliothek</p>
                        <h2>Weitere Strecken entdecken</h2>
                    </header>
                    <div class="streckenprofil-weitere-grid">${createOtherTracks(track)}</div>
                </div>
            </section>
        `;

        root.setAttribute("aria-busy", "false");
    }

    function showError(message) {
        if (!root) return;
        root.innerHTML = `
            <div class="container streckenprofil-fehler">
                <p>${escapeHtml(message)}</p>
                <a class="streckenprofil-zurueck" href="pages/strecken.html">← Zurück zu allen Strecken</a>
            </div>
        `;
        root.setAttribute("aria-busy", "false");
    }

    try {
        if (!root) return;
        if (!window.GTM || typeof window.GTM.load !== "function") {
            throw new Error("Die GTM Data Engine wurde nicht geladen.");
        }

        const requestedTrack = new URLSearchParams(window.location.search).get("strecke") || "";
        const track = resolveTrack(requestedTrack);
        if (!track) throw new Error("Die ausgewählte Strecke wurde nicht gefunden.");

        const data = await window.GTM.load("kalender", { forceReload: true });
        const calendar = Array.isArray(data) ? data : [];
        const events = calendar.filter((race) => resolveTrack(race?.strecke)?.id === track.id);
        renderProfile(track, events);
    } catch (error) {
        showError(error?.message || "Das Streckenprofil konnte nicht geladen werden.");
    }
});
