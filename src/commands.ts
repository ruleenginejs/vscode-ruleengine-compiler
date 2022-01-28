import * as vscode from 'vscode';
import * as path from "path";
import { isDefined } from './types';
import * as schema from "@ruleenginejs/schema";
import { generateCode } from "@ruleenginejs/compiler";

export class CompileRuleFileCommand {
  public static readonly id = "ruleengine.ruleCompiler.compile";

  public static async execute(uri: vscode.Uri, uris: vscode.Uri[]): Promise<any> {
    if (!isDefined(uri) && !isDefined(uris)) {
      vscode.window.showInformationMessage("Compilation from the command palette is not supported. Use the explorer/tab context menu.");
      return;
    }

    const sourceUris: vscode.Uri[] = [];
    if (Array.isArray(uris)) {
      sourceUris.push(...uris);
    } else if (isDefined(uri)) {
      sourceUris.push(uri);
    }

    if (sourceUris.length > 0) {
      try {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Compiling",
          cancellable: true
        }, async (progress, token) => {
          progress.report({ message: "searching files…" });
          const urisAndFileTypes: [vscode.Uri, vscode.FileType?][] = sourceUris.map(uri => [uri, undefined]);
          const urisToCompile = await findRuleFiles(urisAndFileTypes, token);
          if (urisToCompile.length === 0 || token.isCancellationRequested) {
            return;
          }

          const step = 100 / urisToCompile.length;
          for (let i = 0; i < urisToCompile.length; i++) {
            const fileUri = urisToCompile[i];
            const fileName = path.basename(fileUri.fsPath);
            const dirname = path.basename(path.dirname(fileUri.fsPath));
            const message = `${dirname}${path.sep}${fileName}`;
            progress.report({ message });

            try {
              await compileAndSave(fileUri);
            } catch (e) {
              throw new CompilationError(fileUri, e as any);
            }

            if (token.isCancellationRequested) {
              break;
            }
            progress.report({ increment: step, message });
          }
        });
      } catch (e) {
        if (e instanceof CompilationError) {
          showCompilationError(e);
        } else {
          showError(e as any);
        }
      }
    } else {
      vscode.window.showInformationMessage("Nothing to compile.");
    }
  }
}

function showError(err: Error | string) {
  vscode.window.showErrorMessage(`Compilation error: ${err instanceof Error ? err.message : err}`);
}

function showCompilationError(err: CompilationError) {
  let details = [];
  if (!err.cause) {
    details.push("An unknown error occurred");
  } else if (err.cause instanceof SchemaValidationError) {
    if (Array.isArray(err.cause.validationErrors)) {
      let schemaDetails = "Invalid file schema - ";
      schemaDetails += err.cause.validationErrors.map(({ keyword, message, params }) => {
        return `#message(${message}) #keyword(${keyword}) #params(${JSON.stringify(params)})`;
      }).join(", ");
      details.push(schemaDetails);
    } else {
      details.push(err.cause.message);
    }
  } else {
    details.push(err.cause instanceof Error ? err.cause.message : err.cause);
  }
  details.push(err.uri.fsPath);
  vscode.window.showErrorMessage(`Compilation error: ${details.join(", ")}`);
}

async function findRuleFiles(urisAndFileTypes: [vscode.Uri, vscode.FileType?][], token: vscode.CancellationToken): Promise<vscode.Uri[]> {
  const result: vscode.Uri[] = [];
  for (let i = 0; i < urisAndFileTypes.length; i++) {
    let [uri, fileType] = urisAndFileTypes[i];

    if (!isDefined(fileType)) {
      const fileStat = await vscode.workspace.fs.stat(uri);
      if (token.isCancellationRequested) {
        return [];
      }
      fileType = fileStat.type;
    }

    if (fileType === vscode.FileType.Directory) {
      const files = await vscode.workspace.fs.readDirectory(uri);
      if (token.isCancellationRequested) {
        return [];
      }

      result.push(...await findRuleFiles(
        files.map(file => [vscode.Uri.joinPath(uri, file[0]), file[1]]),
        token
      ));

      if (token.isCancellationRequested) {
        return [];
      }
    } else if (fileType !== vscode.FileType.Unknown) {
      if (checkExtension(uri, ".rule")) {
        result.push(uri);
      }
    }
  }
  return result;
}

function checkExtension(uri: vscode.Uri, extension: string): boolean {
  return uri.fsPath ? path.extname(uri.fsPath) === extension : false;
}

let _schemaValidator: any = null;

function validateSchema(data: string) {
  if (!_schemaValidator) {
    _schemaValidator = (schema as any)(schema.SCHEMAS.PIPELINE);
  }
  const success = _schemaValidator(data);
  return [success, _schemaValidator.errors];
}

async function compileAndSave(sourceUri: vscode.Uri): Promise<void> {
  const binaryData = await vscode.workspace.fs.readFile(sourceUri);
  let fileContent = JSON.parse(Buffer.from(binaryData).toString("utf8"));

  if (vscode.workspace.getConfiguration("ruleengine.compiler").get("schemaCheck", false)) {
    const [success, errors] = validateSchema(fileContent);
    if (!success) {
      throw new SchemaValidationError(sourceUri, errors);
    }
  }

  const code = generateCode(fileContent, {
    runtimeModule: vscode.workspace.getConfiguration("ruleengine.compiler").get("runtimeModule", ""),
  });

  const pathInfo = path.parse(sourceUri.fsPath);
  const newFileUri = vscode.Uri.file(path.join(pathInfo.dir, `${pathInfo.name}.js`));
  const saveData = Buffer.from(code, "utf8");

  await vscode.workspace.fs.writeFile(newFileUri, saveData);
}

class SchemaValidationError extends Error {
  constructor(readonly uri: vscode.Uri, readonly validationErrors: any) {
    super("Invalid file schema");
  }
}

class CompilationError extends Error {
  constructor(readonly uri: vscode.Uri, readonly cause: Error) {
    super("Compilation error");
  }
}
