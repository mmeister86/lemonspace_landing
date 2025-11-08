# LemonSpace.io - Masterplan

## 🎯 Projektübersicht

**LemonSpace.io** ist eine innovative No-Code Drag&Drop-Plattform, die es Vertriebsmitarbeitern ermöglicht, professionelle, interaktive Marketing Boards zu erstellen und diese über personalisierte Links mit ihren Kunden zu teilen. Die Plattform richtet sich speziell an Direktvertriebler und bietet eine intuitive Alternative zu statischen PDFs oder komplexen E-Mail-Kampagnen.

### Vision
Eine Plattform zu schaffen, die die Lücke zwischen einfachen E-Mails und aufwendigen Webseiten schließt - ein Tool, das so einfach wie PowerPoint, aber so leistungsfähig wie eine moderne Webanwendung ist.

### Kernwert-Versprechen
- **Für Vertriebler**: Professionelle Verkaufsunterlagen ohne technische Kenntnisse erstellen
- **Für Kunden**: Interaktive, ansprechende Inhalte statt langweiliger PDFs erhalten
- **Für beide**: Messbare Interaktionen und bessere Kommunikation

## 👥 Zielgruppe

### Primäre Zielgruppe
**Direktvertriebler und Einzelkämpfer**
- Vertreter von Unternehmen wie ProWIN, Vorwerk, Tupperware
- Versicherungsmakler und Finanzberater
- Immobilienmakler
- Freelancer im Vertrieb
- Charakteristika: Teil großer Strukturen, aber eigenständig arbeitend, begrenztes IT-Budget

### Sekundäre Zielgruppe
- Kleine Vertriebsteams (2-10 Personen)
- Marketing-Abteilungen in KMUs
- Coaches und Berater

### Nutzer-Personas

**Petra, 42, ProWIN-Beraterin**
- Technisch versiert genug für Social Media
- Braucht professionelle Materialien für Hauspartys und Online-Präsentationen
- Will Zeit sparen und trotzdem individuell auf Kunden eingehen

**Marco, 35, Versicherungsmakler**
- Arbeitet viel mit jungen Familien
- Benötigt verschiedene Präsentationen für unterschiedliche Produkte
- Tracking wichtig für Follow-ups

## 🚀 Kernfunktionen

### 1. Drag&Drop Board Builder
- **Grid-System**: Max. 4 Spalten Desktop, responsive für Tablet/Mobile
- **Viewport-Switching**: Echtzeit-Vorschau für verschiedene Geräte
- **Inline-Editing**: Direktes Bearbeiten von Texten mit ProseKit
- **Property Panel**: Slide-in Panel von rechts für erweiterte Einstellungen
- **Builder/Preview Toggle**: Umschaltung zwischen Bearbeitungs- und Ansichtsmodus

### 2. Mediathek
- **Persönlicher Speicher**: Jeder Nutzer hat eigenen, isolierten Bereich
- **Upload-Funktionen**: 
  - Bilder (bis 10MB)
  - Videos (bis 50MB Free / 500MB Pro)
  - PDFs und andere Dokumente
- **Automatische Komprimierung**: FFMPEG-basiert für Videos
- **Organisation**: Ordner, Tags, Suchfunktion

### 3. Block-System

#### Basis-Blöcke (Free)
- Text/Überschriften mit Basic-Formatierung
- Bilder/Bildergalerien
- Einfache Buttons (externe Links)
- Trennlinien/Spacer

#### Premium-Blöcke
- Eingebettete Videos (YouTube/Vimeo)
- Video-Uploads (direkt vom Gerät)
- Interaktive PDFs (in-Board Viewer)
- Formulare (komplett mit ShadCN UI Komponenten)
- Pricing Tables
- Terminbuchung (Cal.com Integration)
- Countdown-Timer
- Accordion/Tabs
- Testimonials/Bewertungen
- Social Media Links
- Download-Buttons
- Kontaktkarten (vCard)
- Code-Block (Sandbox für iFrames)

