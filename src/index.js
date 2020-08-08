const fs = require("fs");
const path = require("path");
const {
  getTSFilePaths,
  getTSPathsMapping,
  removeLeadingAndTrailingSlash,
  resolveRelativePath,
} = require("./utils");

const appDir = process.cwd();
const hasOwn = Object.prototype.hasOwnProperty;

// These directory names are computed only once per build process, so you
// may need to restart Meteor to pick up any changes.

const nodeModulesDirNames = Object.create(null);
fs.readdirSync(path.join(appDir, "node_modules")).forEach((dir) => {
  if (!dir.startsWith(".")) {
    nodeModulesDirNames[dir] = true;
  }
});

const topLevelDirNames = Object.create(null);
fs.readdirSync(appDir).forEach((item) => {
  if (!item.startsWith(".") && item !== "node_modules") {
    const stat = fs.statSync(item);
    if (stat.isDirectory()) {
      topLevelDirNames[item] = stat;
    }
  }
});

const tsFilePaths = getTSFilePaths(`${appDir}/imports`);

const pathsMapping = getTSPathsMapping(appDir);

module.exports = function plugin(api) {
  function helper(path, state) {
    // An ImportDeclaration will always have a source, but an
    // ExportAllDeclaration or ExportNamedDeclaration may not.
    const { source } = path.node;
    if (!source) return;
    let resolvedSourceId = source.value;
    let importPathFirstElement = resolvedSourceId.split("/", 1)[0];

    // Skip npm module and Meteor package imports
    if (
      resolvedSourceId.startsWith("meteor/") ||
      hasOwn.call(nodeModulesDirNames, importPathFirstElement)
    )
      return;

    // Parse tsconfig.json to resolve paths mapping
    if (
      pathsMapping &&
      Object.keys(pathsMapping).includes(importPathFirstElement)
    ) {
      resolvedSourceId = resolvedSourceId.replace(
        importPathFirstElement,
        `/${pathsMapping[importPathFirstElement]}`
      );
    }

    // Resolve import paths not having an extension
    const importedFileName = resolvedSourceId.split("/").pop();
    if (!importedFileName.includes(".")) {
      let resolvedRelativePath = resolvedSourceId;

      // Resolve relative paths
      if (
        resolvedRelativePath.startsWith("./") ||
        resolvedRelativePath.startsWith("../")
      ) {
        const { sourceFileName } = state.file.opts;
        const currentPath = sourceFileName.substring(
          0,
          sourceFileName.lastIndexOf("/")
        );
        resolvedRelativePath = resolveRelativePath(
          currentPath,
          resolvedRelativePath
        );
      }

      const matchingTSFilePath = tsFilePaths.find(
        (filePath) =>
          filePath ===
            `${removeLeadingAndTrailingSlash(resolvedRelativePath)}.ts` ||
          filePath ===
            `${removeLeadingAndTrailingSlash(resolvedRelativePath)}.tsx`
      );

      if (matchingTSFilePath) {
        resolvedSourceId = matchingTSFilePath.includes(".tsx")
          ? `${resolvedRelativePath}.tsx`
          : `${resolvedRelativePath}.ts`;
        // Update this variable for the next processing stage
        importPathFirstElement = resolvedSourceId.split("/", 1)[0];
      }
    }

    // If the first component of the sourceId is a top-level directory in
    // the application, and not the name of a directory in node_modules,
    // prepend a leading / to make it an absolute identifier that Meteor's
    // module system can understand.
    // e.g. 'imports/foo/bar' --> '/imports/foo/bar'
    if (
      !resolvedSourceId.startsWith("/imports/") &&
      hasOwn.call(topLevelDirNames, importPathFirstElement) &&
      !hasOwn.call(nodeModulesDirNames, importPathFirstElement)
    ) {
      resolvedSourceId = `/${resolvedSourceId}`;
    }

    // Perform path transform
    if (resolvedSourceId !== source.value)
      path.get("source").replaceWith(api.types.stringLiteral(resolvedSourceId));
  }

  return {
    name: "meteor-typescript-import-transform",
    visitor: {
      ImportDeclaration: helper,
      ExportAllDeclaration: helper,
      ExportNamedDeclaration: helper,
    },
  };
};
