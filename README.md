# meteor-typescript-import-transform

## Intro

This plugin addresses TypeScript import issues in Meteor projects when switching from legacy (`barbatus:typescript` based) packages to the official `typescript` package.  

The plugin is inspired by an [implementation](https://github.com/meteor/meteor/pull/10610#issuecomment-515476972) from Ben Newman.

## The addressed issues

### Paths without leading slash (e.g. `imports/bar`) is not recognized as valid import paths

The plugin adds a leading slash to these paths (e.g. `/imports/bar`).

### Paths mapping in `tsconfig.json` is not recognized

The plugin automatically parses `tsconfig.json` and resolve paths mapping.

### `import 'imports/module/main'` may not work as expected 

When an import path doesn't specify file extension, the wrong file might be picked if
there're other files having the same name in the directory. For example:
```
imports/module/main.ts
imports/module/main.html
```

The plugin generates a list of all `.ts` and `.tsx` files and attempts to load them
when a matching import path without extension is detected.

## Usage

Install the package:

`npm i babel-plugin-meteor-typescript-import-transform`

Then include the plugin in your `.babelrc`:

```
{
  "plugins": ["meteor-typescript-import-transform"]
}
```