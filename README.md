[voice-recognition.js](https://emersion.github.io/voice-recognition.js/)
========================================================================

A Javascript library for low-level voice recognition.

Pourquoi ?
----------

Cette application a été realisée à l'occasion d'un TPE sur la reconnaissance vocale. Faire soi-même sa propre reconnaissance vocale sans connaissance préalable était déjà un challenge, mais pour mettre encore plus de piment j'ai décidé de rajouter une deuxième contrainte : faire le programme en Javascript pur.

Technologies utilisées
----------------------

* HTML5, CSS3 (Twitter Bootstrap 2)
* Javascript
* Flash en fallback si l'[API Audio HTML5](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) n'est pas disponible 

Navigateurs supportés
---------------------

L'application devrait fonctionner sans problème sur les dernières versions de **Firefox** et de **Chromium**/Chrome.

Pour l'instant, l'analyse de fichiers audio n'est fonctionnelle que sur **Firefox**, car elle est basée sur [Mozilla Audio API](https://developer.mozilla.org/en-US/docs/Introducing_the_Audio_API_Extension).

RTFM ?
------

Des documents expliquant le principe de fonctionnement du programme sont disponibles dans le code source du projet. Vous pouvez les consulter en ligne sur le site web : https://emersion.github.io/voice-recognition.js/.

License
-------

This project is released under the MIT License (MIT).

Copyright (c) 2014 emersion <http://emersion.fr>
