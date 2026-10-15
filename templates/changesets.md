## Releasing with changesets

Releases are managed by [Changesets](https://github.com/changesets/changesets). When you make a change that affects how the action behaves for consumers, add a changeset:

```bash
yarn changeset
```

Pick the bump type when prompted, write a short but descriptive summary, & commit the generated file in `.changeset/` alongside your code:

- **patch** for bug fixes
- **minor** for new, backwards-compatible features
- **major** for breaking changes

Please be sure that changes are written for a human reader rather than a short commit message. Changes that don't affect consumers (docs, tests, CI, internal refactors) don't need a changeset.
