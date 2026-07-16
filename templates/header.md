<h1 align="center">{{ repo.name }}</h1>
<p align="center">
  <b>{{ repo.description }}</b>
</p>

<p align="center">

  <a href="https://allons-y.studio">
    <img src="https://github.com/allonsy-studio/.github/blob/main/assets/svg/badge.svg" alt="Brought to you by Allons-y Studio" height="20" />
  </a>

  <a href="{{ repo.url }}/actions/workflows/testing.yml">
    <img src="{{ repo.url }}/actions/workflows/testing.yml/badge.svg?branch={{ repo.default_branch }}" alt="Tests" height="20" />
  </a>
  <a href="https://www.npmjs.com/package/{{#if npm_org}}{{ npm_org }}/{{/if}}{{ repo.name }}">
  <img src="https://img.shields.io/npm/v/{{#if npm_org}}{{ npm_org }}/{{/if}}{{ repo.name }}.svg" alt="NPM version" height="20" />
  </a>

</p>
