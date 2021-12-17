import * as vscode from 'vscode';
import { CompileRuleFileCommand } from './commands';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand(CompileRuleFileCommand.id, CompileRuleFileCommand.execute));
}
