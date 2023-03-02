module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
      },
    ],    
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
        tarballDir: ".",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: ["*.tgz"],
      },
    ],
  ],
};
