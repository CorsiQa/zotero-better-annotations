# Better Annotations – Dokumentation

Better Annotations erweitert die Annotationsfarben des Zotero-Readers. Du kannst Farben benennen, ändern, weitere hinzufügen, umsortieren und mehrere Paletten als Profile speichern. Ein Abschnitt im Eintragsbereich zeigt die Labels mit der Zahl ihrer Annotationen. Erweiterte Funktionen ergänzen Beschreibungen, Labels als Tags und ein Profil je Dokument; weitere Werkzeuge färben vorhandene Annotationen um, exportieren sie und machen jede Änderung rückgängig.

English: [README.md](README.md)

## Inhalt

1. [Installation](#installation)
2. [Schnellstart](#schnellstart)
3. [Wo die Farben erscheinen](#wo-die-farben-erscheinen)
4. [Abschnitt im Eintragsbereich und eigenes Fenster](#abschnitt-im-eintragsbereich-und-eigenes-fenster)
5. [Einstellungen: Farben und Profile](#einstellungen-farben-und-profile)
6. [Einstellungen: Darstellung](#einstellungen-darstellung)
7. [Einstellungen: Bibliothek](#einstellungen-bibliothek)
8. [Einstellungen: Export](#einstellungen-export)
9. [Einstellungen: Erweitert](#einstellungen-erweitert)
10. [Einstellungen: Über](#einstellungen-über)
11. [Updates](#updates)
12. [Sprachen](#sprachen)
13. [Daten und Datenschutz](#daten-und-datenschutz)
14. [Fehlerbehebung](#fehlerbehebung)

## Installation

1. Lade die neueste Datei `better-annotations-<version>.xpi` von der [Release-Seite](https://github.com/CorsiQa/zotero-better-annotations/releases) herunter.
2. Öffne in Zotero **Werkzeuge → Plugins**, klicke auf das Zahnrad und wähle **Plugin aus Datei installieren…**.
3. Wähle die heruntergeladene Datei aus.

Better Annotations ist mit Zotero 10 getestet und für Zotero ab Version 7 gebaut. Andere Plugins, die dieselben Menüs verändern („Highlight Color Descriptions“, „Annotation Color Customizer“, „Just Enough Color“), solltest du deaktivieren. Solange eines davon aktiv ist, weist ein Hinweis oben in den Einstellungen darauf hin und bietet an, seine Labels als Profil zu übernehmen; ein Dialog erscheint einmal je Plugin.

Das Plugin ändert vorhandene Annotationen nie von selbst. Deine Annotationen behalten nach der Installation ihre Farben. Beim ersten Start sichert das Plugin die Farben aller Annotationen.

## Schnellstart

1. Öffne **Bearbeiten → Einstellungen** (macOS: **Zotero → Einstellungen**) und wähle **Better Annotations**.
2. Nach der Installation ist das Profil **Standard** aktiv: Zoteros acht Farben mit ihren Farbnamen. Wähle das Beispielprofil **Zotero+** (Labels für die Literaturarbeit), klicke auf **Vorlagen ansehen** oder auf **Neues Profil…**.
3. Ändere ein Label oder klicke auf ein Farbfeld und dann auf **Speichern**. Änderungen an „Standard“ werden als neues Profil gespeichert.
4. Öffne ein PDF. Markiere Text und wähle eine Farbe, oder klicke im Abschnitt **Better Annotations** im Eintragsbereich auf ein Label. Fährst du über eine Farbe, erscheint ihr Label.

## Wo die Farben erscheinen

| Ort | Was das Plugin tut |
|---|---|
| Rechtsklick auf eine Annotation | Zeigt deine Farben mit Labels. Die ersten 8 Farben (einstellbar) stehen direkt im Menü, alle weiteren im Untermenü **Weitere Farben**, danach folgt **Annotationen anpassen…**. |
| Farbmenü der Werkzeugleiste | Dieselbe Liste; legt die Farbe der Werkzeuge für Hervorhebung, Unterstreichung, Notiz, Text, Bild und Freihand fest. |
| Popup nach dem Markieren | Zeigt alle sichtbaren Farben als Knöpfe, am Ende den Knopf zum Anpassen und das Label als Tooltip. |
| Werkzeugleiste des Readers | Ein Knopf mit dem Profil und der Zahl seiner Annotationen. Ein Klick öffnet das Profilmenü; beim Überfahren oder bei Tastaturfokus erscheint die Statistik nach Labels. |
| Seitenleiste der Annotationen | Der Farbfilter zeigt die Labels als Tooltips. Mit „Profil je Dokument“ zeigt der Kopf jeder Annotation ihr Profil. |
| Eintragsbereich | Der Abschnitt „Better Annotations“ und das eigene Fenster (siehe nächstes Kapitel). |

Eine Farbe erscheint in den Menüs, wenn ihr Kontrollkästchen aktiviert und ihr Label nicht leer ist. Ein Label aus Leerzeichen zählt als Label.

## Abschnitt im Eintragsbereich und eigenes Fenster

Der Abschnitt **Better Annotations** im Eintragsbereich zeigt die Labels des Profils mit der Zahl der Annotationen, im Reader für das geöffnete Dokument und in der Bibliothek für die Dateien des ausgewählten Eintrags.

- **Profilknopf** („Profil: Name · ✎ n“): öffnet das Profilmenü mit allen Profilen und ihrer Zahl an Annotationen im Dokument sowie **Profile verwalten…**.
- **Klick auf ein Label** (Reader): schaltet das Hervorheben in dieser Farbe ein (das Unterstreichen, wenn Zoteros Popup auf Unterstreichen steht). Ein zweiter Klick schaltet zurück auf den Zeiger. Ist Text oder eine Annotation ausgewählt, färbt der Klick sie einmalig ein, das Werkzeug bleibt unverändert.
- **Farbe beibehalten** (⇄): ausgeschaltet wechselt der Reader nach jeder Annotation zum Zeiger.
- **Ansicht** (Trichter): dieses Profil; alle Profile (mit einer Überschrift je Profil); nur dieses Profil (Zoteros Tag-Filter, auch im Dokument; mit „Profil je Dokument“).
- **Beschreibungen** (Linien): zeigt die Beschreibungen unter den Labels; der Stift neben einem Label bearbeitet seine Beschreibung.
- **Ziehen und Ablegen**: Ziehe ein Label auf eine Annotation in der Seitenleiste des Readers, auf eine Markierung im PDF oder auf markierten Text. Gehört das Ziel zu mehreren ausgewählten Annotationen, werden alle umgefärbt.
- Unter der Liste: alle Annotationen des Dokuments, weitere Profile darin, Annotationen ohne Profil-Tag (**Zuordnen**) und eine Warnung, wenn Profile im Dokument dieselben Farben nutzen.

Die Kopfzeile des Abschnitts hat zwei Knöpfe: **In eigenem Fenster öffnen** und **Oben anzeigen**. Das eigene Fenster zeigt dieselbe Liste, folgt dem aktiven Reader-Tab und klappt den rechten Bereich des Readers ein, solange es offen ist, etwa für einen zweiten Bildschirm. Ein Rechtsklick auf die Kopfzeile oder auf den Knopf in der Seitennavigation verschiebt den Knopf in einen eigenen Bereich oder entfernt den Abschnitt; unter **Darstellung** blendest du ihn wieder ein. Ist der Bereich schmal, wird der Profilname gekürzt, danach entfallen „Profil:“ und die Zahl, damit die Knöpfe sichtbar bleiben.

## Einstellungen: Farben und Profile

### Profile

Ein Profil speichert eine vollständige Palette: Farben, Labels, Reihenfolge, Sichtbarkeit und Beschreibungen. Das aktive Profil bestimmt, was du im Reader siehst; mit „Profil je Dokument“ (Reiter **Erweitert**) hat jedes Dokument sein eigenes.

| Profil | Beschreibung |
|---|---|
| **Standard** | Eingebaut und nach der Installation aktiv: Zotero ohne Änderungen, 8 Farben mit Farbnamen. Es lässt sich weder ändern noch löschen; speicherst du Änderungen daran, fragt das Plugin nach einem Namen und legt ein neues Profil an. |
| **Zotero+** | Beispielprofil, beim ersten Start angelegt. 12 Farben: die 8 Zotero-Farben sowie Türkis, Rosa, Indigo und Limette. Die ersten 8 tragen Labels für die Literaturarbeit: Kernaussage, Kritik / Limitation, Methode & Daten, Theorie & Definition, Forschungsfrage / Hypothese, Implikation, Forschungslücke, Hintergrund. Die 4 Zusatzfarben sind leer und deshalb ausgeblendet, bis du sie benennst. Es lässt sich wie eigene Profile ändern oder löschen. |
| Eigene Profile | Beliebig viele eigene Paletten. |

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
- **Label**: der Name in den Menüs.
- **Zähler**: wie viele deiner anderen Profile die Farbe nutzen (zwei Quadrate; der Tooltip nennt sie) und wie viele Annotationen in deinen Bibliotheken sie verwenden (Markierstift).
- **Beschreibung** (bei eingeschalteten Beschreibungen): Ein Klick auf den grauen Text unter dem Label öffnet ein Feld.
- **✕**: entfernt die Farbe aus dem Profil. Annotationen behalten ihre Farbe.

Unter der Liste:

- **Farbe hinzufügen** hängt eine neue Farbe an.
- **Auf Zotero+ zurücksetzen…** ersetzt die Palette durch die Vorlage.
- **Palette anwenden…** überträgt das ganze Profil auf eine andere Palette, zum Beispiel Pastell. Die Zuordnung erfolgt über die Position in der Zotero+-Reihenfolge, die Labels bleiben erhalten.
- **Speichern** speichert das Profil. Hast du Farben geändert, die Annotationen bereits verwenden, fragt das Plugin, ob diese Annotationen mit umgefärbt werden sollen. Hast du ein Label umbenannt, das schon als Tag verwendet wird, fragt es, ob die Tags umbenannt werden sollen.

### Farbwähler

Der Farbwähler bietet ein Feld für Sättigung und Helligkeit, einen Farbtonregler, ein Hex-Feld, die Farbauswahl des Betriebssystems und sieben Paletten mit je 12 Farben: Zotero+, Pastell, Pastell kräftig, Neon, Kräftig, Gedeckt und Erdtöne. Darunter zeigt **Zuletzt verwendet** die letzten 12 Farben, die du ausgewählt hast; diese Reihe erscheint auch unter **Palette anwenden…**. **Sortiert** ordnet die Paletten nach Farbton, **Zotero** zeigt sie in der Reihenfolge der Zotero+-Plätze, sodass du siehst, welche Farben einander entsprechen. Zotero+ behält immer seine Reihenfolge. Esc stellt die vorherige Farbe wieder her.

## Einstellungen: Darstellung

| Einstellung | Wirkung |
|---|---|
| Farben direkt im Kontextmenü | Anzahl der Farben vor dem Untermenü **Weitere Farben** (Standard 8). Das Untermenü ist in Spalten zu höchstens 8 Einträgen angeordnet und wächst daher nicht aus dem Fenster. |
| „Annotationen anpassen…“ im Kontextmenü anzeigen | Abkürzung zu den Einstellungen. |
| Auswahl-Popup: An die Breite des Popups anpassen | Die Farben füllen die verfügbare Breite. Sinnvoll mit Plugins, die dem Popup Inhalte hinzufügen, etwa Übersetzern. |
| Auswahl-Popup: Feste Anzahl Farben pro Reihe | Das Popup behält die Breite des Farbrasters; breite Inhalte anderer Plugins brechen um oder werden scrollbar. Der Knopf zum Anpassen ist immer das letzte Element. |
| Mindestanzahl Farben pro Reihe | Nur bei „An die Breite des Popups anpassen“ (Standard 8). |
| Elemente pro Reihe | Nur bei fester Anzahl (Standard 9). Der Knopf zum Anpassen zählt mit; bei 9 stehen acht Farben und der Knopf in einer Reihe. |
| Knopf zum Anpassen im Auswahl-Popup anzeigen | Abkürzung zu den Einstellungen am Ende der Farben. |
| Labels beim Überfahren sofort anzeigen | Sofortiger Tooltip statt des verzögerten System-Tooltips. |
| Werkzeugleiste des Readers | Knopf mit Profil und Zahl der Annotationen; darüber die Statistik nach Label. Ein Rechtsklick auf den Knopf blendet ihn aus. Optional: Warnung zu gemeinsam genutzten Farben, Beschreibungen in der Statistik. **Werkzeuge von Zotero über der Mitte des Dokuments anordnen** (standardmäßig an) hält sie an ihrem Platz, gleich wie breit der Knopf ist. |
| Seitenleiste | Abschnitt „Better Annotations“ im Eintragsbereich. Sein Knopf steht bei den Abschnitten von Zotero oder in einem eigenen Bereich zwischen Trennlinien. Ein Rechtsklick auf die Kopfzeile oder den Knopf öffnet das eigene Fenster, verschiebt den Knopf oder entfernt den Abschnitt. |

Ob eine Farbe hervorhebt oder unterstreicht, legt Zoteros eigener Schalter unter den Farben im Popup fest. Zotero merkt sich die letzte Wahl.

## Einstellungen: Bibliothek

Alle Funktionen dieses Reiters ändern Annotationen in deinen Bibliotheken. Jede fragt vorher nach, erklärt die Folgen und wird im Verlauf protokolliert, sodass sie sich rückgängig machen lässt.

### Annotationen umfärben

Ändert die Farbe aller Annotationen, die eine bestimmte Farbe haben, etwa um zwei Kategorien zusammenzuführen oder vorhandene Annotationen auf eine neue Palette umzustellen.

- **Annotationen in** legt den Bereich fest. Er bezieht sich auf das Zotero-Hauptfenster: das geöffnete Dokument, die ausgewählten Einträge, die ausgewählte Sammlung, ihre übergeordnete Sammlung (wahlweise mit Untersammlungen), die ausgewählte Bibliothek oder alle Bibliotheken. Änderst du die Auswahl im Hauptfenster, klicke auf **Aktualisieren**.
- **Von** zeigt die Farben, die Annotationen in diesem Bereich derzeit verwenden, mit ihrer Anzahl. Der Name stammt aus dem Profil im Reiter „Farben und Profile“, sonst aus einem anderen Profil (mit dessen Namen in Klammern), sonst ist es der Farbname oder Hex-Code.
- **Nach** zeigt die Farben des Profils im Reiter „Farben und Profile“, auch ungespeicherte Änderungen, etwa nach **Palette anwenden…**. Darunter folgen weitere verwendete Farben, um Codes zusammenzuführen.
- **Tags anpassen** gibt den Annotationen das Label der neuen Farbe als Tag und ersetzt einen bisherigen Plugin-Tag. Standardmäßig ist das Kästchen aktiviert, wenn Tags eingeschaltet sind.

Annotationen in schreibgeschützten Gruppenbibliotheken und in der PDF-Datei gespeicherte Annotationen werden übersprungen.

Änderst du im Reiter „Farben und Profile“ Farben, die schon verwendet werden, fragt **Speichern** ebenfalls, ob die vorhandenen Annotationen umgefärbt werden sollen. Das gilt dann für alle Bibliotheken.

### Sicherungen

Eine Sicherung speichert die Farbe jeder Annotation. Die erste Sicherung entsteht automatisch beim ersten Start („vor der Installation“). **Wiederherstellen…** setzt die Farben zurück und entfernt alle Plugin-Tags. Später erstellte Annotationen und deine eigenen Tags bleiben unverändert.

### Verlauf

Listet jede Änderung, die das Plugin an Annotationen vorgenommen hat (bis zu 50 Einträge). **Rückgängig…** macht einen Eintrag rückgängig. Annotationen, die seitdem gelöscht oder erneut geändert wurden, werden übersprungen.

## Einstellungen: Export

Exportiert Annotationen als Tabelle mit einer Zeile je Annotation. Den Bereich wählst du wie beim Umfärben.

| Spalte | Inhalt |
|---|---|
| Nr., Label, Typ | Laufende Nummer (in Excel in der Farbe der Annotation; CSV hat eine Spalte mit dem Hex-Code), Label aus dem Profil der Annotation, Markierung, Unterstreichung, Notiz, Text, Bild oder Zeichnung |
| Ausschnitt, Kommentar | Markierter Text oder das Bild von Bild- und Zeichnungsannotationen (in CSV ein Platzhalter wie „[Bild]“) und dein Kommentar |
| Seite, Zitation, Link | Seitenzahl, Zitation im Stil „Autor (Jahr)“ und ein Link, der die Annotation in Zotero öffnet |
| Details | Beschreibung des Labels (optional), Tags ohne Profil-Tags, Profil (mit „Profil je Dokument“), erstellt, geändert, erstellt von (Gruppenbibliotheken) |
| Quelle | Titel, Autoren, Jahr, Sammlungen und Dateiname des übergeordneten Eintrags |

In Excel lassen sich die Gruppen „Details“ und „Quelle“ einklappen, die Spaltenbreiten richten sich nach dem Inhalt und Bilder passen sich der Spalte an. Nach dem Export öffnet sich der Ordner mit der Datei.

| Format | Geeignet für |
|---|---|
| Excel (.xlsx) | Durchsehen, Filtern und Sortieren. Farbige Zellen, eingebettete Bilder, Links zurück nach Zotero, fixierte Kopfzeile mit Filtern sowie die Blätter „Labels“ (Anzahl je Label) und „Info“ (Profil, Bereich, Datum). |
| CSV (.csv) | R, Python, SPSS und andere Statistiksoftware. UTF-8 mit Kommas, ohne Farben und Bilder. |
| HTML (.html) | Lesen, Drucken oder Speichern als PDF. Nach Quelle oder Label gegliedert, mit Farben und Bildern. |

Optionen: Reihenfolge nach Quelle und Seite oder nach Label; Bilder einbeziehen; Beschreibungen als Spalte hinzufügen; nur Annotationen, deren Farbe ein Label hat; mit „Profil je Dokument“ nur die Annotationen eines Profils.

Bilder von Bild- und Zeichnungsannotationen stammen aus dem Zwischenspeicher von Zotero. Fehlt ein Bild, versucht das Plugin, es erzeugen zu lassen. Gelingt das nicht, öffne das Dokument einmal in Zotero.

## Einstellungen: Erweitert

Diese Funktionen sind standardmäßig aus. Sie schreiben in deine Bibliothek, verändern den Reader oder brauchen eine Erklärung. Du schaltest sie mit dem Schalter oben rechts in ihrer Karte ein; ihre Optionen erscheinen erst dann.

### Beschreibungen

Eine Beschreibung sagt, wofür ein Label steht und wann du es verwendest, etwa die Definition eines Codes. Beschreibungen sind reiner Text mit Zeilenumbrüchen, höchstens 2000 Zeichen je Farbe. Sie erscheinen in den Tooltips der Menüs und des Popups, im Abschnitt im Eintragsbereich, im eigenen Fenster, in der Statistik (optional) und als Spalte im Export. Wo sie erscheinen, legst du unter **Darstellung** fest. Profildateien und Komplettsicherungen enthalten sie.

### Labels als Tags

Ist **Labels als Tags** eingeschaltet, erhält jede neue Annotation und jede Annotation, deren Farbe sich ändert, das Label ihrer Farbe als Tag, auf Wunsch mit einem Präfix wie `#`. Die Tags stammen aus dem Profil, zu dem die Annotation zählt, und nur aus Farben mit sichtbarem Label; „Standard“ vergibt keine Tags.

Das Plugin führt eine Liste der Tags, die es vergeben hat (`tags.json`). Deshalb kann es

- diese Tags umbenennen, wenn du ein Label umbenennst,
- alle entfernen (**Plugin-Tags entfernen…**),
- sie erneut hinzufügen oder an das aktive Profil anpassen (**Tags auf vorhandene Annotationen anwenden…**),

ohne deine eigenen Tags anzutasten.

### Profil je Dokument

Jedes Dokument behält sein eigenes Profil. Beim Öffnen eines Dokuments nutzt das Plugin in dieser Reihenfolge:

1. das Profil, das du in diesem Dokument zuletzt gewählt hast,
2. das Profil der meisten seiner Annotationen,
3. die erste Regel für die Sammlung, aus der du das Dokument geöffnet hast (oder eine seiner Sammlungen),
4. das Standardprofil.

Neue Annotationen erhalten einen Profil-Tag wie „ZBA: Literaturreview“ (in allen Sprachen gleich). Der Tag hält fest, zu welchem Profil eine Annotation gehört; so kann dieselbe Farbe in verschiedenen Profilen Verschiedenes bedeuten. Er synchronisiert mit der Bibliothek, erscheint im Tag-Filter und im Export und kann in der Farbe des Plugins erscheinen, wenn einer der neun Plätze für farbige Tags in Zotero frei ist. Im Reader blendet das Plugin den Tag in der Tag-Zeile der Annotation aus und zeigt das Profil als kleines Etikett im Kopf der Annotation (abschaltbar).

Nur der Profil-Tag ordnet eine Annotation einem Profil zu. Annotationen ohne Tag zählen zu „Standard“, wenn sie eine Zotero-Farbe haben, sonst zu „Ohne Profil“. **Zuordnen** im Eintragsbereich oder **Annotationen ohne Profil zuordnen** in dieser Karte für einen beliebigen Bereich gibt ihnen den Tag des Dokumentprofils für dessen Farben, sonst den Tag des Profils mit ihrer Farbe. Erhält eine Annotation eine Farbe, die ihr Profil nicht hat, wechselt sie in das Profil mit dieser Farbe.

- **Standardprofil**: für Dokumente ohne eigene Wahl, ohne Profil-Tags und ohne passende Regel.
- **Regeln für Sammlungen**: geben den Dokumenten einer Sammlung ein Profil, wahlweise mit Untersammlungen; die erste passende Regel gilt.
- **Beim Öffnen nur Annotationen des Dokumentprofils zeigen**: schaltet Zoteros Tag-Filter ein.
- Benennst du ein Profil um, ändern sich seine Tags; beim Löschen fragt das Plugin, ob die Tags entfernt, einem anderen Profil gegeben oder behalten werden.
- Beim Einschalten bietet das Plugin an, alle vorhandenen Annotationen zuzuordnen; beim Ausschalten fragt es, ob die Tags bleiben. Die Wahl je Dokument und die Regeln bleiben gespeichert.

## Einstellungen: Über

Zeigt Version, Kompatibilität, Lizenz, die Danksagung, den Datenordner und Links zu dieser Dokumentation, den Versionshinweisen, dem Quellcode sowie zu **Problem melden** und **Funktion vorschlagen** (Formulare im GitHub-Issue-Tracker).

### Komplettsicherung

**Komplettsicherung erstellen…** speichert alle Daten des Plugins in einer JSON-Datei: Profile, Einstellungen, Regeln für Sammlungen, das je Dokument gewählte Profil, die Liste der Plugin-Tags, den Verlauf und die Sicherungen der Annotationsfarben. Annotationen, PDFs und übrige Zotero-Daten sind nicht enthalten; sie kommen über die Zotero-Synchronisierung oder dein Zotero-Datenverzeichnis.

Auf einem neuen Rechner richtest du Zotero wie gewohnt ein, installierst das Plugin und wählst **Komplettsicherung laden…**. Bibliotheken sind in der Sicherung rechnerunabhängig gespeichert („Meine Bibliothek“ bzw. die Gruppen-ID), deshalb funktionieren Tags und Verlauf auch dort. Vor dem Laden legt das Plugin den aktuellen Stand im Ordner `full-backups` ab.

## Updates

Zotero sucht automatisch nach Plugin-Updates. **Nach Updates suchen** im Kopfbereich startet dieselbe Suche sofort und installiert ein verfügbares Update über die Add-on-Verwaltung von Zotero. Der Kopfbereich zeigt, ob du die neueste Version hast.

Ob Zotero Updates selbst installiert, legst du je Plugin unter **Werkzeuge → Plugins → Better Annotations → Automatische Updates erlauben** fest. „Standard“ folgt der allgemeinen Einstellung im Zahnradmenü der Plugin-Verwaltung. Öffnest du die Einstellungen des Plugins, prüft auch das Plugin. Sind automatische Updates erlaubt, installiert es eine neue Version sofort, so wie die Plugin-Verwaltung von Zotero (außer bei ungespeicherten Änderungen). Sind automatische Updates für dieses Plugin aus, bietet ein Hinweis im Kopfbereich **Update installieren** und **Automatische Updates einschalten** an. Im Hintergrund prüft das Plugin nicht selbst; das übernimmt Zotero.

## Sprachen

Standardmäßig verwendet das Plugin die Sprache von Zotero. Verfügbar sind Englisch, Deutsch, Spanisch, Französisch, Italienisch, Japanisch, Polnisch, Portugiesisch, Russisch sowie vereinfachtes und traditionelles Chinesisch. Für andere Sprachen erscheint Englisch. Die Sprache lässt sich im Kopfbereich ändern.

## Daten und Datenschutz

Alle Daten liegen in `<Zotero-Datenverzeichnis>/better-annotations/`:

| Datei | Inhalt |
|---|---|
| `profiles.json` | Profile, Einstellungen und Regeln für Sammlungen (vorheriger Stand in `profiles.json.bak`) |
| `documents.json` | Von Hand gewähltes Profil je Dokument |
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

**Die Menüs sehen aus wie die Originalmenüs von Zotero oder zeigen andere Labels.** Möglicherweise verändert ein anderes Plugin dieselben Menüs (für die bekannten zeigen die Einstellungen einen Hinweis), oder ein Zotero-Update hat den Reader geändert. Deaktiviere andere Farb-Plugins und melde das Problem mit der Debug-Ausgabe (**Hilfe → Debug-Ausgabe protokollieren**, Zeilen mit `[BetterAnnotations]`).

**Die Knöpfe in der Werkzeugleiste fehlen.** Sie erscheinen in Dokumenten, die nach dem Start des Plugins geöffnet werden; bereits geöffnete Dokumente erhalten sie nach wenigen Sekunden.

**Der Abschnitt im Eintragsbereich fehlt.** Schalte ihn unter **Darstellung → Seitenleiste** ein oder blende ihn per Rechtsklick auf die Seitennavigation wieder ein.