### 4. Template-System
- **Vorgefertigte Templates**: Branchen-spezifisch
- **Eigene Templates**: Speichern und wiederverwenden (Pro)
- **Template-Marktplatz**: Zukünftig geplant

### 5. Analytics Dashboard

#### Free Version
- Anzahl der Board-Öffnungen
- Basis-Statistiken

#### Pro Version
- Detaillierte Verweildauer
- Klick-Heatmaps
- PDF-Download-Tracking
- Formular-Submissions
- Geografische Verteilung
- Device-Statistiken
- Echtzeit-Benachrichtigungen (optional)

### 6. Board-Sharing
- **URL-Struktur**: `https://link.lemonspace.io/[username]/[board-id]`
- **Custom Links**: Pro-Feature für personalisierte URLs
- **Zugriffskontrollen** (Pro):
  - Passwortschutz
  - Zeitliche Begrenzung
  - E-Mail-Verifizierung

## 💰 Monetarisierungsmodell

### Free Tier
- Max. 3 Boards gleichzeitig
- Basis-Blöcke
- Standard-Farbschemata (3-5)
- Einfache Analytics
- LemonSpace Branding im Board
- 50MB Video-Upload-Limit

### Pro Tier (19€/Monat oder 199€/Jahr)
- Unbegrenzte Boards
- Alle Premium-Blöcke
- Custom Farbschemata
- White-Label (kein Branding)
- Detaillierte Analytics
- Custom Link-IDs
- Passwortschutz & zeitliche Limits
- Eigene Templates speichern
- 500MB Video-Upload-Limit
- Priority Support

### Lifetime-Lizenz (399€)
- Alle Pro-Features
- Lebenslanger Zugang
- Früher Zugang zu neuen Features

## 🛠 Technischer Stack

### Frontend
- **Framework**: Next.js 15.5 (App Router)
- **UI Library**: ShadCN UI
- **Styling**: Tailwind CSS 4
- **Text Editor**: ProseKit
- **Drag&Drop**: @dnd-kit
- **State Management**: Zustand
- **API Client**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Animationen**: Framer Motion (für Transitions)

### Backend
- **BaaS**: AppWrite
  - Authentication
  - Database (Dokumentenbasiert)
  - Storage Buckets
  - Realtime (für zukünftige Features)
- **E-Mail**: Resend
- **Analytics**: PostHog oder Plausible
- **Media Processing**: FFMPEG (selbst implementiert)

### Infrastructure
- **Hosting**: Hetzner VPS (160GB Storage, 20TB Traffic)
- **Deployment**: Coolify
- **CDN**: Cloudflare
- **Domain**: lemonspace.io mit Subdomains
- **Monitoring**: Uptime Kuma, Sentry

### Architektur-Entscheidungen

#### Monorepo vs. Separate Repos
**Empfehlung**: Starte mit separaten Repos, migriere später zu Monorepo wenn nötig

Separate Repos für:
- Landingpage (Next.js Static)
- Builder App (Next.js App)
- Link-Viewer (Next.js App, optimiert für Performance)
- URL Shortener (Node.js Service)

Vorteile:
- Einfachere Coolify-Integration
- Unabhängige Deployments
- Bessere Build-Zeiten

## 📊 Konzeptuelles Datenmodell

### User
```
- id (UUID)
- email
- name
- subscription_tier
- subscription_expires
- created_at
- storage_used
- boards_count
```

### Board
```
- id (UUID)
- user_id (FK)
- title
- slug (custom URL part)
- grid_config (JSON)
- blocks (JSON)
- template_id (FK, optional)
- is_template
- password_hash (optional)
- expires_at (optional)
- created_at
- updated_at
- published_at
```

### Media
```
- id (UUID)
- user_id (FK)
- filename
- original_name
- mime_type
- size
- bucket_path
- thumbnail_path
- created_at
```

### Analytics
```
- id (UUID)
- board_id (FK)
- visitor_id
- event_type
- event_data (JSON)
- ip_hash
- user_agent
- referrer
- created_at
```

