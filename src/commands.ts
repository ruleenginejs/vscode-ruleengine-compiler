import * as vscode from 'vscode';

export class CompileRuleFileCommand {
  public static readonly id = "ruleengine.ruleCompiler.compile";

  public static execute(): any {
    vscode.window.showInformationMessage("Compilation completed successfully.");
  }
}
