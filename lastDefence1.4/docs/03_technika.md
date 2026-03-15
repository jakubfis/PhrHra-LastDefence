# 3. Technické řešení a grafika

Hra využívá JavaScriptové API `Canvas`. Díky tomu je pohyb plynulý (60 FPS).

### Grafické vychytávky
* **Rozptyl pozice:** Nepřátelé nechodí v jedné přímce, ale jsou trochu rozházení nahoru a dolů. Díky tomu se tolik nepřekrývají.
* **Záře (Shadows):** Všechny postavy mají kolem sebe neonovou záři, aby vynikly na černém pozadí.
* **HP bary:** U nohou našich staveb, nebo u enemy se nachází číslo s HP.

### Ovládání
* **Stavění:** Myší klikáš na mřížku. Je přesně vidět, kam postava padne.
* **Výběr:** V menu je jasně zvýrazněné, kterou postavu máš zrovna vybranou.
* **Delete a Pauza:** Ve hře je tlačítko pro smazání postavy (koš) a pauza, kde se dá hra i restartovat.