### **Tillägg till Specifikation: Användarhantering för Examinator**

Denna sektion beskriver flödet och kraven för att skapa och arkivera student-användare, en uppgift som utförs av en "Examinator".

#### **1. Funktionella Krav**

**Skapa ny student:**
* En inloggad examinator måste ha ett gränssnitt för att skapa nya studenter.
* Vid skapandet ska examinatorn ange ett **användarnamn** för studenten.
* Systemet ska automatiskt generera ett **temporärt lösenord**.
* Det nya kontot ska automatiskt få rollen `student`.
* Systemet måste validera att användarnamnet är unikt och inte redan existerar.
* Det temporära lösenordet ska visas för examinatorn **en (1) enda gång** direkt efter att kontot skapats, med en tydlig uppmaning att spara det för att ge till studenten.

**Hantera och arkivera studenter:**
* Examinatorn ska kunna se en lista över alla studenter som finns i systemet.
* Listan ska tydligt visa varje students status (t.ex. "Aktiv" eller "Arkiverad").
* Examinatorn måste ha ett sätt att **arkivera** en aktiv student.
* En arkiverad student ska inte kunna logga in.
* En arkiverad student ska inte visas i listan över valbara studenter när ett nytt prov skapas.
* Examinatorn måste även ha ett sätt att **återaktivera** en arkiverad student.

#### **2. Design och Användarflöde (UI/UX)**

För att implementera detta föreslås följande gränssnitt i examinatorns inloggade vy:

1.  **Navigering:** En ny meny-länk i examinatorns gränssnitt kallad **"Hantera Studenter"**.
2.  **Översiktsvy ("Hantera Studenter"):**
    * En sida som visar en **tabell eller lista** med alla studenter.
    * **Kolumner i tabellen:** `Användarnamn`, `Status (Aktiv/Arkiverad)`, `Skapad (Datum)`.
    * Ovanför tabellen finns en tydlig knapp: **"+ Skapa ny student"**.
    * Bredvid varje student i listan finns en "..." (mer info/åtgärder)-knapp som öppnar en meny med alternativen:
        * `Arkivera` (om studenten är aktiv).
        * `Återaktivera` (om studenten är arkiverad).
3.  **Flöde för att skapa ny student:**
    * Examinatorn klickar på **"+ Skapa ny student"**.
    * En **modal/pop-up-dialogruta** visas.
    * Dialogrutan innehåller:
        * En rubrik: "Skapa ny student".
        * Ett textfält märkt "Användarnamn".
        * En knapp märkt "Skapa student".
    * Efter att ha klickat på "Skapa student" och om det lyckas, visar samma dialogruta ett framgångsmeddelande:
        * "**Studenten 'studentnamn' har skapats!**"
        * "**Temporärt lösenord:** `hemligt123`"
        * "**Viktigt:** Kopiera lösenordet och ge det till studenten. Det kommer inte att visas igen."
        * En "Stäng"-knapp.

#### **3. API Endpoints (Backend)**

Följande nya API-endpoints behövs för att stödja denna funktionalitet.

* `POST /api/examinator/students`
    * **Syfte:** Skapar en ny student.
    * **Auth:** Kräver examinator-roll.
    * **Body:** `{ "username": "nyastudenten" }`
    * **Svar (Success):** `201 Created`. Returnerar det nya användarobjektet inklusive det temporära lösenordet.
        ```json
        {
          "userId": "ObjectId(...)",
          "username": "nyastudenten",
          "tempPassword": "generated-secure-password"
        }
        ```
    * **Svar (Error):** `409 Conflict` om användarnamnet redan finns.

* `GET /api/examinator/students`
    * **Syfte:** Hämtar en lista över alla studenter för hanteringsvyn.
    * **Auth:** Kräver examinator-roll.
    * **Query Params (förslag):** `?status=active` (default), `?status=archived`, `?status=all`.
    * **Svar (Success):** `200 OK`. Returnerar en array med studentobjekt.
        ```json
        [
          { "userId": "...", "username": "student1", "status": "active", "createdAt": "..." },
          { "userId": "...", "username": "student2", "status": "archived", "createdAt": "..." }
        ]
        ```

* `PUT /api/examinator/students/:studentId/archive`
    * **Syfte:** Arkiverar en specifik student.
    * **Auth:** Kräver examinator-roll.
    * **Svar (Success):** `200 OK` med ett bekräftelsemeddelande.

* `PUT /api/examinator/students/:studentId/reactivate`
    * **Syfte:** Återaktiverar en specifik student.
    * **Auth:** Kräver examinator-roll.
    * **Svar (Success):** `200 OK` med ett bekräftelsemeddelande.

#### **4. Uppdateringar i Datamodeller**

Den befintliga `users` datamodellen stödjer redan detta väl, men vi förtydligar här:

**`users` collection:**
```json
{
  "_id": "ObjectId",
  "username": "String",
  "password": "String", // Alltid hashat (t.ex. med bcrypt)
  "role": "String", // Sätts till 'student' vid skapande
  "createdAt": "Date",
  "archived": "Boolean" // Sätts till 'true' vid arkivering, 'false' vid skapande/återaktivering
}
```
**Viktigt:** Det temporära lösenordet som genereras på servern ska hashas innan det sparas i `password`-fältet i databasen. Det är endast klartext-versionen som returneras en gång i API-svaret vid skapandet.
