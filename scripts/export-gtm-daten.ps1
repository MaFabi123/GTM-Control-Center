# ============================================================
# GTM CONTROL CENTER – ZENTRALER DATENEXPORT
#
# Quellen:
#   Datenbank
#   GTM Masters Saison 1
#   GTM Masters S1 Kalender
#   Fahrzeuge
#
# Fahrerbilder:
#   Eingebettete Bilder aus Spalte F des Blatts "Datenbank"
#
# Ausgaben:
#   data/json/startnummern.json
#   data/json/fahrer.json
#   data/json/teams.json
#   data/json/meisterschaft.json
#   data/json/kalender.json
#   data/json/fahrzeuge.json
#   data/json/dashboard.json
#
# Fahrerbilder:
#   assets/images/fahrer/STARTNUMMER.png
# ============================================================

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# EINSTELLUNGEN
# ------------------------------------------------------------

$excelDatei = `
    "C:\Users\mafab\OneDrive\Dokumente\GTM\GTM Datenbank vers.2.0.xlsx"
$strafencenterDatei = `
    "C:\Users\mafab\OneDrive\Dokumente\GTM\GTM Strafencenter 2.0.xlsx"

$blattStrafenhistorie = "Strafenhistorie"
$blattStrafenkonto = "Strafenkonto"

$projektOrdner = Split-Path -Parent $PSScriptRoot

$jsonOrdner = Join-Path `
    $projektOrdner `
    "data\json"

$fahrerBildOrdner = Join-Path `
    $projektOrdner `
    "assets\images\fahrer"

$blattDatenbank = "Datenbank"
$blattSaison = "GTM Masters Saison 1"
$blattKalender = "GTM Masters S1 Kalender"
$blattFahrzeuge = "Fahrzeuge"

$xlUp = -4162

# ------------------------------------------------------------
# HILFSFUNKTIONEN
# ------------------------------------------------------------

function Get-CellText {
    param (
        $Worksheet,
        [int]$Row,
        [int]$Column
    )

    $value = $Worksheet.Cells.Item(
        $Row,
        $Column
    ).Value2

    if ($null -eq $value) {
        return ""
    }

    return ([string]$value).Trim()
}

function Get-CellNumber {
    param (
        $Worksheet,
        [int]$Row,
        [int]$Column
    )

    $value = $Worksheet.Cells.Item(
        $Row,
        $Column
    ).Value2

    if (
        $null -eq $value -or
        $value -eq ""
    ) {
        return 0
    }

    $number = 0.0

    if (
        [double]::TryParse(
            ([string]$value),
            [ref]$number
        )
    ) {
        return $number
    }

    return 0
}

function Get-ValidStartnummer {
    param (
        $Value
    )

    if ($null -eq $Value) {
        return $null
    }

    $text = ([string]$Value).Trim()

    # Unterstützt auch Werte wie "# 89" oder "#89"
    $text = $text -replace "[^0-9]", ""

    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    $number = 0

    if (
        -not [int]::TryParse(
            $text,
            [ref]$number
        )
    ) {
        return $null
    }

    if (
        $number -lt 1 -or
        $number -gt 999
    ) {
        return $null
    }

    return $number
}

function Convert-ExcelDate {
    param (
        $Value
    )

    if (
        $null -eq $Value -or
        $Value -eq ""
    ) {
        return $null
    }

    try {
        $date = [DateTime]::FromOADate(
            [double]$Value
        )

        return $date.ToString(
            "yyyy-MM-dd"
        )
    }
    catch {
        return ([string]$Value).Trim()
    }
}

function Write-JsonFile {
    param (
        [string]$FileName,
        $Data
    )

    $path = Join-Path `
        $jsonOrdner `
        $FileName

    $json = ConvertTo-Json `
        -InputObject $Data `
        -Depth 15

    $utf8WithoutBom = New-Object `
        System.Text.UTF8Encoding($false)

    [System.IO.File]::WriteAllText(
        $path,
        $json,
        $utf8WithoutBom
    )

    Write-Host `
        "Erstellt: $FileName" `
        -ForegroundColor Green
}

function Release-ComObject {
    param (
        $Object
    )

    if ($null -eq $Object) {
        return
    }

    try {
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject(
            $Object
        )
    }
    catch {
        # Fehler bei der COM-Bereinigung ignorieren
    }
}

function Export-ExcelCellImage {
    param (
        $Worksheet,
        [int]$Row,
        [int]$Column,
        [string]$OutputPath
    )

    $cell = $null
    $picture = $null
    $chartObject = $null
    $chart = $null

    try {
        $cell = $Worksheet.Cells.Item(
            $Row,
            $Column
        )

        foreach ($shape in $Worksheet.Shapes) {
            $topLeftCell = $null

            try {
                $topLeftCell = $shape.TopLeftCell

                $gleicheZeile =
                    [int]$topLeftCell.Row -eq $Row

                $gleicheSpalte =
                    [int]$topLeftCell.Column -eq $Column

                if ($gleicheZeile -and $gleicheSpalte) {
                    $picture = $shape
                    break
                }
            }
            catch {
                # Nicht verwendbare Formen überspringen
            }
            finally {
                Release-ComObject $topLeftCell
            }
        }

        if ($null -eq $picture) {
            Write-Host `
                "Kein Bildobjekt in Zeile $Row gefunden." `
                -ForegroundColor Yellow

            return $false
        }

        if (Test-Path -LiteralPath $OutputPath) {
            Remove-Item `
                -LiteralPath $OutputPath `
                -Force
        }

        $picture.CopyPicture(
            1,
            2
        )

        Start-Sleep -Milliseconds 500

        $width = [Math]::Max(
            [double]$picture.Width,
            200
        )

        $height = [Math]::Max(
            [double]$picture.Height,
            200
        )

        $chartObject = $Worksheet.ChartObjects().Add(
            0,
            0,
            $width,
            $height
        )

        $chart = $chartObject.Chart

        $chart.Paste()

        Start-Sleep -Milliseconds 500

        $exportiert = $chart.Export(
            $OutputPath,
            "PNG"
        )

        return (
            $exportiert -and
            (Test-Path -LiteralPath $OutputPath) -and
            ((Get-Item $OutputPath).Length -gt 1000)
        )
    }
    catch {
        Write-Host `
            "Fahrerbild in Zeile $Row konnte nicht exportiert werden: $($_.Exception.Message)" `
            -ForegroundColor Yellow

        return $false
    }
    finally {
        if ($null -ne $chartObject) {
            try {
                $chartObject.Delete()
            }
            catch {
                # Ignorieren
            }
        }

        Release-ComObject $chart
        Release-ComObject $chartObject
        Release-ComObject $cell
    }
}

# ------------------------------------------------------------
# ORDNER UND DATEIEN PRÜFEN
# ------------------------------------------------------------

if (-not (Test-Path -LiteralPath $excelDatei)) {
    throw "Excel-Datei nicht gefunden: $excelDatei"
}
if (-not (Test-Path -LiteralPath $strafencenterDatei)) {
    throw "Strafencenter-Datei nicht gefunden: $strafencenterDatei"
}

if (-not (Test-Path -LiteralPath $jsonOrdner)) {
    New-Item `
        -ItemType Directory `
        -Path $jsonOrdner `
        -Force |
        Out-Null
}

