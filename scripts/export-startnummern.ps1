# ============================================================
# GTM CONTROL CENTER
# Export der echten öffentlichen Startnummerndaten
#
# Stammdaten:
#   Blatt "Datenbank"
#   A = Fahrernummer
#   C = Team
#   E = Anzeigename
#
# Fahrzeug:
#   Blatt "GTM Masters Saison 1"
#   B = Startnummer
#   G = Fahrzeug
#
# Das Blatt "Entrylisten" wird nicht verwendet.
# ============================================================

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# DATEIPFADE
# ------------------------------------------------------------

$excelDatei = "C:\Users\mafab\OneDrive\Dokumente\GTM\GTM Datenbank vers.2.0.xlsx"

$projektOrdner = Split-Path -Parent $PSScriptRoot

$jsonDatei = Join-Path `
    $projektOrdner `
    "data\json\startnummern.json"

# ------------------------------------------------------------
# EXCEL-EINSTELLUNGEN
# ------------------------------------------------------------

$blattDatenbank = "Datenbank"
$blattSaison = "GTM Masters Saison 1"

# Excel-Konstante für letzte belegte Zelle nach oben
$xlUp = -4162

# ------------------------------------------------------------
# HILFSFUNKTIONEN
# ------------------------------------------------------------

function Get-Text {
    param (
        $Arbeitsblatt,
        [int]$Zeile,
        [int]$Spalte
    )

    $wert = $Arbeitsblatt.Cells.Item(
        $Zeile,
        $Spalte
    ).Value2

    if ($null -eq $wert) {
        return ""
    }

    return ([string]$wert).Trim()
}

function Get-Startnummer {
    param (
        $Wert
    )

    if ($null -eq $Wert) {
        return $null
    }

    $text = ([string]$Wert).Trim()

    $nummer = 0

    if (-not [int]::TryParse($text, [ref]$nummer)) {
        return $null
    }

    if ($nummer -lt 1 -or $nummer -gt 999) {
        return $null
    }

    return $nummer
}

function Remove-ComObject {
    param (
        $Objekt
    )

    if ($null -eq $Objekt) {
        return
    }

    try {
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject(
            $Objekt
        )
    }
    catch {
        # Fehler bei der Bereinigung ignorieren
    }
}

# ------------------------------------------------------------
# VORBEREITUNG
# ------------------------------------------------------------

Write-Host ""
Write-Host "GTM Startnummern-Export" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path -LiteralPath $excelDatei)) {
    throw "Die Excel-Datei wurde nicht gefunden: $excelDatei"
}

$jsonOrdner = Split-Path -Parent $jsonDatei

