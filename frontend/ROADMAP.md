### **Specifikation för Roadmap-Features**

Detta dokument beskriver de tekniska och funktionella kraven för att implementera de punkter som definierats i projektets roadmap.

---

### **1. Förbättrade Statusnamn för Student (NICE TO HAVE)**

**Problem:** Statusen "IN_PROGRESS" är inte intuitiv. Den representerar ett tillstånd där studenten har genomfört ett prov men inte klarat det, och nu väntar på att få ett nytt prov tilldelat.

#### **1.1 Funktionella Krav**
* Systemet ska använda tydligare statusnamn för ett ämnes tillstånd i studentens dashboard.
* Följande statusar föreslås:
    * `LOCKED`: Ämnet är inte tillgängligt. Examinator har inte förberett något prov.
    * `READY_FOR_TEST`: Ett prov är tilldelat och redo att startas.
    * `ATTEMPTED_FAILED`: Studenten har gjort minst ett försök men inte blivit godkänd. Väntar på nytt prov.
    * `PASSED`: Studenten har klarat provet för ämnet.

#### **1.2 Design och Användarflöde (UI/UX)**
* I studentens dashboard ska dessa nya statusar visas tydligt för varje ämne.
    * **Exempel:**
        * Meteorologi: `ATTEMPTED_FAILED` (visas med t.ex. en orange ikon)
        * Air Law: `READY_FOR_TEST` (visas med t.ex. en grön "Starta"-knapp)
        * Principles of Flight: `PASSED` (visas med t.ex. en bock och är låst)

#### **1.3 API Endpoints (Backend)**
* `GET /api/student/dashboard` (Uppdaterat svar)
    * **Syfte:** Denna endpoint ska innehålla logiken för att beräkna och returnera den nya, tydligare statusen för varje ämne baserat på studentens provhistorik i `tests` och `test_attempts`.
    * **Exempel på svar:**
        ```json
        [
          { "subject": "Meteorologi", "status": "ATTEMPTED_FAILED", "attempts": 2, "bestScore": "15/20" },
          { "subject": "Air Law", "status": "READY_FOR_TEST", "testId": "ObjectId(...)" }
        ]
        ```

---

### **2. Slumpad Svarsordning (SHOULD)**

**Problem:** Svarsalternativen för en fråga presenteras alltid i samma ordning som de är lagrade i databasen, vilket kan leda till att studenten lär sig positionen på svaret istället för själva svaret.

#### **2.1 Funktionella Krav**
* För varje fråga som presenteras för studenten under ett prov ska ordningen på de fyra svarsalternativen slumpas.
* Systemet måste hålla reda på vilket av de slumpade alternativen som är det korrekta för att kunna rätta provet korrekt.

#### **2.2 Systemprocess**
1.  **När provet startas:**
    * Backend-logiken för `GET /api/tests/:testId/start` måste för varje fråga:
        a. Ta `options`-arrayen (t.ex. `["A", "B", "C", "D"]`) och det korrekta indexet `correctOptionIndex` (t.ex. `1` för "B").
        b. Slumpa ordningen på `options`-arrayen till en ny array, t.ex. `["C", "A", "D", "B"]`.
        c. Skicka denna slumpade array till frontend.
        d. **Viktigt:** För att kunna rätta provet måste backend temporärt lagra en mappning för varje fråga, t.ex. i `test_attempts` när det skapas, eller i en sessionsvariabel. Mappningen visar hur de ursprungliga indexen mappar till de nya.
2.  **När provet skickas in:**
    * Backend-logiken för `POST /api/tests/:testId/submit` måste:
        a. För varje svar från studenten (som är ett index från den slumpade ordningen), använda den sparade mappningen för att översätta det tillbaka till det ursprungliga indexet.
        b. Jämföra det översatta indexet med det `correctOptionIndex` som finns lagrat för frågan i `questions`-collection.
        c. Betygsätta svaret.

#### **2.3 Uppdateringar i Datamodeller**
* **`test_attempts` collection:** Kan behöva ett nytt fält för att lagra mappningen av frågornas svarsordning för just det försöket.
    ```json
    {
      // ... andra fält
      "questionShuffleMap": [
        { "questionId": "ObjectId(...)", "shuffledOrder": [3, 0, 2, 1] } // Original index 0 är nu på plats 1, etc.
      ]
    }
    ```

---

### **3. Administratör: Hantering av Examinatorer (SHOULD)**

**Problem:** Det finns inget sätt för en administratör att hantera examinator-konton.

#### **3.1 Funktionella Krav**
* En inloggad administratör ska kunna skapa, se en lista över, arkivera och återaktivera examinator-konton.
* Logiken ska vara nästan identisk med hur en examinator hanterar studenter.

#### **3.2 Design och Användarflöde (UI/UX)**
* Administratörens gränssnitt ska ha en vy för "Hantera Examinatorer".
* Vyn ska innehålla en lista över alla examinatorer och en knapp för att "+ Skapa ny examinator".
* Processen för att skapa och arkivera ska följa samma mönster som för studenthantering.

#### **3.3 API Endpoints (Backend)**
* `GET /api/admin/examinators`
    * **Auth:** Kräver admin-roll.
    * **Syfte:** Hämtar lista på alla användare med rollen `examinator`.
* `POST /api/admin/examinators`
    * **Auth:** Kräver admin-roll.
    * **Body:** `{ "username": "nyexaminator" }`
    * **Syfte:** Skapar en ny användare med rollen `examinator` och ett temporärt lösenord.
* `PUT /api/admin/examinators/:examinatorId/archive`
    * **Auth:** Kräver admin-roll.
    * **Syfte:** Arkiverar en examinator.
* `PUT /api/admin/examinators/:examinatorId/reactivate`
    * **Auth:** Kräver admin-roll.
    * **Syfte:** Återaktiverar en arkiverad examinator.

---

### **4. Automatisk Arkivering av Godkända Studenter (NICE TO HAVE)**

**Problem:** Studenter som har klarat alla prov ligger kvar som aktiva i systemet.

#### **4.1 Funktionella Krav**
* Systemet ska automatiskt arkivera en student som har klarat alla nio ämnen.
* Arkiveringen ska ske efter en definierad tidsperiod (grace period), t.ex. 30 dagar efter att det sista provet blev godkänt.

#### **4.2 Systemprocess**
* Detta implementeras bäst som en **schemalagd funktion** (t.ex. en cron job på Netlify som körs en gång per dygn).
* **Logik för den schemalagda funktionen:**
    1.  Hämta alla aktiva (`archived: false`) studenter.
    2.  För varje student:
        a. Räkna antalet unika, godkända ämnen i `test_attempts`.
        b. Om antalet är 9:
            i. Hitta datumet för det senast godkända provet (`submittedAt`).
            ii. Beräkna om `(dagens datum - senast godkända datum) > grace_period`.
            iii. Om sant, uppdatera studentens dokument i `users` till `archived: true`.

#### **4.3 Konfiguration**
* `GRACE_PERIOD_DAYS`: Tidsperioden (t.ex. `30`) bör definieras som en miljövariabel i Netlify för enkel konfiguration.

#### **4.4 API Endpoints (Backend)**
* `POST /api/system/cron/archive-students`
    * **Syfte:** En skyddad endpoint som anropas av en schemaläggare (t.ex. Netlify's cron-funktion) för att starta arkiveringsprocessen. Endpointen bör skyddas med en hemlig nyckel.
