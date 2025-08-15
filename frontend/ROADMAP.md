### **Specifikation för Roadmap-Features**

Detta dokument beskriver de tekniska och funktionella kraven för att implementera de punkter som definierats i projektets roadmap.

### **1. Automatisk Arkivering av Godkända Studenter (NICE TO HAVE)**

**Problem:** Studenter som har klarat alla prov ligger kvar som aktiva i systemet.

#### **1.1 Funktionella Krav**
* Systemet ska automatiskt arkivera en student som har klarat alla nio ämnen.
* Arkiveringen ska ske efter en definierad tidsperiod (grace period), t.ex. 30 dagar efter att det sista provet blev godkänt.

#### **1.2 Systemprocess**
* Detta implementeras bäst som en **schemalagd funktion** (t.ex. en cron job på Netlify som körs en gång per dygn).
* **Logik för den schemalagda funktionen:**
    1.  Hämta alla aktiva (`archived: false`) studenter.
    2.  För varje student:
        a. Räkna antalet unika, godkända ämnen i `test_attempts`.
        b. Räkna antalet ämnen som finns i systemet i `subjects`
        b. Om antalen ämnen matchar antalet godkända ämnen:
            i. Hitta datumet för det senast godkända provet (`submittedAt`).
            ii. Beräkna om `(dagens datum - senast godkända datum) > grace_period`.
            iii. Om sant, uppdatera studentens dokument i `users` till `archived: true`.

#### **1.3 Konfiguration**
* `GRACE_PERIOD_DAYS`: Tidsperioden (t.ex. `30`) är  definierad som en miljövariabel i Netlify för enkel konfiguration.

#### **1.4 API Endpoints (Backend)**
* Inga, cronjobbet kör direkt mot databasen.
