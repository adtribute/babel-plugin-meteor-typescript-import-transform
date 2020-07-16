const fs = require('fs');
const { dirname, join } = require('path');

const appDir = dirname(dirname(__dirname));
const hasOwn = Object.prototype.hasOwnProperty;

// These directory names are computed only once per build process, so you
// may need to restart Meteor to pick up any changes.

const nodeModulesDirNames = Object.create(null);
fs.readdirSync(join(appDir, 'node_modules')).forEach((dir) => {
  if (!dir.startsWith('.')) {
    nodeModulesDirNames[dir] = true;
  }
});

const topLevelDirNames = Object.create(null);
fs.readdirSync(appDir).forEach((item) => {
  if (!item.startsWith('.') && item !== 'node_modules') {
    const stat = fs.statSync(item);
    if (stat.isDirectory()) {
      topLevelDirNames[item] = stat;
    }
  }
});

// Babel plugin that rewrites import declarations like
//
//   import foo from "imports/bar"
//
// to use properly absolute identifier strings like
//
//   import foo from "/imports/bar"
//
// TypeScript can understand imports/bar thanks to the "paths" property in
// tsconfig.json, but Node and Meteor treat imports/bar as referring to a
// package in node_modules called "imports", which does not exist.
//
// If a directory name exists in both node_modules and the root
// application directory, the node_modules package will take precedence.

module.exports = function plugin(api) {
  function helper(path) {
    // An ImportDeclaration will always have a source, but an
    // ExportAllDeclaration or ExportNamedDeclaration may not.
    const { source } = path.node;
    if (!source) return;

    const sourceId = source.value;
    const name = sourceId.split('/', 1)[0];

    // If the first component of the sourceId is a top-level directory in
    // the application, and not the name of a directory in node_modules,
    // prepend a leading / to make it an absolute identifier that Meteor's
    // module system can understand.
    if (
      hasOwn.call(topLevelDirNames, name) &&
      !hasOwn.call(nodeModulesDirNames, name)
    ) {
      path.get('source').replaceWith(api.types.stringLiteral(`/${sourceId}`));
    }
  }

  return {
    name: 'transform-non-relative-imports',
    visitor: {
      ImportDeclaration: helper,
      ExportAllDeclaration: helper,
      ExportNamedDeclaration: helper,
    },
  };
};