### Template
```
- id (UUID)
- user_id (FK, null für System-Templates)
- title
- description
- category
- preview_image
- grid_config (JSON)
- blocks (JSON)
- is_public
- uses_count
- created_at
```

## 🎨 UI/UX Design-Prinzipien

### Design-Philosophie
- **Clean & Modern**: Minimalistisch mit Fokus auf Inhalte
- **Intuitive Bedienung**: Keine Lernkurve für Basis-Features
- **Mobile-First**: Optimiert für alle Geräte
- **Accessibility**: WCAG 2.1 AA Konformität

### Farbschema
- **Primary**: LemonSpace Grün (#4ade80)
- **Secondary**: Dunkelgrau/Schwarz
- **Accent**: Komplementärfarben für CTAs
- **System**: ShadCN UI Default-Palette

### Layout-Struktur
```
Builder:
┌─────────────────────────────────┐
│ Header (Logo, Save, Preview)    │
├────┬────────────────────┬───────┤
│    │                    │       │
│ S  │   Canvas/Grid      │   P   │
│ i  │                    │   r   │
│ d  │                    │   o   │
│ e  │                    │   p   │
│ b  │                    │   s   │
│ a  │                    │       │
│ r  │                    │       │
└────┴────────────────────┴───────┘
```

## 🔒 Sicherheitsüberlegungen

### Datenschutz
- **DSGVO-Konformität**: Anonymisierte Analytics
- **Datentrennung**: Strikte User-Isolation in AppWrite
- **Verschlüsselung**: HTTPS überall, verschlüsselte Backups

### Content-Sicherheit
- **Sandbox für Code-Blocks**: Isolation von User-generierten Scripts
- **Upload-Validierung**: Dateitype- und Größen-Checks
- **Rate-Limiting**: API-Schutz gegen Missbrauch
- **Content-Moderation**: Automatische Prüfung auf problematische Inhalte

### Authentifizierung
- **OAuth 2.0**: Social Logins (Google, Microsoft)
- **2FA**: Optional für Pro-Accounts
- **Session-Management**: Secure, httpOnly Cookies
- **Password-Policy**: Mindestanforderungen, Breach-Check

## 📈 Entwicklungsphasen

### Phase 1: MVP (Monate 1-2)
- [ ] Basic Builder mit Text, Bild, Button
- [ ] Mediathek (nur Bilder)
- [ ] Einfaches Grid-System
- [ ] Board-Sharing (öffentliche Links)
- [ ] User-Registrierung/Login
- [ ] Basis-Analytics

### Phase 2: Core Features (Monate 3-4)
- [ ] Alle Basis-Blöcke
- [ ] Video-Support
- [ ] Responsive Grid
- [ ] Template-System (System-Templates)
- [ ] Erweiterte Analytics
- [ ] Payment-Integration

### Phase 3: Premium Features (Monate 5-6)
- [ ] Alle Premium-Blöcke
- [ ] Custom Templates
- [ ] White-Label
- [ ] Formulare mit E-Mail
- [ ] PDF-Viewer
- [ ] Passwortschutz

### Phase 4: Skalierung (Monate 7+)
- [ ] Team-Features
- [ ] API für Integrationen
- [ ] Template-Marktplatz
- [ ] A/B Testing für Boards
- [ ] KI-Features (Auto-Layout, Content-Vorschläge)
- [ ] Mobile Apps

## 🚧 Potenzielle Herausforderungen & Lösungen

### Challenge: Performance bei vielen Medien
**Lösung**: 
- Lazy Loading
- Cloudflare CDN
- Optimierte Thumbnails
- Progressive Video Loading

### Challenge: Komplexität des Builders
**Lösung**:
- Progressives Onboarding
- Kontextuelle Hilfe
- Video-Tutorials
- Vorlagen für schnellen Start

### Challenge: Storage-Kosten
**Lösung**:
- Aggressive Komprimierung
- Storage-Limits per User
- Cloudflare R2 als Alternative
- Automatisches Cleanup inaktiver Boards

### Challenge: DSGVO-Compliance
**Lösung**:
- Privacy-by-Design
- Minimale Datenerfassung
- Transparente Datenschutzerklärung
- Cookie-less Analytics (Plausible)

## 🔮 Zukunftsperspektiven

### Kurz- bis mittelfristig (6-12 Monate)
- **CRM-Integrationen**: HubSpot, Pipedrive
- **Erweiterte Integrationen**: Calendly, Stripe Checkout
- **Collaboration**: Kommentare, gemeinsame Bearbeitung
- **Automatisierungen**: Follow-up E-Mails, Reminder

### Langfristig (12+ Monate)
- **KI-Assistant**: Layout-Vorschläge, Content-Generation
- **Enterprise-Features**: SSO, Audit-Logs, SLA
- **Whitelabel-Lösung**: Komplett gebrandete Instanzen
- **Mobile Apps**: iOS/Android für Board-Erstellung
- **Marketplace**: Templates, Blöcke, Integrationen

## 📝 Nächste Schritte

### Sofort
1. **Tech-Stack Setup**: AppWrite Instance, Next.js Projekt initialisieren
2. **Design-System**: ShadCN UI konfigurieren, Basis-Komponenten
3. **Prototyp**: Einfacher Drag&Drop mit 2-3 Block-Typen

### Woche 1-2
1. **User-Auth**: AppWrite Authentication implementieren
2. **Mediathek**: Upload und Verwaltung
3. **Grid-System**: Basis-Implementation mit @dnd-kit

### Woche 3-4
1. **Board-Speicherung**: Serialisierung und Deserialisierung
2. **Board-Viewer**: Öffentliche Ansicht
3. **Basis-Analytics**: View-Tracking

## 🎯 Erfolgskriterien

### Technische KPIs
- Page Load Time < 2s
- Builder Response Time < 100ms
- 99.9% Uptime
- Mobile Performance Score > 90

### Business KPIs
- 1000+ registrierte User in 6 Monaten
- 10% Conversion Free → Pro
- < 5% Churn Rate
- NPS Score > 50

### User Experience KPIs
- Time to First Board < 5 Minuten
- Support-Tickets < 5% der aktiven User
- Feature Adoption Rate > 60%
- User Engagement: 3+ Boards/User/Monat

## 💡 Wichtige Überlegungen

### Was LemonSpace NICHT ist
- Kein Website-Builder
- Kein vollwertiges CMS
- Keine E-Mail-Marketing-Plattform
- Kein Präsentations-Tool (wie PowerPoint)

### Was LemonSpace IST
- Eine Brücke zwischen E-Mail und Website
- Ein Tool für personalisierte Verkaufserlebnisse
- Eine Plattform für messbare Kunden-Interaktionen
- Ein No-Code-Tool für Nicht-Techniker

---

## 📊 Zusammenfassung

LemonSpace.io hat das Potenzial, eine wichtige Lücke im Markt für Vertriebs-Tools zu schließen. Mit dem Fokus auf Benutzerfreundlichkeit, professionelles Design und messbare Ergebnisse kann es sich als unverzichtbares Tool für moderne Vertriebler etablieren. Der gewählte Tech-Stack ist zukunftssicher und skalierbar, während das Freemium-Modell einen niedrigschwelligen Einstieg bei gleichzeitig attraktiven Upgrade-Pfaden bietet.

**Kernstärken des Konzepts:**
- Klare Zielgruppe mit echtem Bedarf
- Technisch machbar mit modernem Stack
- Skalierbares Geschäftsmodell
- Differenzierung durch Einfachheit

**Erfolgsfaktoren:**
- Exzellente User Experience
- Schnelle Iteration basierend auf User-Feedback
- Fokus auf Kern-Features vor Feature-Creep
- Community-Building mit Early Adopters

---

*Dieser Masterplan dient als lebendiges Dokument und sollte regelmäßig basierend auf User-Feedback und Marktentwicklungen aktualisiert werden.*
