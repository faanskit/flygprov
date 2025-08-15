### **Specifikation för Roadmap-Features**

Detta dokument beskriver de tekniska och funktionella kraven för att implementera de punkter som definierats i projektets roadmap.

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
