module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*simple-worker.test.js"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
