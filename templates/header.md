<p align="center">
<a href="https://allons-y.studio">
    <img id="user-content-logo" src="https://raw.githubusercontent.com/allonsy-studio/.github/main/assets/png/oss-banner.png" alt="Brought to you by Allons-y Studio" width="1500">
</a>
</p>

<h1 align="center" border="none">{{ repo.name }}</h1>

<p align="center">
  <img src="https://github.com/allonsy-studio/.github/blob/main/assets/tag-rule.gif" alt="" height="30" />
</p>

<p align="center"><b>{{ repo.description }}</b></p>

<p align="center">
  <a href="{{ repo.url }}/actions/workflows/testing.yml">
    <img src="{{ repo.url }}/actions/workflows/testing.yml/badge.svg?branch={{ repo.default_branch }}" alt="Tests" height="20" />
  </a>
  <a href="https://www.npmjs.com/package/{{#if npm_org}}{{ npm_org }}/{{/if}}{{ repo.name }}">
    <img src="https://img.shields.io/npm/v/{{#if npm_org}}{{ npm_org }}/{{/if}}{{ repo.name }}.svg" alt="NPM version" height="20" />
  </a>
  <a href="{{ repo.url }}/blob/{{ repo.default_branch }}/LICENSE">
    <img src="https://img.shields.io/github/license/{{ repo.full_name }}.svg" alt="License" height="20" />
  </a>
  <a href="https://allons-y.studio">
    <img src="https://github.com/allonsy-studio/.github/blob/main/assets/svg/badge.svg" alt="Brought to you by Allons-y Studio" height="20" />
  </a>
</p>
