# Flygprov

En webbapplikation för förberedande prov (pre-tests) för pilotelever vid Kalmar flygklubb. Applikationen hjälper elever att öva inför sina teoretiska prov hos Transportstyrelsen inom de nio obligatoriska ämnesområdena.

## Nuvarande Funktioner (Studentvy)
*   Säker inloggning för studenter.
*   Personlig översikt (Dashboard) som visar status för alla nio ämnen.
*   Möjlighet att starta tillgängliga prov direkt från översikten.
*   Fullständigt provflöde med 20 flervalsfrågor.
*   Visning av en fråga i taget med framstegsindikator (progress bar).
*   Navigering mellan frågor (föregående/nästa och via progress-baren).
*   Inlämning av prov.
*   Detaljerad resultatsida som visar poäng och en genomgång av rätt/fel svar.

## Teknisk Stack
*   **Frontend:** TypeScript, HTML, Bootstrap
*   **Backend:** Netlify Functions (TypeScript)
*   **Databas:** MongoDB
*   **Byggverktyg:** esbuild
*   **Pakethanterare:** npm Workspaces

## Komma Igång

För att köra projektet lokalt, följ dessa steg:

### 1. Förutsättningar
*   [Node.js](https://nodejs.org/) (LTS-version rekommenderas)
*   En aktiv [MongoDB](https://www.mongodb.com/)-instans (lokal eller via Atlas)

### 2. Installation
1.  Klona repot (om det inte redan är gjort):
    ```bash
    git clone <repository-url>
    cd Flygprov
    ```
2.  Installera alla beroenden i monorepot:
    ```bash
    npm install
    ```

### 3. Konfiguration
1.  Skapa en `.env`-fil i projektets rot genom att kopiera från `.env.example`.
2.  Lägg till din MongoDB connection string i `.env`-filen:
    ```
    MONGO_URI="mongodb+srv://..."
    ```

### 4. Databas-seeding
För att populera databasen med grundläggande data (användare, ämnen) och ett exempelprov, kör följande kommandon från projektets rot:

```bash
# Seed:a grunddata (användare, ämnen, försök)
npm run db:seed -w netlify/functions

# Seed:a ett exempelprov med 20 frågor
npm run db:seed:tests -w netlify/functions
```

### 5. Kör Utvecklingsservern
Starta den lokala servern som hanterar både frontend och backend-funktioner:
```bash
netlify dev
```
Applikationen är nu tillgänglig på `http://localhost:8888`.

### Användning
Logga in med följande testanvändare:
- **Användarnamn:** `student`
- **Lösenord:** `password`
