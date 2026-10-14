---
title: Getting started
description: Install the project & run it once.
order: 1
---
Install the package:

```sh
{% if project.install %}{{ project.install }}{% else %}npm install {{ site.packageName }}{% endif %}
```

Replace this page with the first thing a new user needs to do.
