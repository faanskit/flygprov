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
