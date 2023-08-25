import { Command, Option } from 'clipanion';

export class BundlessCommand extends Command {
  static paths = [[`bundless`]];
  async execute() {
    this.context.stdout.write(`Hello !\n`);
    console.log('%c Line:7 🍻 this.context', 'color:#465975', this.context);
  }
}
