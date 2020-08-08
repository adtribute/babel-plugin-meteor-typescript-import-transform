const fs = require("fs");

const removeLeadingAndTrailingSlash = function (path) {
  return path.replace(/^\/|\/$/g, "");
};

// Generate an array of all .ts and .tsx file paths
const getTSFilePaths = function (rootPath) {
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  const tsFilePaths = entries
    .filter((file) => {
      if (!file.isFile()) return;

      const fileExtension = file.name.split(".").pop();

      return (
        !file.name.endsWith(".d.ts") && ["ts", "tsx"].includes(fileExtension)
      );
    })
    .map((file) => {
      const importsPath = "imports/" + rootPath.split("imports/").pop();
      return `${importsPath}/${file.name}`;
    });
  const folders = entries.filter((folder) => folder.isDirectory());

  folders.forEach((folder) => {
    tsFilePaths.push(...getTSFilePaths(`${rootPath}/${folder.name}`));
  });

  return tsFilePaths;
};

// Read tsconfig.json and parse paths mapping
const getTSPathsMapping = function (rootPath) {
  const tsConfigPath = `${rootPath}/tsconfig.json`;

  if (!fs.existsSync(tsConfigPath)) return null;

  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath));
  const pathsMapping =
    tsConfig && tsConfig.compilerOptions && tsConfig.compilerOptions.paths;
  const resolvedPathsMapping = {};

  if (!pathsMapping) return null;

  Object.entries(pathsMapping).forEach(([key, [originalPath]]) => {
    resolvedPathsMapping[key.replace("/*", "")] = originalPath.replace(
      "/*",
      ""
    );
  });

  return resolvedPathsMapping;
};

// Resolve the provided relative part from the current path
// e.g. resolveRelativePath('imports/foo/bar', '../stuff.ts')
// --> 'imports/foo/stuff.ts'
const resolveRelativePath = function (currentPath, relativePath) {
  const isCurrentPath = relativePath.slice(0, 2) === "./";
  const isParentPath = relativePath.slice(0, 3) === "../";
  let output;

  if (!isCurrentPath && !isParentPath) throw new Error("Invalid relative path");

  const currentPathWithoutTrailingSlash = currentPath.replace(/\/$/, "");

  if (isCurrentPath)
    output = `${currentPathWithoutTrailingSlash}/${relativePath.replace(
      "./",
      ""
    )}`;

  if (isParentPath) {
    const currentPathElements = currentPath.split("/");
    const numberOfUpperDirectoryNavigations = (
      relativePath.match(/\.\./g) || []
    ).length;

    if (
      currentPathElements.length <= 1 ||
      numberOfUpperDirectoryNavigations > currentPathElements.length - 1
    )
      throw new Error(
        `Cannot resolve relative path "${relativePath}" from current path "${currentPath}"`
      );

    for (let i = 0; i < numberOfUpperDirectoryNavigations; i++) {
      currentPathElements.pop();
    }

    output = `${currentPathElements.join("/")}/${relativePath.replace(
      /\.\.\//g,
      ""
    )}`;
  }

  return output;
};

exports.removeLeadingAndTrailingSlash = removeLeadingAndTrailingSlash;
exports.resolveRelativePath = resolveRelativePath;
exports.getTSFilePaths = getTSFilePaths;
exports.getTSPathsMapping = getTSPathsMapping;
