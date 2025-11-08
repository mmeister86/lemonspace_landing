This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Umgebungsvariablen

Für die Appwrite-Integration müssen folgende Umgebungsvariablen gesetzt werden:

### Lokale Entwicklung (.env.local)

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://backend.lemonspace.io"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="690bb979000e5ba2e734"
NEXT_PUBLIC_APPWRITE_PROJECT_NAME="LemonSpace"
```

### Production (Coolify)

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://backend.lemonspace.io"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="690bb979000e5ba2e734"
NEXT_PUBLIC_APPWRITE_PROJECT_NAME="LemonSpace"
```

**Wichtig:** Die `NEXT_PUBLIC_APPWRITE_ENDPOINT` URL sollte **mit** `/v1` am Ende sein, wie von Appwrite erwartet. Die App normalisiert URLs automatisch und fügt `/v1` hinzu falls es fehlt.

**Beispiele:**
- ✅ Korrekt: `"https://backend.lemonspace.io/v1"`
- ✅ Auch korrekt (wird automatisch normalisiert): `"https://backend.lemonspace.io"`
- ❌ Falsch: `"https://backend.lemonspace.io/"`

## Appwrite Backend-Konfiguration

### CORS-Konfiguration

Für die Produktionsumgebung muss die CORS-Konfiguration im Appwrite-Backend korrekt eingestellt sein:

1. **Appwrite Console öffnen**: Gehe zu deinem Appwrite-Projekt in der Console
2. **Settings → Hostnames**: Füge alle erlaubten Origins hinzu:
   - Für Entwicklung: `http://localhost:3000`
   - Für Produktion: `https://lemonspace.io`
   - Optional: Wildcard `*` für alle Origins (nur für Entwicklung empfohlen)

**Wichtig:** Nach Änderungen an der CORS-Konfiguration kann es einige Minuten dauern, bis die Änderungen wirksam werden.

### Authentifizierung konfigurieren

1. **Email/Password Auth aktivieren**:
   - Gehe zu **Auth → Settings** in der Appwrite Console
   - Aktiviere "Email/Password" als Authentifizierungsmethode
   - Konfiguriere die gewünschten Einstellungen:
     - **Email Verification**: Bestimme, ob E-Mail-Verifizierung erforderlich ist
     - **Password Reset**: Aktiviere Passwort-Reset-Funktionalität
     - **Password History**: Konfiguriere Passwort-Historie-Regeln

2. **Session-Konfiguration**:
   - **Session Duration**: Standardmäßig 1 Jahr, kann angepasst werden
   - **Session Limit**: Anzahl gleichzeitiger Sessions pro Benutzer

## Häufige Probleme und Lösungen

### 401 Unauthorized Fehler

**Problem:** `POST /v1/account/sessions/email 401 (Unauthorized)`

**Mögliche Ursachen und Lösungen:**

1. **Falsche Credentials**:
   - Überprüfe, ob E-Mail und Passwort korrekt sind
   - Stelle sicher, dass der Benutzer existiert

2. **Email-Verifizierung erforderlich**:
   - Wenn Email-Verifizierung im Backend aktiviert ist, muss die E-Mail-Adresse verifiziert sein
   - Überprüfe den Spam-Ordner für die Verifizierungs-E-Mail
   - In der Appwrite Console kann die Verifizierung manuell durchgeführt werden

3. **Authentifizierungsmethode nicht aktiviert**:
   - Überprüfe in der Appwrite Console, ob Email/Password Auth aktiviert ist
   - Gehe zu **Auth → Settings** und aktiviere die Methode

### CORS-Fehler

**Problem:** `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Lösung:**
1. Öffne die Appwrite Console
2. Gehe zu **Settings → Hostnames**
3. Füge die Origin-URL hinzu (z.B. `https://lemonspace.io`)
4. Warte einige Minuten, bis die Änderungen wirksam werden

**Hinweis:** Die Wildcard `*` funktioniert, ist aber aus Sicherheitsgründen nur für Entwicklung empfohlen.

### 403 Forbidden Fehler

**Problem:** `403 (Forbidden)` beim Login

**Mögliche Ursachen:**
- Email-Verifizierung ist erforderlich, aber nicht abgeschlossen
- Benutzer-Konto ist deaktiviert
- IP-Adresse ist blockiert (Rate Limiting)

**Lösung:**
- Überprüfe die E-Mail-Verifizierung
- Überprüfe in der Appwrite Console den Status des Benutzerkontos
- Warte bei Rate Limiting einige Minuten

### Fehlerbehandlung

Die Anwendung verwendet eine verbesserte Fehlerbehandlung, die automatisch benutzerfreundliche Fehlermeldungen basierend auf dem HTTP-Status-Code erstellt:

- **401**: "E-Mail oder Passwort ist falsch"
- **403**: "Bitte verifizieren Sie Ihre E-Mail-Adresse"
- **429**: "Zu viele Anfragen. Bitte warten Sie einen Moment"
- **500-503**: "Ein Serverfehler ist aufgetreten"

Detaillierte Fehlerinformationen werden in der Browser-Konsole ausgegeben (nur im Development-Modus).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