if (-not (Test-Path -LiteralPath $fahrerBildOrdner)) {
    New-Item `
        -ItemType Directory `
        -Path $fahrerBildOrdner `
        -Force |
        Out-Null
}

# ------------------------------------------------------------
# COM-OBJEKTE VORBEREITEN
# ------------------------------------------------------------

$excel = $null

$workbook = $null
$strafencenterWorkbook = $null

$datenbankSheet = $null
$saisonSheet = $null
$kalenderSheet = $null
$fahrzeugeSheet = $null

$strafenhistorieSheet = $null
$strafenkontoSheet = $null

try {
    Write-Host ""
    Write-Host `
        "GTM-Datenexport wird gestartet ..." `
        -ForegroundColor Cyan

    Write-Host `
        $excelDatei `
        -ForegroundColor Yellow

    Write-Host ""

    # --------------------------------------------------------
    # EXCEL ÖFFNEN
    # --------------------------------------------------------

    $excel = New-Object `
        -ComObject Excel.Application

    $excel.Visible = $true
    $excel.DisplayAlerts = $false
    $excel.ScreenUpdating = $true

    $workbook = $excel.Workbooks.Open(
        $excelDatei,
        0,
        $true
    )
    $strafencenterWorkbook = $excel.Workbooks.Open(
    $strafencenterDatei,
    0,
    $true
)

$strafenhistorieSheet =
    $strafencenterWorkbook.Worksheets.Item(
        $blattStrafenhistorie
    )

$strafenkontoSheet =
    $strafencenterWorkbook.Worksheets.Item(
        $blattStrafenkonto
    )

    $datenbankSheet = $workbook.Worksheets.Item(
        $blattDatenbank
    )

    $saisonSheet = $workbook.Worksheets.Item(
        $blattSaison
    )

    $kalenderSheet = $workbook.Worksheets.Item(
        $blattKalender
    )

    $fahrzeugeSheet = $workbook.Worksheets.Item(
        $blattFahrzeuge
    )

    # ========================================================
    # FAHRERBILDER AUS DEM BLATT "DATENBANK"
    #
    # A = Fahrernummer
    # F = eingebettetes Fahrerbild
    # ========================================================

    $bildNachNummer = @{}

    $letzteDatenbankZeile = $datenbankSheet.Cells.Item(
        $datenbankSheet.Rows.Count,
        1
    ).End($xlUp).Row

    for (
        $row = 2;
        $row -le $letzteDatenbankZeile;
        $row++
    ) {
        $nummer = Get-ValidStartnummer(
            $datenbankSheet.Cells.Item(
                $row,
                1
            ).Value2
        )

        if ($null -eq $nummer) {
            continue
        }

        $bildDatei = "$nummer.png"

        $bildPfad = Join-Path `
            $fahrerBildOrdner `
            $bildDatei

        $bildZellwert = $datenbankSheet.Cells.Item(
            $row,
            6
        ).Value2

        $hatBild = (
            $null -ne $bildZellwert -and
            ([string]$bildZellwert).Trim() -ne ""
        )

        if ($hatBild) {
            $exportErfolgreich = Export-ExcelCellImage `
                -Worksheet $datenbankSheet `
                -Row $row `
                -Column 6 `
                -OutputPath $bildPfad

            if ($exportErfolgreich) {
                $bildNachNummer[$nummer] = $bildDatei

                Write-Host `
                    "Fahrerbild exportiert: $bildDatei" `
                    -ForegroundColor DarkGreen

                continue
            }
        }

        $bildNachNummer[$nummer] = "default.png"
    }    # ========================================================
    # 1. SAISONFAHRER UND MEISTERSCHAFT
    #
    # GTM Masters Saison 1:
    # A  = Platzierung
    # B  = Startnummer
    # D  = Anzeigename
    # E  = Team
    # F  = Teamzuordnung
    # G  = Fahrzeug
    # AN = Wertung
    # AO = Fast Lap
    # AP = Fahrzeugwechsel
    # AQ = Endwertung
    # ========================================================

    $saisonFahrer = New-Object `
        System.Collections.Generic.List[object]

    $fahrzeugNachNummer = @{}

    $letzteSaisonZeile = $saisonSheet.Cells.Item(
        $saisonSheet.Rows.Count,
        2
    ).End($xlUp).Row

    for (
        $row = 2;
        $row -le $letzteSaisonZeile;
        $row++
    ) {
        $nummer = Get-ValidStartnummer(
            $saisonSheet.Cells.Item(
                $row,
                2
            ).Value2
        )

        if ($null -eq $nummer) {
            continue
        }

        $name = Get-CellText `
            -Worksheet $saisonSheet `
            -Row $row `
            -Column 4

        if ([string]::IsNullOrWhiteSpace($name)) {
            continue
        }

        $team = Get-CellText `
            -Worksheet $saisonSheet `
            -Row $row `
            -Column 5

        $teamZuordnung = Get-CellText `
            -Worksheet $saisonSheet `
            -Row $row `
            -Column 6

        $fahrzeug = Get-CellText `
            -Worksheet $saisonSheet `
            -Row $row `
            -Column 7

        $bild = "default.png"

        if ($bildNachNummer.ContainsKey($nummer)) {
            $bild = $bildNachNummer[$nummer]
        }

        $platzierung = [int](
            Get-CellNumber `
                -Worksheet $saisonSheet `
                -Row $row `
                -Column 1
        )

        $wertung = Get-CellNumber `
            -Worksheet $saisonSheet `
            -Row $row `
            -Column 40

        $fastLap = Get-CellNumber `
            -Worksheet $saisonSheet `
            -Row $row `
            -Column 41

        $fahrzeugwechsel = Get-CellNumber `
            -Worksheet $saisonSheet `
            -Row $row `
            -Column 42

        $endwertung = Get-CellNumber `
            -Worksheet $saisonSheet `
            -Row $row `
            -Column 43

        if (
            [string]::IsNullOrWhiteSpace(
                $teamZuordnung
            )
        ) {
            $teamZuordnung = $team
        }

        if (
            -not [string]::IsNullOrWhiteSpace(
                $fahrzeug
            )
        ) {
            $fahrzeugNachNummer[$nummer] = $fahrzeug
        }

        $saisonFahrer.Add(
            [PSCustomObject][ordered]@{
                platzierung     = $platzierung
                nummer          = $nummer
                name            = $name
                team            = $team
                teamZuordnung   = $teamZuordnung
                fahrzeug        = $fahrzeug
                bild            = $bild
                wertung         = $wertung
                fastLap         = $fastLap
                fahrzeugwechsel = $fahrzeugwechsel
                punkte          = $endwertung
            }
        )
    }

        $saisonFahrerSortiert = @(
        $saisonFahrer |
        Sort-Object `
            @{
                Expression = "platzierung"
                Ascending = $true
            },
            @{
                Expression = "nummer"
                Ascending = $true
            }
    )

    # --------------------------------------------------------
    # Saisonfahrer nach Startnummer merken
    # --------------------------------------------------------

    $saisonNachNummer = @{}

    foreach ($saisonEintrag in $saisonFahrerSortiert) {
        $saisonNachNummer[
            [int]$saisonEintrag.nummer
        ] = $saisonEintrag
    }

    # --------------------------------------------------------
    # Meisterschaft enthält weiterhin nur Saisonfahrer
    # --------------------------------------------------------

    $meisterschaft = [PSCustomObject][ordered]@{
        saison = "GTM Masters Saison 1"
        status = "läuft"
        fahrerwertung = $saisonFahrerSortiert
    }

    Write-JsonFile `
        -FileName "meisterschaft.json" `
        -Data $meisterschaft

    # ========================================================
    # 2. ALLE GTM-FAHRER AUS DEM BLATT "DATENBANK"
    #
    # A = Fahrernummer
    # C = Team
    # E = Anzeigename
    #
    # Saisonwerte werden ergänzt, falls der Fahrer
    # in "GTM Masters Saison 1" enthalten ist.
    # ========================================================

    $alleFahrer = New-Object `
        System.Collections.Generic.List[object]

    $startnummern = New-Object `
        System.Collections.Generic.List[object]

    $verwendeteNummern = @{}

    for (
        $row = 2;
        $row -le $letzteDatenbankZeile;
        $row++
    ) {
        $nummer = Get-ValidStartnummer(
            $datenbankSheet.Cells.Item(
                $row,
                1
            ).Value2
        )

        if ($null -eq $nummer) {
            continue
        }

        if ($verwendeteNummern.ContainsKey($nummer)) {
            continue
        }

        $name = Get-CellText `
            -Worksheet $datenbankSheet `
            -Row $row `
            -Column 5

        if ([string]::IsNullOrWhiteSpace($name)) {
            continue
        }

        $team = Get-CellText `
            -Worksheet $datenbankSheet `
            -Row $row `
            -Column 3

        $bild = "default.png"

        if ($bildNachNummer.ContainsKey($nummer)) {
            $bild = $bildNachNummer[$nummer]
        }

        $aktiveSaison = $false
        $platzierung = 0
        $fahrzeug = ""
        $wertung = 0
        $fastLap = 0
        $fahrzeugwechsel = 0
        $punkte = 0
        $teamZuordnung = $team

        if ($saisonNachNummer.ContainsKey($nummer)) {
            $saisonEintrag =
                $saisonNachNummer[$nummer]

            $aktiveSaison = $true
            $platzierung = $saisonEintrag.platzierung
            $fahrzeug = $saisonEintrag.fahrzeug
            $wertung = $saisonEintrag.wertung
            $fastLap = $saisonEintrag.fastLap
            $fahrzeugwechsel =
                $saisonEintrag.fahrzeugwechsel
            $punkte = $saisonEintrag.punkte

            if (
                -not [string]::IsNullOrWhiteSpace(
                    $saisonEintrag.team
                )
            ) {
                $team = $saisonEintrag.team
            }

            if (
                -not [string]::IsNullOrWhiteSpace(
                    $saisonEintrag.teamZuordnung
                )
            ) {
                $teamZuordnung =
                    $saisonEintrag.teamZuordnung
            }
        }

        # ----------------------------------------------------
        # Alle GTM-Fahrer
        # ----------------------------------------------------

        $alleFahrer.Add(
            [PSCustomObject][ordered]@{
                nummer          = $nummer
                name            = $name
                team            = $team
                teamZuordnung   = $teamZuordnung
                bild            = $bild
                aktiveSaison    = $aktiveSaison
                platzierung     = $platzierung
                fahrzeug        = $fahrzeug
                wertung         = $wertung
                fastLap         = $fastLap
                fahrzeugwechsel = $fahrzeugwechsel
                punkte          = $punkte
            }
        )

        # ----------------------------------------------------
        # Öffentliche Startnummernliste
        # ----------------------------------------------------

        $startnummern.Add(
            [PSCustomObject][ordered]@{
                nummer   = $nummer
                status   = "vergeben"
                fahrer   = $name
                team     = $team
                fahrzeug = $fahrzeug
                bild     = $bild
            }
        )

        $verwendeteNummern[$nummer] = $true
    }

    $alleFahrerSortiert = @(
        $alleFahrer |
        Sort-Object `
            @{
                Expression = "aktiveSaison"
                Descending = $true
            },
            @{
                Expression = "platzierung"
                Ascending = $true
            },
            @{
                Expression = "nummer"
                Ascending = $true
            }
    )

    $startnummernSortiert = @(
        $startnummern |
        Sort-Object -Property nummer
    )

    Write-JsonFile `
        -FileName "fahrer.json" `
        -Data $alleFahrerSortiert

    Write-JsonFile `
        -FileName "startnummern.json" `
        -Data $startnummernSortiert

    $meisterschaft = [PSCustomObject][ordered]@{
        saison = "GTM Masters Saison 1"
        status = "läuft"
        fahrerwertung = $saisonFahrerSortiert
    }

    Write-JsonFile `
        -FileName "meisterschaft.json" `
        -Data $meisterschaft

    # ========================================================
    # 2. STARTNUMMERN AUS DEM BLATT "DATENBANK"
    #
    # A = Fahrernummer
    # C = Team
    # E = Anzeigename
    # F = Fahrerbild
    # ========================================================

    $startnummern = New-Object `
        System.Collections.Generic.List[object]

    $verwendeteNummern = @{}

    for (
        $row = 2;
        $row -le $letzteDatenbankZeile;
        $row++
    ) {
        $nummer = Get-ValidStartnummer(
            $datenbankSheet.Cells.Item(
                $row,
                1
            ).Value2
        )

        if ($null -eq $nummer) {
            continue
        }

        if ($verwendeteNummern.ContainsKey($nummer)) {
            continue
        }

        $name = Get-CellText `
            -Worksheet $datenbankSheet `
            -Row $row `
            -Column 5

        if ([string]::IsNullOrWhiteSpace($name)) {
            continue
        }

        $team = Get-CellText `
            -Worksheet $datenbankSheet `
            -Row $row `
            -Column 3

        $fahrzeug = ""

        if ($fahrzeugNachNummer.ContainsKey($nummer)) {
            $fahrzeug = $fahrzeugNachNummer[$nummer]
        }

        $bild = "default.png"

        if ($bildNachNummer.ContainsKey($nummer)) {
            $bild = $bildNachNummer[$nummer]
        }

        $startnummern.Add(
            [PSCustomObject][ordered]@{
                nummer   = $nummer
                status   = "vergeben"
                fahrer   = $name
                team     = $team
                fahrzeug = $fahrzeug
                bild     = $bild
            }
        )

        $verwendeteNummern[$nummer] = $true
    }

    $startnummernSortiert = @(
        $startnummern |
        Sort-Object -Property nummer
    )

    Write-JsonFile `
        -FileName "startnummern.json" `
        -Data $startnummernSortiert

    # ========================================================
    # 3. TEAMS AUS DER AKTUELLEN SAISON
    # ========================================================

    $teamsGruppiert = $saisonFahrerSortiert |
        Where-Object {
            -not [string]::IsNullOrWhiteSpace(
                $_.teamZuordnung
            )
        } |
        Group-Object -Property teamZuordnung

    $teams = New-Object `
        System.Collections.Generic.List[object]

    foreach ($gruppe in $teamsGruppiert) {
        $fahrerDesTeams = @(
            $gruppe.Group |
            Sort-Object -Property platzierung
        )

        $punkteGesamt = (
            $fahrerDesTeams |
            Measure-Object `
                -Property punkte `
                -Sum
        ).Sum

        if ($null -eq $punkteGesamt) {
            $punkteGesamt = 0
        }

        $teams.Add(
            [PSCustomObject][ordered]@{
                name = $gruppe.Name

                punkte = $punkteGesamt

                anzahlFahrer = $fahrerDesTeams.Count

                fahrzeuge = @(
                    $fahrerDesTeams |
                    Select-Object `
                        -ExpandProperty fahrzeug `
                        -Unique |
                    Where-Object {
                        -not [string]::IsNullOrWhiteSpace($_)
                    }
                )

                fahrer = @(
                    $fahrerDesTeams |
                    ForEach-Object {
                        [PSCustomObject][ordered]@{
                            nummer       = $_.nummer
                            name         = $_.name
                            bild         = $_.bild
                            fahrzeug     = $_.fahrzeug
                            punkte       = $_.punkte
                            platzierung  = $_.platzierung
                        }
                    }
                )
            }
        )
    }

    $teamsSortiert = @(
        $teams |
        Sort-Object `
            @{
                Expression = "punkte"
                Descending = $true
            },
            @{
                Expression = "name"
                Ascending = $true
            }
    )

    $teamPosition = 1

    foreach ($team in $teamsSortiert) {
        $team |
            Add-Member `
                -NotePropertyName platzierung `
                -NotePropertyValue $teamPosition

        $teamPosition++
    }

    Write-JsonFile `
        -FileName "teams.json" `
        -Data $teamsSortiert    
    # ========================================================

    # ========================================================
    # 4. RENNKALENDER, TIME ATTACK UND FUN EVENTS
    #
    # Automatisch unterstützte Kalenderblätter:
    #
    # GTM Masters S1 Kalender
    # GTM Masters Saison 2 Kalender
    # TA Saison 2026 Kalender
    # GTM TA S2027 Kalender
    #
    # Masters-Kalenderspalten:
    #
    # A = Laufnummer
    # B = Strecke
    # C = Datum
    # D = Abgeschlossen
    # E = Aktuell
    # F = Nächster
    #
    # TA-Kalenderspalten:
    #
    # A = Runde
    # B = Strecke
    # C = Zeitraum, zum Beispiel 01.01.–18.01.
    #
    # Automatisch unterstützte FUN-Event-Blätter:
    #
    # FUN-Event Laguna Seca 26.07.26
    # FUN-Event Oulton Park 02.08.26
    #
    # Der leere Reiter "FUN-Event" bleibt eine Vorlage und
    # wird nicht veröffentlicht.
    # ========================================================

    function ConvertTo-KalenderBoolean {
        param (
            [AllowNull()]
            [object]$Wert
        )

        if ($null -eq $Wert) {
            return $false
        }

        $text = ([string]$Wert).Trim().ToLowerInvariant()

        return (
            $text -eq "ja" -or
            $text -eq "j" -or
            $text -eq "true" -or
            $text -eq "wahr" -or
            $text -eq "1" -or
            $text -eq "x"
        )
    }

    $kalender = New-Object `
        System.Collections.Generic.List[object]

    $funEventQuellen = New-Object `
        System.Collections.Generic.List[object]

    $taKalenderQuellen = New-Object `
        System.Collections.Generic.List[object]

    function Add-KalenderDaten {
        param (
            [Parameter(Mandatory = $true)]
            [object]$Worksheet,

            [Parameter(Mandatory = $true)]
            [string]$SerieId,

            [Parameter(Mandatory = $true)]
            [string]$SerieName,

            [Parameter(Mandatory = $true)]
            [string]$Format,

            [Parameter(Mandatory = $true)]
            [int]$Saison
        )

        $letzteKalenderZeile = $Worksheet.Cells.Item(
            $Worksheet.Rows.Count,
            1
        ).End($xlUp).Row

        for (
            $row = 2;
            $row -le $letzteKalenderZeile;
            $row++
        ) {
            $laufnummer = [int](
                Get-CellNumber `
                    -Worksheet $Worksheet `
                    -Row $row `
                    -Column 1
            )

            $strecke = Get-CellText `
                -Worksheet $Worksheet `
                -Row $row `
                -Column 2

            if (
                $laufnummer -le 0 -or
                [string]::IsNullOrWhiteSpace($strecke)
            ) {
                continue
            }

            $datumRoh = $Worksheet.Cells.Item(
                $row,
                3
            ).Value2

            $datum = ""

            if (
                $null -ne $datumRoh -and
                -not [string]::IsNullOrWhiteSpace(
                    [string]$datumRoh
                )
            ) {
                $datum = Convert-ExcelDate $datumRoh
            }

            $abgeschlossenText = Get-CellText `
                -Worksheet $Worksheet `
                -Row $row `
                -Column 4

            $aktuellText = Get-CellText `
                -Worksheet $Worksheet `
                -Row $row `
                -Column 5

            $naechsterText = Get-CellText `
                -Worksheet $Worksheet `
                -Row $row `
                -Column 6

            $abgeschlossen = ConvertTo-KalenderBoolean `
                -Wert $abgeschlossenText

            $aktuell = ConvertTo-KalenderBoolean `
                -Wert $aktuellText

            $naechster = ConvertTo-KalenderBoolean `
                -Wert $naechsterText

            $status = "bevorstehend"

            if ($abgeschlossen) {
                $status = "abgeschlossen"
            }
            elseif ($aktuell) {
                $status = "aktuell"
            }
            elseif ($naechster) {
                $status = "nächster"
            }

            $saisonId = "{0}-s{1}" -f `
                $SerieId,
                $Saison

            $saisonName = "{0} Saison {1}" -f `
                $SerieName,
                $Saison

            $terminId = "{0}-lauf-{1}" -f `
                $saisonId,
                $laufnummer

            [void]$kalender.Add(
                [PSCustomObject][ordered]@{
                    id            = $terminId
                    modul         = $SerieId
                    format        = $Format
                    serieId       = $SerieId
                    serie         = $SerieName
                    saisonId      = $saisonId
                    saison        = $Saison
                    saisonName    = $saisonName
                    laufnummer    = $laufnummer
                    strecke       = $strecke
                    datum         = $datum
                    abgeschlossen = $abgeschlossen
                    aktuell       = $aktuell
                    naechster     = $naechster
                    status        = $status
                }
            )
        }
    }

    function Add-TimeAttackKalenderQuelle {
        param (
            [Parameter(Mandatory = $true)]
            [object]$Worksheet,

            [Parameter(Mandatory = $true)]
            [int]$Saison
        )

        $letzteZeile = $Worksheet.Cells.Item(
            $Worksheet.Rows.Count,
            1
        ).End($xlUp).Row

        for (
            $row = 2;
            $row -le $letzteZeile;
            $row++
        ) {
            $runde = [int](
                Get-CellNumber `
                    -Worksheet $Worksheet `
                    -Row $row `
                    -Column 1
            )

            $strecke = Get-CellText `
                -Worksheet $Worksheet `
                -Row $row `
                -Column 2

            $zeitraum = Get-CellText `
                -Worksheet $Worksheet `
                -Row $row `
                -Column 3

            if (
                $runde -le 0 -or
                [string]::IsNullOrWhiteSpace($strecke) -or
                [string]::IsNullOrWhiteSpace($zeitraum)
            ) {
                continue
            }

            $zeitraumTreffer = [regex]::Match(
                $zeitraum,
                "^\s*(\d{2})\.(\d{2})\.\s*[^0-9]+\s*(\d{2})\.(\d{2})\.\s*$"
            )

            if (-not $zeitraumTreffer.Success) {
                Write-Warning (
                    "TA-Zeitraum in Zeile {0} konnte nicht gelesen werden: {1}" -f
                    $row,
                    $zeitraum
                )

                continue
            }

            $startTag = [int]$zeitraumTreffer.Groups[1].Value
            $startMonat = [int]$zeitraumTreffer.Groups[2].Value
            $endeTag = [int]$zeitraumTreffer.Groups[3].Value
            $endeMonat = [int]$zeitraumTreffer.Groups[4].Value
            $endeJahr = $Saison

            if ($endeMonat -lt $startMonat) {
                $endeJahr++
            }

            try {
                $startDatum = [datetime]::new(
                    $Saison,
                    $startMonat,
                    $startTag
                ).Date

                $endeDatum = [datetime]::new(
                    $endeJahr,
                    $endeMonat,
                    $endeTag
                ).Date
            }
            catch {
                Write-Warning (
                    "Ungültiger TA-Zeitraum in Zeile {0}: {1}" -f
                    $row,
                    $zeitraum
                )

                continue
            }

            [void]$taKalenderQuellen.Add(
                [PSCustomObject][ordered]@{
                    saison     = $Saison
                    runde      = $runde
                    strecke    = $strecke.Trim()
                    zeitraum   = $zeitraum.Trim()
                    startDatum = $startDatum
                    endeDatum  = $endeDatum
                }
            )
        }
    }

    function Add-FunEventQuelle {
        param (
            [Parameter(Mandatory = $true)]
            [object]$Worksheet,

            [Parameter(Mandatory = $true)]
            [string]$BlattName
        )

        $strecke = Get-CellText `
            -Worksheet $Worksheet `
            -Row 2 `
            -Column 5

        $datumRoh = $Worksheet.Cells.Item(
            2,
            8
        ).Value2

        if (
            [string]::IsNullOrWhiteSpace($strecke) -or
            $null -eq $datumRoh -or
            [string]::IsNullOrWhiteSpace([string]$datumRoh)
        ) {
            Write-Warning (
                "FUN-Event ohne Strecke oder Datum übersprungen: {0}" -f
                $BlattName
            )

            return
        }

        $datum = Convert-ExcelDate $datumRoh

        try {
            $datumObjekt = [datetime]::ParseExact(
                $datum,
                "yyyy-MM-dd",
                [System.Globalization.CultureInfo]::InvariantCulture
            )
        }
        catch {
            Write-Warning (
                "FUN-Event mit ungültigem Datum übersprungen: {0}" -f
                $BlattName
            )

            return
        }

        $eventName = $BlattName -replace "^FUN-Event\s+", ""
        $eventName = $eventName -replace "\s+\d{2}\.\d{2}\.\d{2,4}$", ""

        [void]$funEventQuellen.Add(
            [PSCustomObject][ordered]@{
                blattName  = $BlattName
                eventName  = $eventName
                strecke    = $strecke
                datum      = $datum
                datumWert  = $datumObjekt.Date
                jahr       = $datumObjekt.Year
            }
        )
    }

    $arbeitsmappe = $kalenderSheet.Parent
    $anzahlKalenderquellen = 0
    $anzahlMastersKalender = 0
    $anzahlTaKalender = 0
    $anzahlFunEvents = 0

    for (
        $blattIndex = 1;
        $blattIndex -le $arbeitsmappe.Worksheets.Count;
        $blattIndex++
    ) {
        $blatt = $arbeitsmappe.Worksheets.Item(
            $blattIndex
        )

        $blattName = [string]$blatt.Name

        $mastersTreffer = [regex]::Match(
            $blattName,
            "^(?:GTM\s+)?Masters\s+S(?:aison\s*)?(\d+)\s+Kalender$",
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )

        if ($mastersTreffer.Success) {
            $saisonNummer = [int]$mastersTreffer.Groups[1].Value

            Write-Host (
                "Masters-Kalender erkannt: {0}" -f
                $blattName
            ) -ForegroundColor Cyan

            Add-KalenderDaten `
                -Worksheet $blatt `
                -SerieId "masters" `
                -SerieName "GTM Masters" `
                -Format "rennen" `
                -Saison $saisonNummer

            $anzahlMastersKalender++
            $anzahlKalenderquellen++

            continue
        }

        $taTreffer = [regex]::Match(
            $blattName,
            "^(?:GTM\s+)?TA\s+S(?:aison\s*)?(\d+)\s+Kalender$",
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )

        if ($taTreffer.Success) {
            $saisonNummer = [int]$taTreffer.Groups[1].Value

            Write-Host (
                "TA-Kalender erkannt: {0}" -f
                $blattName
            ) -ForegroundColor Cyan

            $vorherigeAnzahl = $taKalenderQuellen.Count

            Add-TimeAttackKalenderQuelle `
                -Worksheet $blatt `
                -Saison $saisonNummer

            if ($taKalenderQuellen.Count -gt $vorherigeAnzahl) {
                $anzahlTaKalender++
                $anzahlKalenderquellen++
            }

            continue
        }

        $istKonkretesFunEvent = [regex]::IsMatch(
            $blattName,
            "^FUN-Event\s+.+$",
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )

        if ($istKonkretesFunEvent) {
            Write-Host (
                "FUN-Event erkannt: {0}" -f
                $blattName
            ) -ForegroundColor Cyan

            $vorherigeAnzahl = $funEventQuellen.Count

            Add-FunEventQuelle `
                -Worksheet $blatt `
                -BlattName $blattName

            if ($funEventQuellen.Count -gt $vorherigeAnzahl) {
                $anzahlFunEvents++
                $anzahlKalenderquellen++
            }
        }
    }

    $taTermineSortiert = @(
        $taKalenderQuellen |
        Sort-Object -Property startDatum, saison, runde
    )

    $naechsterTaTerminGesetzt = $false
    $heute = (Get-Date).Date

    foreach ($taTermin in $taTermineSortiert) {
        $abgeschlossen = $taTermin.endeDatum -lt $heute
        $aktuell = (
            $taTermin.startDatum -le $heute -and
            $taTermin.endeDatum -ge $heute
        )
        $naechster = $false

        if (
            $taTermin.startDatum -gt $heute -and
            -not $naechsterTaTerminGesetzt
        ) {
            $naechster = $true
            $naechsterTaTerminGesetzt = $true
        }

        $status = "bevorstehend"

        if ($abgeschlossen) {
            $status = "abgeschlossen"
        }
        elseif ($aktuell) {
            $status = "aktuell"
        }
        elseif ($naechster) {
            $status = "nächster"
        }

        $saisonId = "ta-s{0}" -f $taTermin.saison
        $saisonName = "GTM Time Attack Saison {0}" -f $taTermin.saison
        $terminId = "{0}-runde-{1}" -f $saisonId, $taTermin.runde

        [void]$kalender.Add(
            [PSCustomObject][ordered]@{
                id            = $terminId
                modul         = "ta"
                format        = "time-attack"
                serieId       = "ta"
                serie         = "GTM Time Attack"
                saisonId      = $saisonId
                saison        = [int]$taTermin.saison
                saisonName    = $saisonName
                laufnummer    = [int]$taTermin.runde
                strecke       = $taTermin.strecke
                zeitraum      = $taTermin.zeitraum
                datum         = $taTermin.startDatum.ToString("yyyy-MM-dd")
                datumBis      = $taTermin.endeDatum.ToString("yyyy-MM-dd")
                abgeschlossen = $abgeschlossen
                aktuell       = $aktuell
                naechster     = $naechster
                status        = $status
            }
        )
    }

    $funEventsSortiert = @(
        $funEventQuellen |
        Sort-Object -Property datumWert, eventName
    )

    $funZaehlerJeJahr = @{}
    $naechstesFunEventGesetzt = $false
    $heute = (Get-Date).Date

    foreach ($funEvent in $funEventsSortiert) {
        $jahrSchluessel = [string]$funEvent.jahr

        if (-not $funZaehlerJeJahr.ContainsKey($jahrSchluessel)) {
            $funZaehlerJeJahr[$jahrSchluessel] = 0
        }

        $funZaehlerJeJahr[$jahrSchluessel]++
        $laufnummer = [int]$funZaehlerJeJahr[$jahrSchluessel]

        $abgeschlossen = $funEvent.datumWert -lt $heute
        $aktuell = $funEvent.datumWert -eq $heute
        $naechster = $false

        if (
            $funEvent.datumWert -gt $heute -and
            -not $naechstesFunEventGesetzt
        ) {
            $naechster = $true
            $naechstesFunEventGesetzt = $true
        }

        $status = "bevorstehend"

        if ($abgeschlossen) {
            $status = "abgeschlossen"
        }
        elseif ($aktuell) {
            $status = "aktuell"
        }
        elseif ($naechster) {
            $status = "nächster"
        }

        $saisonId = "fun-{0}" -f $funEvent.jahr
        $saisonName = "GTM FUN Events {0}" -f $funEvent.jahr
        $terminId = "{0}-event-{1}" -f $saisonId, $laufnummer

        [void]$kalender.Add(
            [PSCustomObject][ordered]@{
                id            = $terminId
                modul         = "fun"
                format        = "fun-event"
                serieId       = "fun"
                serie         = "GTM FUN Events"
                saisonId      = $saisonId
                saison        = [int]$funEvent.jahr
                saisonName    = $saisonName
                laufnummer    = $laufnummer
                eventName     = $funEvent.eventName
                strecke       = $funEvent.strecke
                datum         = $funEvent.datum
                abgeschlossen = $abgeschlossen
                aktuell       = $aktuell
                naechster     = $naechster
                status        = $status
            }
        )
    }

    if ($anzahlKalenderquellen -eq 0) {
        throw "Keine gültigen Kalender- oder FUN-Event-Blätter gefunden."
    }

    $kalenderSortiert = @(
        $kalender |
        Sort-Object `
            -Property serieId, saison, laufnummer
    )

    if ($kalenderSortiert.Count -eq 0) {
        throw "Die erkannten Kalenderquellen enthalten keine gültigen Termine."
    }

    Write-JsonFile `
        -FileName "kalender.json" `
        -Data $kalenderSortiert

    Write-Host (
        "Kalenderexport abgeschlossen: {0} Masters-Kalender, {1} TA-Kalender, {2} FUN Events, {3} Termine." -f
        $anzahlMastersKalender,
        $anzahlTaKalender,
        $anzahlFunEvents,
        $kalenderSortiert.Count
    ) -ForegroundColor Green



    # =========================================================
    # 5. FAHRZEUGLISTE
    # =========================================================
    #
    # Zeile 3 enthält die Überschriften.
    #
    # A = Nr.
    # B = Hersteller
    # C = Anzeigename
    # D = Fahrzeug
    # E = Klasse
    # F = Baujahr
    # G = Inhalt / DLC
    # =========================================================

    $projektHauptordner = Split-Path `
        -Parent `
        $PSScriptRoot

    $fahrzeugBildZuordnungPfad = Join-Path `
        $projektHauptordner `
        "data\fahrzeug-bildzuordnung.csv"

    $fahrzeugBildZeilen = @()

    if (Test-Path -LiteralPath $fahrzeugBildZuordnungPfad)
    {
        $fahrzeugBildZeilen = @(
            Import-Csv `
                -LiteralPath $fahrzeugBildZuordnungPfad
        )
    }
    else
    {
        Write-Warning `
            "Die Fahrzeug-Bildzuordnung wurde nicht gefunden: $fahrzeugBildZuordnungPfad"
    }

    $fahrzeuge = New-Object `
        System.Collections.Generic.List[object]

    $letzteFahrzeugZeile = $fahrzeugeSheet.Cells.Item(
        $fahrzeugeSheet.Rows.Count,
        1
    ).End($xlUp).Row

    for (
        $row = 4;
        $row -le $letzteFahrzeugZeile;
        $row++
    )
    {
        $nummer = [int](
            Get-CellNumber `
                -Worksheet $fahrzeugeSheet `
                -Row $row `
                -Column 1
        )

        $anzeigename = Get-CellText `
            -Worksheet $fahrzeugeSheet `
            -Row $row `
            -Column 3

        if (
            $nummer -le 0 -or
            [string]::IsNullOrWhiteSpace($anzeigename)
        )
        {
            continue
        }

        $bild = [string](
            $fahrzeugBildZeilen |
                Where-Object {
                    [int]$_.nummer -eq $nummer
                } |
                Select-Object `
                    -First 1 `
                    -ExpandProperty bild
        )

        $fahrzeuge.Add(
            [PSCustomObject][ordered]@{
                nummer      = $nummer

                hersteller  = Get-CellText `
                    -Worksheet $fahrzeugeSheet `
                    -Row $row `
                    -Column 2

                anzeigename = $anzeigename

                fahrzeug    = Get-CellText `
                    -Worksheet $fahrzeugeSheet `
                    -Row $row `
                    -Column 4

                klasse      = Get-CellText `
                    -Worksheet $fahrzeugeSheet `
                    -Row $row `
                    -Column 5

                baujahr     = [int](
                    Get-CellNumber `
                        -Worksheet $fahrzeugeSheet `
                        -Row $row `
                        -Column 6
                )

                inhalt      = Get-CellText `
                    -Worksheet $fahrzeugeSheet `
                    -Row $row `
                    -Column 7

                bild        = $bild
            }
        )
    }

    $fahrzeugeSortiert = @(
        $fahrzeuge |
            Sort-Object -Property nummer
    )

    Write-JsonFile `
        -FileName "fahrzeuge.json" `
        -Data $fahrzeugeSortiert

    # ========================================================
    # 6. DASHBOARD
    # ========================================================

    $anzahlAbgeschlossen = @(
        $kalenderSortiert |
        Where-Object {
            $_.abgeschlossen -eq $true
        }
    ).Count

    $anzahlVerbleibend = (
        $kalenderSortiert.Count -
        $anzahlAbgeschlossen
    )

    $aktuellerLauf = $kalenderSortiert |
        Where-Object {
            $_.aktuell -eq $true
        } |
        Select-Object -First 1

    $naechsterLauf = $kalenderSortiert |
        Where-Object {
            $_.naechster -eq $true
        } |
        Select-Object -First 1

    $tabellenfuehrer = $saisonFahrerSortiert |
        Select-Object -First 1

    $topDrei = @(
        $saisonFahrerSortiert |
        Select-Object -First 3
    )

    $dashboard = [PSCustomObject][ordered]@{
        saison                    = "GTM Masters Saison 1"
        status                    = "läuft"
        aktiveFahrer              = $saisonFahrerSortiert.Count
        registrierteStartnummern  = $startnummernSortiert.Count
        teams                     = $teamsSortiert.Count
        rennenGesamt              = $kalenderSortiert.Count
        rennenAbgeschlossen       = $anzahlAbgeschlossen
        rennenVerbleibend         = $anzahlVerbleibend
        aktuellerLauf             = $aktuellerLauf
        naechsterLauf             = $naechsterLauf
        tabellenfuehrer           = $tabellenfuehrer
        topDrei                   = $topDrei
    }

    Write-JsonFile `
        -FileName "dashboard.json" `
        -Data $dashboard
       # ========================================================
    # 7. STRAFENCENTER
    #
    # Quelle: GTM Strafencenter 2.0.xlsx
    # Blatt: Strafenhistorie
    #
    # A = Fallnummer
    # B = laufende Fallnummer
    # C = Datum
    # D = Event
    # E = Rennen
    # F = Startnummer
    # G = Fahrer
    # H = Team
    # I = Vergehen / Begründung
    # J = Strafpunkte
    # K = Verwarnung
    # L = Gelbe Karte
    # M = Rennleitung
    # N = Rennsperre
    # O = Dauer Events
    # P = Verhängt nach Lauf
    # ========================================================

    $strafen = New-Object `
        System.Collections.Generic.List[object]

    $letzteStrafenZeile = $strafenhistorieSheet.Cells.Item(
        $strafenhistorieSheet.Rows.Count,
        1
    ).End($xlUp).Row

    for (
        $row = 4;
        $row -le $letzteStrafenZeile;
        $row++
    ) {
        $fallNummer = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 1

        if ([string]::IsNullOrWhiteSpace($fallNummer)) {
            continue
        }

        $datumRoh = $strafenhistorieSheet.Cells.Item(
            $row,
            3
        ).Value2

        $event = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 4

        $rennen = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 5

        $nummer = Get-ValidStartnummer(
            $strafenhistorieSheet.Cells.Item(
                $row,
                6
            ).Value2
        )

        $fahrer = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 7

        $team = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 8

        $vorfall = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 9

        $strafpunkte = Get-CellNumber `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 10

        $verwarnung = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 11

        $gelbeKarte = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 12

        $rennleitung = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 13

        $rennssperreText = Get-CellText `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 14

        $dauerEvents = Get-CellNumber `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 15

        $verhaengtNachLauf = Get-CellNumber `
            -Worksheet $strafenhistorieSheet `
            -Row $row `
            -Column 16

        $hatRennsperre = (
            -not [string]::IsNullOrWhiteSpace($rennssperreText) -and
            $rennssperreText.Trim().ToLower() -ne "nein"
        )

        $strafart = "Sonstige"

        if ($hatRennsperre) {
            $strafart = "Rennsperre"
        }
        elseif (
            -not [string]::IsNullOrWhiteSpace($gelbeKarte)
        ) {
            $strafart = "Gelbe Karte"
        }
        elseif (
            -not [string]::IsNullOrWhiteSpace($verwarnung)
        ) {
            $strafart = "Verwarnung"
        }
        elseif ($strafpunkte -gt 0) {
            $strafart = "Strafpunkte"
        }

        $status = "erledigt"

        if (
            $hatRennsperre -and
            $dauerEvents -gt 0
        ) {
            $status = "aktiv"
        }

        $strafen.Add(
            [PSCustomObject][ordered]@{
                fall              = $fallNummer
                datum             = Convert-ExcelDate $datumRoh
                event             = $event
                rennen            = $rennen
                strecke           = $event
                nummer            = $nummer
                fahrer            = $fahrer
                team              = $team
                vorfall           = $vorfall
                entscheidung      = $strafart
                strafart          = $strafart
                strafpunkte       = $strafpunkte
                verwarnung        = $verwarnung
                gelbeKarte        = $gelbeKarte
                rennleitung       = $rennleitung
                rennssperre       = $dauerEvents
                dauerEvents       = $dauerEvents
                verhaengtNachLauf = $verhaengtNachLauf
                status            = $status
            }
        )
    }

    $strafenSortiert = @(
        $strafen |
        Sort-Object `
            @{
                Expression = "datum"
                Descending = $true
            },
            @{
                Expression = "fall"
                Descending = $true
            }
    )

    Write-JsonFile `
        -FileName "strafen.json" `
        -Data $strafenSortiert
    # ========================================================
    # ABSCHLUSS
    # ========================================================

    $exportierteBilder = @(
        $bildNachNummer.GetEnumerator() |
        Where-Object {
            $_.Value -ne "default.png"
        }
    ).Count

    $standardBilder = @(
        $bildNachNummer.GetEnumerator() |
        Where-Object {
            $_.Value -eq "default.png"
        }
    ).Count

    Write-Host ""
    Write-Host `
        "Alle GTM-Daten wurden exportiert." `
        -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Fahrer: $($saisonFahrerSortiert.Count)"
    Write-Host "Startnummern: $($startnummernSortiert.Count)"
    Write-Host "Teams: $($teamsSortiert.Count)"
    Write-Host "Rennen: $($kalenderSortiert.Count)"
    Write-Host "Fahrzeuge: $($fahrzeugeSortiert.Count)"
    Write-Host "Fahrerbilder exportiert: $exportierteBilder"
    Write-Host "Standardbilder verwendet: $standardBilder"
    Write-Host ""}
catch {
    Write-Host ""
    Write-Host `
        "Export fehlgeschlagen:" `
        -ForegroundColor Red

    Write-Host `
        $_.Exception.Message `
        -ForegroundColor Red

    Write-Host ""

    exit 1
}
finally {
    if ($null -ne $strafencenterWorkbook) {
        try {
            $strafencenterWorkbook.Close($false)
        }
        catch {
            # Bereinigung fortsetzen
        }
    }

    if ($null -ne $workbook) {
        try {
            $workbook.Close($false)
        }
        catch {
            # Bereinigung fortsetzen
        }
    }

    if ($null -ne $excel) {
        try {
            $excel.ScreenUpdating = $true
        }
        catch {
            # Ignorieren
        }

        try {
            $excel.Quit()
        }
        catch {
            # Bereinigung fortsetzen
        }
    }

    Release-ComObject $strafenkontoSheet
    Release-ComObject $strafenhistorieSheet
    Release-ComObject $strafencenterWorkbook

    Release-ComObject $fahrzeugeSheet
    Release-ComObject $kalenderSheet
    Release-ComObject $saisonSheet
    Release-ComObject $datenbankSheet
    Release-ComObject $workbook
    Release-ComObject $excel

    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}