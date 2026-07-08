import * as vscode from 'vscode';
import { MindMapEditorProvider } from './MindMapEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(MindMapEditorProvider.register(context));
}

export function deactivate() { }
