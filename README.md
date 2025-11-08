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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
