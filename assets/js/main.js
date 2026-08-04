/* ==========================================================
   GTM CONTROL CENTER
   Globale Komponenten, Dashboard und Footer
========================================================== */

const GTM_TRACK_ASSETS = {
    "barcelona": "barcelona",
    "bathurst": "bathurst",
    "brands hatch": "brandshatch",
    "cota": "cota",
    "donington park": "doningtonpark",
    "hungaroring": "hungaroring",
    "imola": "imola",
    "indianapolis": "indianapolis",
    "kyalami": "kyalami",
    "laguna seca": "lagunaseca",
    "misano": "misano",
    "monza": "monza",
    "nürburgring 24h": "nuerburgring24h",
    "nurburgring 24h": "nuerburgring24h",
    "nürburgring gp": "nuerburgringgp",
    "nurburgring gp": "nuerburgringgp",
    "oulton park": "oultonpark",
    "paul ricard": "paulricard",
    "red bull ring": "redbullring",
    "silverstone": "silverstone",
    "snetterton": "snetterton",
    "spa": "spa",
    "suzuka": "suzuka",
    "valencia": "valencia",
    "watkins glen": "watkinsglen",
    "zandvoort": "zandvoort",
    "zolder": "zolder"
};

async function loadComponent(id, file) {
    const element = document.getElementById(id);
    if (!element) return false;

    try {
        const response = await fetch(file, { cache: "no-store" });
        if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
        element.innerHTML = await response.text();
        return true;
    } catch (error) {
        console.error("Komponente konnte nicht geladen werden:", error);
        element.innerHTML = `<div class="container py-4 text-danger">${escapeHtml(file)} konnte nicht geladen werden.</div>`;
        return false;
    }
}

function ensureStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
}

function ensureFooterRoot() {
    let footer = document.getElementById("site-footer");
    if (footer) return footer;
    footer = document.createElement("footer");
    footer.id = "site-footer";
    document.body.appendChild(footer);
    return footer;
}