if (-not (Test-Path -LiteralPath $jsonOrdner)) {
    New-Item `
        -Path $jsonOrdner `
        -ItemType Directory `
        -Force |
        Out-Null
}

$excel = $null
$arbeitsmappe = $null
$datenbank = $null
$saison = $null

try {
    # --------------------------------------------------------
    # EXCEL ÖFFNEN
    # --------------------------------------------------------

    Write-Host "Öffne Datenbank:" -ForegroundColor Gray
    Write-Host $excelDatei -ForegroundColor Yellow
    Write-Host ""

    $excel = New-Object -ComObject Excel.Application

    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $arbeitsmappe = $excel.Workbooks.Open(
        $excelDatei,
        0,
        $true
    )

    $datenbank = $arbeitsmappe.Worksheets.Item(
        $blattDatenbank
    )

    $saison = $arbeitsmappe.Worksheets.Item(
        $blattSaison
    )

    # --------------------------------------------------------
    # FAHRZEUGE DER AKTUELLEN SAISON EINLESEN
    # --------------------------------------------------------

    $fahrzeugeNachNummer = @{}

    $letzteSaisonZeile = $saison.Cells.Item(
        $saison.Rows.Count,
        2
    ).End($xlUp).Row

    Write-Host "Saisonzeilen gefunden: $letzteSaisonZeile"

    for (
        $zeile = 2;
        $zeile -le $letzteSaisonZeile;
        $zeile++
    ) {
        $nummerRoh = $saison.Cells.Item(
            $zeile,
            2
        ).Value2

        $nummer = Get-Startnummer $nummerRoh

        if ($null -eq $nummer) {
            continue
        }

        $fahrzeug = Get-Text `
            -Arbeitsblatt $saison `
            -Zeile $zeile `
            -Spalte 7

        if (-not [string]::IsNullOrWhiteSpace($fahrzeug)) {
            $fahrzeugeNachNummer[$nummer] = $fahrzeug
        }
    }

    Write-Host "Saisonfahrzeuge gefunden: $($fahrzeugeNachNummer.Count)"
    Write-Host ""

    # --------------------------------------------------------
    # ECHTE FAHRER AUS "DATENBANK" EINLESEN
    # --------------------------------------------------------

    $exportDaten = New-Object `
        System.Collections.Generic.List[object]

    $bereitsVorhanden = @{}

    $letzteDatenbankZeile = $datenbank.Cells.Item(
        $datenbank.Rows.Count,
        1
    ).End($xlUp).Row

    Write-Host "Datenbankzeilen gefunden: $letzteDatenbankZeile"

    for (
        $zeile = 2;
        $zeile -le $letzteDatenbankZeile;
        $zeile++
    ) {
        $nummerRoh = $datenbank.Cells.Item(
            $zeile,
            1
        ).Value2

        $nummer = Get-Startnummer $nummerRoh

        if ($null -eq $nummer) {
            continue
        }

        $anzeigename = Get-Text `
            -Arbeitsblatt $datenbank `
            -Zeile $zeile `
            -Spalte 5

        if ([string]::IsNullOrWhiteSpace($anzeigename)) {
            continue
        }

        # Doppelte Startnummern nicht doppelt exportieren
        if ($bereitsVorhanden.ContainsKey($nummer)) {
            Write-Host `
                "Doppelte Startnummer übersprungen: $nummer" `
                -ForegroundColor DarkYellow

            continue
        }

        $team = Get-Text `
            -Arbeitsblatt $datenbank `
            -Zeile $zeile `
            -Spalte 3

        $fahrzeug = ""

        if ($fahrzeugeNachNummer.ContainsKey($nummer)) {
            $fahrzeug = $fahrzeugeNachNummer[$nummer]
        }

        $eintrag = [PSCustomObject][ordered]@{
            nummer   = $nummer
            status   = "vergeben"
            fahrer   = $anzeigename
            team     = $team
            fahrzeug = $fahrzeug
        }

        $exportDaten.Add($eintrag)

        $bereitsVorhanden[$nummer] = $true
    }

    # --------------------------------------------------------
    # SORTIEREN
    # --------------------------------------------------------

    $sortierteDaten = @(
        $exportDaten |
        Sort-Object -Property nummer
    )

    if ($sortierteDaten.Count -eq 0) {
        throw @"
Es wurden keine Fahrer exportiert.

Geprüfte Quelle:
Blatt: Datenbank
Startnummer: Spalte A
Team: Spalte C
Anzeigename: Spalte E
"@
    }

    # --------------------------------------------------------
    # JSON SCHREIBEN
    # --------------------------------------------------------

    $json = ConvertTo-Json `
        -InputObject $sortierteDaten `
        -Depth 5

    $utf8OhneBom = New-Object `
        System.Text.UTF8Encoding($false)

    [System.IO.File]::WriteAllText(
        $jsonDatei,
        $json,
        $utf8OhneBom
    )

    # --------------------------------------------------------
    # ERGEBNIS ANZEIGEN
    # --------------------------------------------------------

    $mitFahrzeug = @(
        $sortierteDaten |
        Where-Object {
            -not [string]::IsNullOrWhiteSpace(
                $_.fahrzeug
            )
        }
    ).Count

    $ohneFahrzeug = (
        $sortierteDaten.Count -
        $mitFahrzeug
    )

    Write-Host ""
    Write-Host "Export erfolgreich!" -ForegroundColor Green
    Write-Host ""

    Write-Host "Exportierte Fahrer: $($sortierteDaten.Count)"
    Write-Host "Mit Saisonfahrzeug: $mitFahrzeug"
    Write-Host "Ohne Saisonfahrzeug: $ohneFahrzeug"

    Write-Host ""
    Write-Host "JSON-Datei:" -ForegroundColor Gray
    Write-Host $jsonDatei -ForegroundColor Yellow
    Write-Host ""

    Write-Host "Erste exportierte Fahrer:" -ForegroundColor Cyan

    $sortierteDaten |
        Select-Object -First 10 |
        Format-Table `
            nummer,
            fahrer,
            team,
            fahrzeug `
            -AutoSize
}
catch {
    Write-Host ""
    Write-Host "Export fehlgeschlagen:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""

    exit 1
}
finally {
    if ($null -ne $arbeitsmappe) {
        try {
            $arbeitsmappe.Close($false)
        }
        catch {
            # Bereinigung fortsetzen
        }
    }

    if ($null -ne $excel) {
        try {
            $excel.Quit()
        }
        catch {
            # Bereinigung fortsetzen
        }
    }

    Remove-ComObject $saison
    Remove-ComObject $datenbank
    Remove-ComObject $arbeitsmappe
    Remove-ComObject $excel

    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}