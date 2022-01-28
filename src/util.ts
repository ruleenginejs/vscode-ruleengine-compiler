import * as vscode from 'vscode';

export enum ModuleSystem {
  commonJs = "CommonJS",
  esModule = "ES Module"
}

const moduleSystemItems: Array<vscode.QuickPickItem> = [
  {
    label: ModuleSystem.commonJs,
    detail: "Module system use require() function and module.exports"
  },
  {
    label: ModuleSystem.esModule,
    detail: "Module system use import and export"
  }
];

export async function showModuleSystemQuickPick(): Promise<ModuleSystem | undefined> {
  const result = await vscode.window.showQuickPick(moduleSystemItems, {
    placeHolder: 'Select Module System'
  });
  if (!result) {
    return undefined;
  }
  return result.label as ModuleSystem;
}
