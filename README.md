# Calendrier MMA

Toutes les soirées MMA à venir, au même endroit : **date, heure de Paris, chaîne française, lieu et carte complète des combats**.

Organisations suivies : **UFC, PFL (ex-Bellator), ONE, RIZIN, ARES, Hexagone MMA, KSW, Oktagon, Cage Warriors, Brave CF**.

C'est une app web installable (PWA), 100 % gratuite : hébergée sur GitHub Pages, mise à jour automatiquement **chaque lundi** par GitHub Actions.

## Fonctionnalités

- **Liste** par semaine (« Cette semaine », « Semaine prochaine »…) et **vue calendrier** mensuelle.
- Pour chaque soirée : **main event et co-main event** (noms complets) visibles directement, heures des *early prelims*, *prelims* et *main card* en heure de Paris, avec les chaînes (les diffusions gratuites sont en vert).
- Fiche détaillée avec la **carte complète** : main event, combats pour un titre, catégories, palmarès.
- **Prochaine soirée** mise en avant, avec un compte à rebours.
- Filtres par organisation, recherche (combattant, événement, ville) et filtre « gratuit uniquement ».
- **Abonnement agenda** (iPhone, Google Agenda, Outlook) : un calendrier pour toutes les orgas ou un par orga, mis à jour tout seul.
- Bouton « Ajouter à mon agenda » sur chaque soirée (avec rappel 1 h avant).
- Thème sombre et clair, fonctionne hors ligne, s'installe sur l'écran d'accueil (icône créée avec FLORA).

## Mise en ligne (une seule fois)

1. Fusionne cette branche dans `main`. Les mises à jour programmées ne tournent que sur la branche par défaut.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
3. Onglet **Actions** → « Mise à jour et publication » → **Run workflow** pour la première publication.
4. L'app est en ligne sur `https://<ton-pseudo>.github.io/<nom-du-dépôt>/`.

> GitHub Pages est gratuit pour les dépôts **publics**. Pour un dépôt privé, il faut un compte GitHub Pro.

**Installer sur téléphone :**
- iPhone : ouvre le site dans Safari → Partager → « Sur l'écran d'accueil ».
- Android : ouvre-le dans Chrome → menu ⋮ → « Installer l'application ».

## Comment marche la mise à jour

Chaque lundi à 5 h UTC, `scripts/update.py` :

1. récupère l'UFC et le PFL sur l'API publique d'**ESPN**, qui donne l'heure exacte de chaque partie de la soirée ;
2. récupère les autres organisations sur **Sherdog** (dates, lieux, cartes) ;
3. ajoute les chaînes françaises et les horaires habituels depuis `config/organizations.json` ;
4. applique tes corrections de `data/overrides.json` ;
5. écrit `data/events.json` et les calendriers `data/ics/*.ics`, commite, puis republie le site.

Si une source est en panne, les événements déjà connus sont conservés.

Pour lancer une mise à jour à la main : onglet **Actions** → **Run workflow**. En local : `python3 scripts/update.py` (Python 3.9 ou plus récent, aucune dépendance).

## Fiabilité des infos

- **Heures** : exactes pour l'UFC et le PFL. Pour les autres orgas, la source ne donne que la date. L'heure affichée est alors **estimée** d'après les habitudes de l'organisation, et marquée **≈**.
- **Chaînes** : droits TV en France, tels qu'on les connaît en novembre 2026. Ils peuvent changer d'une soirée à l'autre.

### Corriger ou compléter une info

- **Pour une soirée précise**, modifie `data/overrides.json` :

  ```json
  {
    "overrides": [
      {
        "match": "ARES 45",
        "times": {"prelims": "2026-11-20T19:30", "main": "2026-11-20T20:30"},
        "broadcast": {"main": [{"name": "Canal+ Sport 360", "free": false}]},
        "notes": "Main card en clair sur C8"
      },
      {"match": "Friday Fights", "hide": true}
    ]
  }
  ```

  Les heures sont en heure de Paris. `match` est un morceau du nom de l'événement.

- **Pour toute une organisation** (nouvelle chaîne, horaires habituels…), modifie `config/organizations.json`. Tu peux aussi y ajouter une organisation : il suffit de trouver son adresse Sherdog (`sherdog.com/organizations/...`).

## Version claude.ai (sans GitHub Pages)

L'app est aussi publiée sur une page claude.ai, mise à jour chaque lundi par une tâche programmée dans Claude.
`python3 scripts/build_artifact.py` fabrique `artifact/index.html` (styles et script intégrés) ; la page est publiée avec les fichiers `data/events.json` et `icons/icon-192.png`.
Sur cette version, le thème suit celui de Claude, et l'ajout à l'agenda passe par Google Agenda ou Outlook (pas d'abonnement .ics).

## Structure

```
index.html, assets/          l'application (HTML, CSS, JS sans dépendance)
manifest.webmanifest, sw.js  installation et mode hors ligne
config/organizations.json    orgas, chaînes France, horaires habituels
data/events.json             données générées (ne pas modifier à la main)
data/overrides.json          tes corrections manuelles
data/ics/                    calendriers à s'abonner
scripts/update.py            script de mise à jour
.github/workflows/           automatisation du lundi + publication
```