function setText(id, value, fallback = "–") {
    const element = document.getElementById(id);
    if (!element) return;
    const valid = value !== null && value !== undefined && String(value).trim() !== "";
    element.textContent = valid ? String(value) : fallback;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatGermanDate(value) {
    if (!value) return "Datum noch offen";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function normalizeText(value) {
    return String(value ?? "").trim().toLocaleLowerCase("de-DE");
}

function isCompleted(event) {
    return event?.abgeschlossen === true || normalizeText(event?.status) === "abgeschlossen";
}

function eventTime(event) {
    const time = new Date(`${event?.datum || "9999-12-31"}T12:00:00`).getTime();
    return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function getTrackKey(name) {
    const normalized = normalizeText(name).replace(/[-_]+/g, " ").replace(/\s+/g, " ");
    return GTM_TRACK_ASSETS[normalized] || normalized.replace(/[^a-z0-9äöüß]/g, "");
}

function setImageWithFallback(element, sources) {
    if (!element) return;
    const queue = sources.filter(Boolean);
    let index = 0;
    const next = () => {
        if (index >= queue.length) return;
        element.src = queue[index++];
    };
    element.onerror = next;
    next();
}

function renderTopThree(entries) {
    const list = document.getElementById("dashboard-top-drei");
    if (!list) return;
    if (!Array.isArray(entries) || !entries.length) {
        list.innerHTML = "<li>Noch keine Fahrerwertung verfügbar.</li>";
        return;
    }

    list.innerHTML = entries.slice(0, 3).map((driver, index) => {
        const number = driver?.nummer ?? driver?.startnummer ?? "";
        const name = driver?.name ?? driver?.fahrer ?? driver?.anzeigename ?? "Unbekannt";
        const points = Number(driver?.punkte ?? driver?.wertung ?? 0) || 0;
        const position = Number(driver?.platzierung) || index + 1;
        const href = number ? `pages/fahrerprofil.html?nummer=${encodeURIComponent(number)}` : "pages/fahrer.html";
        return `<li>
            <a class="dashboard-ranking-link" href="${href}">
                <span class="dashboard-ranking-position">${position}</span>
                <span class="dashboard-ranking-driver">
                    <strong>${number ? `#${escapeHtml(number)} ` : ""}${escapeHtml(name)}</strong>
                    <small>${escapeHtml(driver?.teamZuordnung || driver?.team || "Kein Team")}</small>
                </span>
                <span class="dashboard-ranking-points">${points} Pkt.</span>
            </a>
        </li>`;
    }).join("");
}

function renderSeasonProgress(events) {
    const masters = events.filter(event => normalizeText(event?.serieId || event?.modul) === "masters");
    const completed = masters.filter(isCompleted).length;
    const percentage = masters.length ? Math.round(completed / masters.length * 100) : 0;
    setText("dashboard-fortschritt-text", `${completed} von ${masters.length} Rennen`);
    const bar = document.getElementById("dashboard-fortschritt-balken");
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}

function findFocusEvent(events) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const open = events
        .filter(event => !isCompleted(event))
        .sort((a, b) => eventTime(a) - eventTime(b));
    return open.find(event => eventTime(event) >= now.getTime()) || open[0] ||
        [...events].sort((a, b) => eventTime(b) - eventTime(a))[0] || null;
}

function renderLiveEvent(event) {
    if (!event) {
        setText("dashboard-live-status", "Noch offen");
        setText("dashboard-live-strecke", "Nächster Termin wird geplant");
        setText("dashboard-live-datum", "Neue Kalenderdaten erscheinen automatisch.");
        return;
    }

    const key = getTrackKey(event.strecke);
    setText("dashboard-live-label", isCompleted(event) ? "Zuletzt gefahren" : "Als Nächstes");
    setText("dashboard-live-status", event.status || (isCompleted(event) ? "Abgeschlossen" : "Bevorstehend"));
    setText("dashboard-live-serie", event.saisonName || event.serie || "GTM Rennserien");
    setText("dashboard-live-strecke", event.strecke || event.eventName || "Termin");
    setText("dashboard-live-datum", `${event.laufnummer ? `Lauf ${event.laufnummer} · ` : ""}${formatGermanDate(event.datum)}`);

    setImageWithFallback(document.getElementById("dashboard-live-foto"), [
        `assets/images/strecken/bilder/${key}.jpg`,
        `assets/images/strecken/bilder/${key}.png`,
        `assets/images/strecken/bilder/${key}.webp`,
        `assets/images/strecken/bilder/${key}.jpeg`,
        "assets/images/logo/gtm-logo.png"
    ]);
    setImageWithFallback(document.getElementById("dashboard-live-layout"), [
        `assets/images/strecken/layouts/${key}-layout.png`,
        `assets/images/strecken/layouts/${key}-layout.webp`,
        "assets/images/logo/gtm-logo.png"
    ]);
}

function renderSeriesStatus(events, seriesId, prefix) {
    const series = events.filter(event => normalizeText(event?.serieId || event?.modul) === seriesId);
    const open = series.filter(event => !isCompleted(event)).sort((a, b) => eventTime(a) - eventTime(b));
    setText(`dashboard-serie-${prefix}-count`, series.length || "0");
    setText(
        `dashboard-serie-${prefix}-status`,
        open[0] ? `Nächster Termin: ${formatGermanDate(open[0].datum)}` : series.length ? "Aktuell vollständig abgeschlossen" : "In Vorbereitung"
    );
}

function renderDashboard(dashboard, events, teams, vehicles, numbers) {
    const activeDrivers = Number(dashboard?.aktiveFahrer) || 0;
    const masters = events.filter(event => normalizeText(event?.serieId || event?.modul) === "masters");
    const nextMasters = masters.filter(event => !isCompleted(event)).sort((a, b) => eventTime(a) - eventTime(b))[0] || null;
    const tracks = new Set(events.map(event => normalizeText(event?.strecke)).filter(Boolean));

    setText("hero-aktive-fahrer", activeDrivers);
    setText("hero-rennen-gesamt", events.length);
    setText("hero-rennen-verbleibend", events.filter(event => !isCompleted(event)).length);
    setText("hero-saison-name", "GTM Rennserien");
    setText("hero-saison-status", "Masters · Time Attack · FUN Events");

    setText("dashboard-saison", dashboard?.saison || "Aktuelle Masters-Saison");
    setText("dashboard-fahrer-anzahl", activeDrivers);
    setText("dashboard-team-anzahl", teams.length);
    setText("dashboard-fahrzeuge-anzahl", vehicles.length);
    setText("dashboard-fahrzeuge-kartenanzahl", vehicles.length);
    setText("dashboard-strecken-anzahl", tracks.size);
    setText("dashboard-termine-anzahl", events.length);
    setText("dashboard-startnummern-anzahl", numbers.length || dashboard?.registrierteStartnummern || 0);
    setText("dashboard-meisterschaft-text", `${activeDrivers} Fahrer, ${teams.length} Teams und ${masters.length} Masters-Läufe.`);

    renderTopThree(Array.isArray(dashboard?.topDrei) ? dashboard.topDrei : []);
    renderSeasonProgress(events);
    renderLiveEvent(findFocusEvent(events));
    renderSeriesStatus(events, "masters", "masters");
    renderSeriesStatus(events, "ta", "ta");
    renderSeriesStatus(events, "fun", "fun");

    if (nextMasters) {
        setText("dashboard-naechste-strecke", nextMasters.strecke);
        setText("dashboard-naechstes-rennen", `Lauf ${nextMasters.laufnummer || "–"} am ${formatGermanDate(nextMasters.datum)}.`);

        const nextTrackKey = getTrackKey(nextMasters.strecke);
        setImageWithFallback(document.getElementById("dashboard-next-race-foto"), [
            `assets/images/strecken/bilder/${nextTrackKey}.jpg`,
            `assets/images/strecken/bilder/${nextTrackKey}.png`,
            `assets/images/strecken/bilder/${nextTrackKey}.webp`,
            `assets/images/strecken/bilder/${nextTrackKey}.jpeg`,
            "assets/images/logo/gtm-logo.png"
        ]);
        setImageWithFallback(document.getElementById("dashboard-next-race-layout"), [
            `assets/images/strecken/layouts/${nextTrackKey}-layout.png`,
            `assets/images/strecken/layouts/${nextTrackKey}-layout.webp`,
            "assets/images/logo/gtm-logo.png"
        ]);
    } else {
        setText("dashboard-naechste-strecke", "Saison abgeschlossen");
        setText("dashboard-naechstes-rennen", "Die nächste Masters-Saison wird automatisch ergänzt.");
    }
}

async function loadJson(name, fallback) {
    try {
        if (window.GTM?.load) return await window.GTM.load(name, { forceReload: true });
        const response = await fetch(`data/json/${name}.json`, { cache: "no-store" });
        if (!response.ok) throw new Error(`${name}.json: HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn(`${name}.json konnte nicht geladen werden.`, error);
        return fallback;
    }
}

async function loadDashboardData() {
    const [dashboard, events, teams, vehicles, numbers] = await Promise.all([
        loadJson("dashboard", {}),
        loadJson("kalender", []),
        loadJson("teams", []),
        loadJson("fahrzeuge", []),
        loadJson("startnummern", [])
    ]);
    renderDashboard(
        dashboard && !Array.isArray(dashboard) ? dashboard : {},
        Array.isArray(events) ? events : [],
        Array.isArray(teams) ? teams : [],
        Array.isArray(vehicles) ? vehicles : [],
        Array.isArray(numbers) ? numbers : []
    );
}

function activateFooter() {
    setText("gtm-footer-jahr", new Date().getFullYear());
    document.querySelector("[data-footer-nach-oben]")?.addEventListener("click", event => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadComponent("site-navbar", "components/navbar.html");

    const dashboardRoot = document.getElementById("site-dashboard");
    const heroRoot = document.getElementById("site-hero");
    if (heroRoot) await loadComponent("site-hero", "components/hero.html");
    if (dashboardRoot) {
        await loadComponent("site-dashboard", "components/dashboard.html");
        await loadDashboardData();
    }

    ensureStylesheet("assets/css/footer.css");
    ensureFooterRoot();
    await loadComponent("site-footer", "components/footer.html");
    activateFooter();
});
