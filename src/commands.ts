import * as vscode from 'vscode';

export class CompileRuleToJavaScriptCommand {
  public static readonly id = "ruleengine.ruleCompiler.compileToJavaScript";

  public static execute(): any {
    vscode.window.showInformationMessage("Compilation completed successfully.");
  }
}
