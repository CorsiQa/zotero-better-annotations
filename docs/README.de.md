# Better Annotations – Dokumentation

Better Annotations erweitert die Annotationsfarben des Zotero-Readers. Du kannst Farben umbenennen, ändern, weitere hinzufügen, umsortieren und mehrere Paletten als Profile speichern. Optionale Werkzeuge vergeben Labels als Tags, färben vorhandene Annotationen um und machen jede Änderung rückgängig.

English: [README.md](README.md)

## Inhalt

1. [Installation](#installation)
2. [Schnellstart](#schnellstart)
3. [Wo die Farben erscheinen](#wo-die-farben-erscheinen)
4. [Einstellungen: Farben & Profile](#einstellungen-farben--profile)
5. [Einstellungen: Darstellung](#einstellungen-darstellung)
6. [Einstellungen: Tags & Bibliothek](#einstellungen-tags--bibliothek)
7. [Einstellungen: Export](#einstellungen-export)
8. [Einstellungen: Über](#einstellungen-über)
9. [Updates](#updates)
10. [Sprachen](#sprachen)
11. [Daten und Datenschutz](#daten-und-datenschutz)
12. [Fehlerbehebung](#fehlerbehebung)

## Installation

1. Lade die neueste Datei `better-annotations-<version>.xpi` von der [Release-Seite](https://github.com/CorsiQa/zotero-better-annotations/releases) herunter.
2. Öffne in Zotero **Werkzeuge → Plugins**, klicke auf das Zahnrad und wähle **Plugin aus Datei installieren…**.
3. Wähle die heruntergeladene Datei aus.

Better Annotations ist mit Zotero 10 getestet und für Zotero ab Version 7 gebaut. Andere Plugins, die dieselben Menüs verändern (etwa „Zotero Highlight Color Descriptions“, „Annotation Color Customizer“ oder „Just Enough Color“), solltest du deaktivieren.

Das Plugin ändert vorhandene Annotationen nie von selbst. Deine Annotationen behalten nach der Installation ihre Farben. Beim ersten Start sichert das Plugin die Farben aller Annotationen.

## Schnellstart

1. Öffne **Bearbeiten → Einstellungen** (macOS: **Zotero → Einstellungen**) und wähle **Better Annotations**.
2. Aktiv ist die Vorlage **Zotero+**: die acht Zotero-Farben mit Labels für die Literaturarbeit und vier leere Farben.
3. Ändere ein Label oder klicke auf ein Farbfeld. Da Zotero+ eine eingebaute Vorlage ist, fragt **Speichern** nach einem Namen und legt dein eigenes Profil an.
4. Öffne ein PDF, markiere Text und wähle eine Farbe. Fährst du über eine Farbe, erscheint ihr Label.

## Wo die Farben erscheinen

| Ort | Was das Plugin tut |
|---|---|
| Rechtsklick auf eine Annotation | Zeigt deine Farben mit Labels. Die ersten 8 Farben (einstellbar) stehen direkt im Menü, alle weiteren im Untermenü **Weitere Farben**, danach folgt **Annotationsfarben anpassen…**. |
| Farbmenü der Werkzeugleiste | Dieselbe Liste; legt die Farbe der Werkzeuge für Hervorhebung, Unterstreichung, Notiz, Text, Bild und Freihand fest. |
| Popup nach dem Markieren | Zeigt alle sichtbaren Farben als Knöpfe, am Ende den Knopf zum Anpassen und das Label als Tooltip. |
| Werkzeugleiste des Readers | Profilauswahl und Anzahl der Annotationen im geöffneten Dokument. Beim Überfahren der Anzahl erscheint eine Aufschlüsselung nach Labels. |
| Seitenleiste der Annotationen | Der Farbfilter zeigt die Labels als Tooltips. |

Eine Farbe erscheint in den Menüs, wenn ihr Kontrollkästchen aktiviert und ihr Label nicht leer ist. Ein Label aus Leerzeichen zählt als Label.

## Einstellungen: Farben & Profile

### Profile

Ein Profil speichert eine vollständige Palette: Farben, Labels, Reihenfolge und Sichtbarkeit. Das aktive Profil bestimmt, was du im Reader siehst.

| Profil | Beschreibung |
|---|---|
| **Zotero+** | Eingebaute Standardvorlage. 12 Farben: die 8 Zotero-Farben sowie Türkis, Rosa, Indigo und Limette. Die ersten 8 tragen Labels für die Literaturarbeit: Kernaussage, Kritik / Limitation, Methode & Daten, Theorie & Definition, Forschungsfrage / Hypothese, Implikation, Forschungslücke, Hintergrund. Die 4 Zusatzfarben sind leer und deshalb ausgeblendet, bis du sie benennst. |
| **Zotero-Standard** | Zotero ohne Änderungen: 8 Farben mit Farbnamen. |
| Eigene Profile | Beliebig viele eigene Paletten. |

Eingebaute Vorlagen lassen sich nicht überschreiben. Speicherst du Änderungen an einer Vorlage, fragt das Plugin nach einem Namen und legt ein neues Profil an.

- **Neues Profil…** fragt, ob das Profil mit der aktuellen Palette (einschließlich ungespeicherter Änderungen) oder mit Zotero+ beginnen soll.
- **Umbenennen…** und **Löschen…** gelten für eigene Profile.
- **Profil exportieren…** speichert das angezeigte Profil als eigene JSON-Datei; der Dateiname enthält den Profilnamen. **Profil importieren…** übernimmt ein solches Profil und zeigt es an. So tauschst du Profile mit Kollegen aus, etwa wenn ihr gemeinsam in einer Gruppenbibliothek arbeitet. Existiert der Name bereits, erhält das importierte Profil eine Nummer.
- **Vorlagen ansehen** öffnet die Vorlagenbibliothek (siehe unten).

Wechselst du das Profil mit ungespeicherten Änderungen, fragt das Plugin, ob sie gespeichert werden sollen. Ein Profilwechsel ändert nie Annotationen, nur die angezeigten Labels.

### Vorlagenbibliothek

Die Bibliothek bietet fertige Profile als Ausgangspunkt. Übernimmst du eine Vorlage, entsteht ein neues Profil, das du frei ändern kannst.

| Vorlage | Grundlage | Labels |
|---|---|---|
| Zotero+ (Plugin-Standard) | Standard dieses Plugins | Kernaussage, Kritik / Limitation, Methode & Daten, Theorie & Definition, Forschungsfrage / Hypothese, Implikation, Forschungslücke, Hintergrund; vier leere Farben |
| Literaturreview: TCCM | Paul & Rosado-Serrano (2019) | Theorie, Kontext, Merkmale (Konstrukte), Methodik, Ergebnis, Zukünftige Forschung |
| Literaturreview: ADO | Paul & Benito (2018) | Antecedents, Entscheidungen, Outcomes, Moderatoren & Mediatoren, Theorie, Methode, Zukünftige Forschung |
| Argumentationsanalyse: Toulmin | Toulmin (1958) | Behauptung, Daten / Belege, Schlussregel, Stützung, Einschränkung, Ausnahme / Einwand |
| Grounded Theory: Kodierparadigma | Strauss & Corbin (1990) | Phänomen, Ursächliche Bedingungen, Kontext, Intervenierende Bedingungen, Handlungen / Interaktionen, Konsequenzen, Memo |
| Evidenzextraktion: PICO | Richardson et al. (1995) | Population, Intervention / Exposition, Vergleich, Endpunkt, Studiendesign, Effekt / Ergebnis, Verzerrungsrisiko |
| Lese-Workflow | gängige Praxis | Kernpunkt, Zum Zitieren, Zustimmung, Widerspruch, Frage / Unklar, Definition, Nachverfolgen (Quelle), Eigene Idee |

Zotero+ ist für die Literaturarbeit gedacht: Die acht Labels halten fest, was eine Studie findet, wie man sie kritisieren kann, wie sie vorgeht, welche Theorie sie nutzt, welche Frage sie stellt, was daraus folgt, was fehlt und was Hintergrund ist.

Eine Community-Sammlung zum Teilen eigener Schemata ist in Vorbereitung. Bis dahin tauschst du Profile als Dateien aus.

### Farben

Jede Zeile ist eine Farbe:

- **Griff ⠿**: zum Sortieren ziehen. Alt+↑/↓ im Textfeld verschiebt die Zeile ebenfalls.
- **Kontrollkästchen**: Farbe in den Menüs anzeigen oder ausblenden.
- **Nummer**: Position in den Menüs. Ausgeblendete Farben zeigen „–“. Eine Linie markiert, wo das Untermenü **Weitere Farben** beginnt.
- **Farbfeld**: öffnet den Farbwähler.
- **Label**: der Name in den Menüs. Leere Felder sind gestrichelt umrandet.
- **Zähler**: wie viele Annotationen in deinen Bibliotheken die Farbe verwenden (abschaltbar).
- **✕**: entfernt die Farbe aus dem Profil. Annotationen behalten ihre Farbe.

Unter der Liste:

- **Farbe hinzufügen** hängt eine neue Farbe an.
- **Auf Zotero+ zurücksetzen…** ersetzt die Palette durch die Vorlage.
- **Palette anwenden…** überträgt das ganze Profil auf eine andere Palette, zum Beispiel Pastell. Die Zuordnung erfolgt über die Position in der Zotero+-Reihenfolge, die Labels bleiben erhalten.
- **Speichern** speichert das Profil. Hast du Farben geändert, die Annotationen bereits verwenden, fragt das Plugin, ob diese Annotationen mit umgefärbt werden sollen. Hast du ein Label umbenannt, das schon als Tag verwendet wird, fragt es, ob die Tags umbenannt werden sollen.

### Farbwähler

Der Farbwähler bietet ein Feld für Sättigung und Helligkeit, einen Farbtonregler, ein Hex-Feld, die Farbauswahl des Betriebssystems und sechs Paletten mit je 12 Farben: Zotero+, Pastell, Hell, Kräftig, Gedeckt und Erdtöne. Darunter zeigt **Zuletzt verwendet** die letzten 12 Farben, die du ausgewählt hast; diese Reihe erscheint auch unter **Palette anwenden…**. **Sortiert** ordnet die Paletten nach Farbton, **Zotero** zeigt sie in der Reihenfolge der Zotero+-Plätze, sodass du siehst, welche Farben einander entsprechen. Zotero+ behält immer seine Reihenfolge. Esc stellt die vorherige Farbe wieder her.

## Einstellungen: Darstellung

| Einstellung | Wirkung |
|---|---|
| Farben direkt im Kontextmenü | Anzahl der Farben vor dem Untermenü **Weitere Farben** (Standard 8). Das Untermenü ist in Spalten zu höchstens 8 Einträgen angeordnet und wächst daher nicht aus dem Fenster. |
| „Annotationsfarben anpassen…“ im Kontextmenü anzeigen | Abkürzung zu den Einstellungen. |
| Auswahl-Popup: An die Breite des Popups anpassen | Die Farben füllen die verfügbare Breite. Sinnvoll mit Plugins, die dem Popup Inhalte hinzufügen, etwa Übersetzern. |
| Auswahl-Popup: Feste Anzahl Farben pro Reihe | Das Popup behält die Breite des Farbrasters; breite Inhalte anderer Plugins brechen um oder werden scrollbar. Der Knopf zum Anpassen ist immer das letzte Element. |
| Mindestanzahl Farben pro Reihe | Nur bei „An die Breite des Popups anpassen“ (Standard 8). |
| Elemente pro Reihe | Nur bei fester Anzahl (Standard 9). Der Knopf zum Anpassen zählt mit; bei 9 stehen acht Farben und der Knopf in einer Reihe. |
| Knopf zum Anpassen im Auswahl-Popup anzeigen | Abkürzung zu den Einstellungen am Ende der Farben. |
| Labels beim Überfahren sofort anzeigen | Sofortiger Tooltip statt des verzögerten System-Tooltips. |
| Werkzeugleiste des Readers | Knopf mit Profil und Zahl der Annotationen; darüber die Statistik nach Label. Ein Rechtsklick auf den Knopf blendet ihn aus. Optional: Warnung zu gemeinsam genutzten Farben, Beschreibungen. |
| Seitenleiste | Abschnitt „Better Annotations“ im Eintragsbereich. Sein Knopf steht bei den Abschnitten von Zotero oder in einem eigenen Bereich zwischen Trennlinien. Ein Rechtsklick auf die Kopfzeile oder den Knopf öffnet das eigene Fenster, verschiebt den Knopf oder entfernt den Abschnitt. |

Ob eine Farbe hervorhebt oder unterstreicht, legt Zoteros eigener Schalter unter den Farben im Popup fest. Zotero merkt sich die letzte Wahl.

## Einstellungen: Tags & Bibliothek

Alle Funktionen dieses Reiters ändern Annotationen in deinen Bibliotheken. Jede fragt vorher nach, erklärt die Folgen und wird im Verlauf protokolliert, sodass sie sich rückgängig machen lässt.

### Tags

Ist **Labels als Tags anhängen** aktiviert (standardmäßig aus), erhält jede neue Annotation und jede Annotation, deren Farbe sich ändert, das Label ihrer Farbe als Tag, auf Wunsch mit einem Präfix wie `#`. Tags entstehen nur für Farben mit sichtbarem Label im aktiven Profil.

Das Plugin führt eine Liste der Tags, die es vergeben hat (`tags.json`). Deshalb kann es

- diese Tags umbenennen, wenn du ein Label umbenennst,
- alle entfernen (**Plugin-Tags entfernen…**),
- sie erneut hinzufügen oder an das aktive Profil anpassen (**Tags auf vorhandene Annotationen anwenden…**),

ohne deine eigenen Tags anzutasten.

### Annotationen umfärben

Ändert die Farbe aller Annotationen, die eine bestimmte Farbe haben, etwa um zwei Kategorien zusammenzuführen oder vorhandene Annotationen auf eine neue Palette umzustellen.

- **Annotationen in** legt den Bereich fest. Er bezieht sich auf das Zotero-Hauptfenster: das geöffnete Dokument, die ausgewählten Einträge, die ausgewählte Sammlung, ihre übergeordnete Sammlung (wahlweise mit Untersammlungen), die ausgewählte Bibliothek oder alle Bibliotheken. Änderst du die Auswahl im Hauptfenster, klicke auf **Aktualisieren**.
- **Von** zeigt die Farben, die Annotationen in diesem Bereich derzeit verwenden, mit ihrer Anzahl. Der Name stammt aus dem Profil im Reiter „Farben & Profile“, sonst aus einem anderen Profil (mit dessen Namen in Klammern), sonst ist es der Farbname oder Hex-Code.
- **Nach** zeigt die Farben des Profils im Reiter „Farben & Profile“, auch ungespeicherte Änderungen, etwa nach **Palette anwenden…**. Darunter folgen weitere verwendete Farben, um Codes zusammenzuführen.
- **Tags anpassen** gibt den Annotationen das Label der neuen Farbe als Tag und ersetzt einen bisherigen Plugin-Tag. Standardmäßig ist das Kästchen aktiviert, wenn Tags eingeschaltet sind.

Annotationen in schreibgeschützten Gruppenbibliotheken und in der PDF-Datei gespeicherte Annotationen werden übersprungen.

Änderst du im Reiter „Farben & Profile“ Farben, die schon verwendet werden, fragt **Speichern** ebenfalls, ob die vorhandenen Annotationen umgefärbt werden sollen. Das gilt dann für alle Bibliotheken.

### Sicherungen

Eine Sicherung speichert die Farbe jeder Annotation. Die erste Sicherung entsteht automatisch beim ersten Start („vor der Installation“). **Wiederherstellen…** setzt die Farben zurück und entfernt alle Plugin-Tags. Später erstellte Annotationen und deine eigenen Tags bleiben unverändert.

### Verlauf

Listet jede Änderung, die das Plugin an Annotationen vorgenommen hat (bis zu 50 Einträge). **Rückgängig…** macht einen Eintrag rückgängig. Annotationen, die seitdem gelöscht oder erneut geändert wurden, werden übersprungen.

## Einstellungen: Export

Exportiert Annotationen als Tabelle mit einer Zeile je Annotation. Den Bereich wählst du wie beim Umfärben.

| Spalte | Inhalt |
|---|---|
| Nr., Farbe, Label, Typ | Laufende Nummer, Hex-Code (in Excel als farbige Zelle), Label aus dem aktiven Profil, Markierung, Unterstreichung, Notiz, Text, Bild oder Zeichnung |
| Text, Bild, Kommentar, Tags | Markierter Text, Bildausschnitt bei Bild- und Zeichnungsannotationen, dein Kommentar und alle Tags |
| Seite, Zitation, Titel, Autoren, Jahr | Quellenangabe des übergeordneten Eintrags, Zitation im Stil „Autor (Jahr)“ |
| Sammlungen, Datei, Link | Sammlungen des Eintrags, Dateiname und ein Link, der die Annotation in Zotero öffnet |
| Erstellt, Geändert, Erstellt von | Zeitstempel; „Erstellt von“ nur bei Gruppenbibliotheken |

| Format | Geeignet für |
|---|---|
| Excel (.xlsx) | Durchsehen, Filtern und Sortieren. Farbige Zellen, eingebettete Bilder, Links zurück nach Zotero, fixierte Kopfzeile mit Filtern sowie die Blätter „Labels“ (Anzahl je Label) und „Info“ (Profil, Bereich, Datum). |
| CSV (.csv) | R, Python, SPSS und andere Statistiksoftware. UTF-8 mit Kommas, ohne Farben und Bilder. |
| HTML (.html) | Lesen, Drucken oder Speichern als PDF. Nach Quelle oder Label gegliedert, mit Farben und Bildern. |

Optionen: Reihenfolge nach Quelle und Seite oder nach Label; Bilder einbeziehen; nur Annotationen, deren Farbe im aktiven Profil ein Label hat.

Bilder von Bild- und Zeichnungsannotationen stammen aus dem Zwischenspeicher von Zotero. Fehlt ein Bild, versucht das Plugin, es erzeugen zu lassen. Gelingt das nicht, öffne das Dokument einmal in Zotero.

## Einstellungen: Über

Zeigt Version, Kompatibilität, Lizenz, die Danksagung, den Datenordner und Links zu dieser Dokumentation, den Versionshinweisen, dem Quellcode sowie zu **Problem melden** und **Funktion vorschlagen** (Formulare im GitHub-Issue-Tracker).

### Komplettsicherung

**Komplettsicherung erstellen…** speichert alle Daten des Plugins in einer JSON-Datei: Profile, Einstellungen, die Liste der Plugin-Tags, den Verlauf und die Sicherungen der Annotationsfarben. Annotationen, PDFs und übrige Zotero-Daten sind nicht enthalten; sie kommen über die Zotero-Synchronisierung oder dein Zotero-Datenverzeichnis.

Auf einem neuen Rechner richtest du Zotero wie gewohnt ein, installierst das Plugin und wählst **Komplettsicherung laden…**. Bibliotheken sind in der Sicherung rechnerunabhängig gespeichert („Meine Bibliothek“ bzw. die Gruppen-ID), deshalb funktionieren Tags und Verlauf auch dort. Vor dem Laden legt das Plugin den aktuellen Stand im Ordner `full-backups` ab.

## Updates

Zotero sucht automatisch nach Plugin-Updates. **Nach Updates suchen** im Kopfbereich startet dieselbe Suche sofort und installiert ein verfügbares Update über die Add-on-Verwaltung von Zotero. Der Kopfbereich zeigt, ob du die neueste Version hast.

Ob Zotero Updates selbst installiert, legst du je Plugin unter **Werkzeuge → Plugins → Better Annotations → Automatische Updates erlauben** fest. „Standard“ folgt der allgemeinen Einstellung im Zahnradmenü der Plugin-Verwaltung. Öffnest du die Einstellungen des Plugins, prüft auch das Plugin. Sind automatische Updates erlaubt, installiert es eine neue Version sofort, so wie die Plugin-Verwaltung von Zotero (außer bei ungespeicherten Änderungen). Sind automatische Updates für dieses Plugin aus, bietet ein Hinweis im Kopfbereich **Update installieren** und **Automatische Updates einschalten** an. Im Hintergrund prüft das Plugin nicht selbst; das übernimmt Zotero.

## Sprachen

Standardmäßig verwendet das Plugin die Sprache von Zotero. Verfügbar sind Englisch, Deutsch, Spanisch, Französisch, Italienisch, Japanisch, Norwegisch (Bokmål), Polnisch, Portugiesisch, Russisch, Schwedisch sowie vereinfachtes und traditionelles Chinesisch. Für andere Sprachen erscheint Englisch. Die Sprache lässt sich im Kopfbereich ändern.

## Daten und Datenschutz

Alle Daten liegen in `<Zotero-Datenverzeichnis>/better-annotations/`:

| Datei | Inhalt |
|---|---|
| `profiles.json` | Profile und Einstellungen (vorheriger Stand in `profiles.json.bak`) |
| `tags.json` | Vom Plugin vergebene Tags |
| `history.json` | Verlauf für das Rückgängigmachen |
| `backups/` | Sicherungen der Annotationsfarben |
| `full-backups/` | Automatischer Stand vor dem Laden einer Komplettsicherung |

Profile liegen auf deinem Rechner und werden von Zotero nicht synchronisiert. Für einen anderen Rechner nutzt du **Komplettsicherung erstellen…** oder exportierst einzelne Profile.

Deinstallierst du das Plugin, bleibt dieser Ordner erhalten, damit eine spätere Installation deine Profile wiederfindet. Lösche ihn von Hand, wenn du ihn nicht mehr brauchst. Vom Plugin vergebene Tags bleiben an deinen Annotationen; entferne sie vor der Deinstallation mit **Plugin-Tags entfernen…**, wenn du sie nicht behalten möchtest.

In der Zotero-Datenbank ändert das Plugin nur Farben und Tags von Annotationen, und das nur nach deiner Bestätigung oder bei aktivierter Tag-Funktion. Der einzige Netzwerkzugriff ist die Updateprüfung über den Mechanismus von Zotero.

## Fehlerbehebung

**Jede Farbe unterstreicht statt hervorzuheben.** Klicke im Auswahl-Popup auf die linke Hälfte des Schalters unter den Farben. Zotero merkt sich diese Wahl.

**Beim Markieren entsteht sofort eine gelbe Hervorhebung ohne Popup.** Das Hervorhebungswerkzeug in der Werkzeugleiste ist aktiv. Klicke es erneut an oder drücke Esc.

**Die Menüs sehen aus wie die Originalmenüs von Zotero.** Möglicherweise verändert ein anderes Plugin dieselben Menüs, oder ein Zotero-Update hat den Reader geändert. Deaktiviere andere Farb-Plugins und melde das Problem mit der Debug-Ausgabe (**Hilfe → Debug-Ausgabe protokollieren**, Zeilen mit `[BetterAnnotations]`).

**Die Knöpfe in der Werkzeugleiste fehlen.** Sie erscheinen in Dokumenten, die nach dem Start des Plugins geöffnet werden; bereits geöffnete Dokumente erhalten sie nach wenigen Sekunden.
