'use strict';
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, ExtensionContext, languages,  Position, SnippetString, TextDocument, workspace } from 'vscode';
import * as katexFuncs from './util/katex-funcs';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerCompletionItemProvider([{ language: 'markdown', notebookType: 'jupyter-notebook', scheme: 'untitled' },{ language: 'markdown', notebookType: 'jupyter-notebook', scheme: 'file' }], new MdCompletionItemProvider(), '\\'));
}

class MdCompletionItemProvider implements CompletionItemProvider {

    mathCompletions: CompletionItem[];

    constructor() {
        // \cmd
        let c1 = Array.from(new Set(
            [
                ...katexFuncs.delimiters0, ...katexFuncs.delimeterSizing0,
                ...katexFuncs.greekLetters0, ...katexFuncs.otherLetters0,
                ...katexFuncs.spacing0, ...katexFuncs.verticalLayout0,
                ...katexFuncs.logicAndSetTheory0, ...katexFuncs.macros0, ...katexFuncs.bigOperators0,
                ...katexFuncs.binaryOperators0, ...katexFuncs.binomialCoefficients0,
                ...katexFuncs.fractions0, ...katexFuncs.mathOperators0,
                ...katexFuncs.relations0, ...katexFuncs.negatedRelations0,
                ...katexFuncs.arrows0, ...katexFuncs.font0, ...katexFuncs.size0,
                ...katexFuncs.style0, ...katexFuncs.symbolsAndPunctuation0,
                ...katexFuncs.debugging0
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = cmd;
            return item;
        });
        // \cmd{$1}
        let c2 = Array.from(new Set(
            [
                ...katexFuncs.accents1, ...katexFuncs.annotation1,
                ...katexFuncs.verticalLayout1, ...katexFuncs.overlap1, ...katexFuncs.spacing1,
                ...katexFuncs.logicAndSetTheory1, ...katexFuncs.mathOperators1, ...katexFuncs.sqrt1,
                ...katexFuncs.extensibleArrows1, ...katexFuncs.font1,
                ...katexFuncs.braketNotation1, ...katexFuncs.classAssignment1
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}`);
            return item;
        });
        // \cmd{$1}{$2}
        let c3 = Array.from(new Set(
            [
                ...katexFuncs.verticalLayout2, ...katexFuncs.binomialCoefficients2,
                ...katexFuncs.fractions2, ...katexFuncs.color2
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}\{$2\}`);
            return item;
        });
        let envSnippet = new CompletionItem('\\begin', CompletionItemKind.Snippet);
        envSnippet.insertText = new SnippetString('begin{${1|' + katexFuncs.envs.join(',') + '|}}$2\\end{$1}');

        // Pretend to support multi-workspacefolders
        const folder = workspace.workspaceFolders?.[0]?.uri;

        // Import macros from configurations

        this.mathCompletions = [...c1, ...c2, ...c3, envSnippet];

        // Sort
        for (const item of this.mathCompletions) {
            const label = typeof item.label === "string" ? item.label : item.label.label;
            item.sortText = label.replace(/[a-zA-Z]/g, (c) => {
                if (/[a-z]/.test(c)) {
                    return `0${c}`;
                } else {
                    return `1${c.toLowerCase()}`;
                }
            });
        }
    }

    async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[] | CompletionList<CompletionItem> | undefined> {
        const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character);
        let matches;
        matches = lineTextBefore.match(/\\+$/);
        // Math functions
        // ==============
        if (
            // ends with an odd number of backslashes
            (matches = lineTextBefore.match(/\\+$/)) !== null
            && matches[0].length % 2 !== 0
        ) {
            if (mathEnvCheck(document, position) === "") {
                return [];
            } else {
                return this.mathCompletions;
            }
        }
        return;
    }
}

export function mathEnvCheck(doc: TextDocument, pos: Position): "display" | "inline" | "" {
    const docText = doc.getText();
    const crtOffset = doc.offsetAt(pos);
    const crtLine = doc.lineAt(pos.line);

    const lineTextBefore = crtLine.text.substring(0, pos.character);

    if (searchStrEach(lineTextBefore,'$') % 2) {
        return "inline";
    } else {
        const brforeMark = searchStrEach(docText.substring(0, crtOffset), "$$");
        const afterMark = docText.substring(crtOffset).indexOf('$$');
        if (brforeMark % 2 && afterMark !== -1) {
            // $$ ... $$
            return "display";
        } else {
            return "";
        }
    }
}

function searchStrEach(str: string, target: string) {
    const targetLen = target.length;
    let sum: number = 0;
    for (let i = 0; i < str.length; i++) {
        if (str.substring(i, i + targetLen) === target) {
            i = i + targetLen - 1;
            sum++;
        }
    }
   return sum;
 }


