# Modèles MediaPipe

Ce dossier est vide dans le dépôt : les `.task` sont des binaires de
plusieurs mégaoctets, ils ne sont pas versionnés.

Pour les récupérer :

```sh
./scripts/fetch-models.sh
```

Sans `hand_landmarker.task`, l'application démarre quand même — elle bascule
sur la souris et le signale sur l'écran de boot. C'est le mode utilisé pour
développer l'interface en ligne.
