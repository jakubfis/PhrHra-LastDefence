# 4. Audio a odezva

Zvuk je ve hře důležitý, aby hráč věděl, co se děje, i když se zrovna dívá jinam.

### Zvuková logika
Každá akce má svůj zvuk:
* **Útoky:** Tank má zvuk pěstí (`fistHit`), Runner nože (`knifeHit`) a základní enemy meče (`swordHit`).
* **Střelba:** Voják a věž střílí jinak, takže se zvuky nepletou.
* **Zásahy:** Hraje zvuk, když střela trefí enemy (`hitSound`) a když enemy vybuchne/umře (`death`).

### Hlasitost
Všechny zvuky jsem vyladil tak, aby do sebe zapadaly. Útoky nepřátel jsou schválně o něco víc slyšet, aby bylo jasné, že ti zrovna bourají obranu.

### Zdroje
Čerpal jsem sound effecty na YouTube a stáhl je.