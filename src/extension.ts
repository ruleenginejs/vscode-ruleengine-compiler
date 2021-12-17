import * as vscode from 'vscode';
import { CompileRuleToJavaScriptCommand } from './commands';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand(CompileRuleToJavaScriptCommand.id, CompileRuleToJavaScriptCommand.execute));
}
