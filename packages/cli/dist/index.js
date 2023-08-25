"use strict";

// src/cli.ts
var import_clipanion2 = require("clipanion");

// src/commands/bundless.ts
var import_clipanion = require("clipanion");
var BundlessCommand = class extends import_clipanion.Command {
  static paths = [[`bundless`]];
  async execute() {
    this.context.stdout.write(`Hello !
`);
    console.log("%c Line:7 \u{1F37B} this.context", "color:#465975", this.context);
  }
};

// src/cli.ts
var [node, app, ...args] = process.argv;
var cli = new import_clipanion2.Cli({
  binaryLabel: `Viwo`,
  binaryName: `${node} ${app}`,
  binaryVersion: `1.0.0`
});
cli.register(BundlessCommand);
cli.runExit(args);
