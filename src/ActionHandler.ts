import { Notice } from 'obsidian';
import { LivingCanvasPlugin } from '../main';
import { CanvasNode } from './CanvasManager';
import { ExecutionResult } from './BlockExecutor';

export class ActionHandler {
	private plugin: LivingCanvasPlugin;

	constructor(plugin: LivingCanvasPlugin) {
		this.plugin = plugin;
	}

	async initialize(): Promise<void> {
		this.plugin.debug('Initializing ActionHandler');
	}

	cleanup(): void {
		this.plugin.debug('Cleaning up ActionHandler');
	}

	// Handle running a block
	async handleRunBlock(nodeId: string): Promise<void> {
		this.plugin.debug(`Handling run block for node: ${nodeId}`);

		try {
			// Get the current canvas file
			const canvasFile = this.plugin.getCurrentCanvasFile();
			if (!canvasFile) {
				new Notice('No canvas file is currently open');
				return;
			}

			// Set the canvas file in the canvas manager
			this.plugin.canvasManager.setCurrentCanvas(canvasFile);

			// Get the node
			const node = await this.plugin.canvasManager.getNode(nodeId, canvasFile);
			if (!node || !node.livingCanvas) {
				new Notice('Selected node is not a Living Canvas block');
				return;
			}

			// Update status to processing
			await this.plugin.canvasManager.updateNodeData(nodeId, {
				livingCanvas: {
					...node.livingCanvas,
					status: 'processing'
				}
			}, canvasFile);

			// Get source text
			const inputText = await this.plugin.canvasManager.getSourceText(nodeId, canvasFile);
			if (!inputText.trim()) {
				await this.plugin.canvasManager.updateNodeData(nodeId, {
					livingCanvas: {
						...node.livingCanvas,
						status: 'error',
						error: 'No input text found. Connect text nodes to this block.'
					}
				}, canvasFile);
				new Notice('No input text found. Connect text nodes to this block.');
				return;
			}

			// Execute the block
			const result = await this.plugin.blockExecutor.executeBlock(
				node.livingCanvas.blockType,
				inputText,
				node.livingCanvas.config
			);

			if (result.success && result.output) {
				// Create output node
				const outputNodeId = await this.createOutputNode(result.output, node, canvasFile);
				
				if (outputNodeId) {
					// Create edge from block to output
					await this.plugin.canvasManager.createEdge(nodeId, outputNodeId, canvasFile);
				}

				// Update block status to complete
				await this.plugin.canvasManager.updateNodeData(nodeId, {
					livingCanvas: {
						...node.livingCanvas,
						status: 'complete',
						error: undefined
					}
				}, canvasFile);

				new Notice('Block executed successfully');
			} else {
				// Update block status to error
				await this.plugin.canvasManager.updateNodeData(nodeId, {
					livingCanvas: {
						...node.livingCanvas,
						status: 'error',
						error: result.error || 'Unknown error occurred'
					}
				}, canvasFile);

				new Notice(`Block execution failed: ${result.error}`);
			}

		} catch (error) {
			this.plugin.debug('Error in handleRunBlock:', error);
			new Notice(`Error executing block: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// Handle clarifying selected text
	async handleClarifyText(selectedText: string, sourceNodeId?: string): Promise<void> {
		this.plugin.debug('Handling clarify text request');

		try {
			// Show modal to get user's question
			const question = await this.showQuestionModal();
			if (!question) {
				return; // User cancelled
			}

			// Execute clarification
			const result = await this.plugin.blockExecutor.executeClarification(selectedText, question);

			if (result.success && result.output) {
				// Get current canvas file
				const canvasFile = this.plugin.getCurrentCanvasFile();
				if (!canvasFile) {
					new Notice('No canvas file is currently open');
					return;
				}

				this.plugin.canvasManager.setCurrentCanvas(canvasFile);

				// Create answer node
				const answerNodeId = await this.createAnswerNode(result.output, canvasFile);
				
				if (answerNodeId && sourceNodeId) {
					// Create edge from source to answer
					await this.plugin.canvasManager.createEdge(sourceNodeId, answerNodeId, canvasFile);
				}

				new Notice('Clarification completed');
			} else {
				new Notice(`Clarification failed: ${result.error}`);
			}

		} catch (error) {
			this.plugin.debug('Error in handleClarifyText:', error);
			new Notice(`Error processing clarification: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// Create an output node for block results
	private async createOutputNode(output: string, parentNode: CanvasNode, canvasFile: any): Promise<string | null> {
		const position = this.plugin.canvasManager.calculateNewNodePosition(parentNode);
		
		const outputNode = {
			type: 'text',
			text: output,
			x: position.x,
			y: position.y,
			width: 300,
			height: 200
		};

		return await this.plugin.canvasManager.createNode(outputNode, canvasFile);
	}

	// Create an answer node for clarifications
	private async createAnswerNode(answer: string, canvasFile: any): Promise<string | null> {
		const answerNode = {
			type: 'text',
			text: `💡 AI Clarification\n\n${answer}`,
			x: 100,
			y: 100,
			width: 350,
			height: 250
		};

		return await this.plugin.canvasManager.createNode(answerNode, canvasFile);
	}

	// Show modal to get user's question
	private async showQuestionModal(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new QuestionModal(this.plugin.app, (question) => {
				resolve(question);
			});
			modal.open();
		});
	}
}

// Simple modal for getting user's question
class QuestionModal {
	private app: any;
	private onResolve: (question: string | null) => void;
	private modalEl: HTMLElement;
	private inputEl: HTMLInputElement;

	constructor(app: any, onResolve: (question: string | null) => void) {
		this.app = app;
		this.onResolve = onResolve;
	}

	open(): void {
		const { app } = this;
		const modal = new (app as any).plugins.plugins['obsidian-modal']?.Modal(app) || this.createSimpleModal();
		
		if (modal.open) {
			modal.open();
		} else {
			this.createSimpleModal();
		}
	}

	private createSimpleModal(): void {
		// Create a simple modal using DOM manipulation
		this.modalEl = document.createElement('div');
		this.modalEl.className = 'modal';
		this.modalEl.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 1000;
		`;

		const content = document.createElement('div');
		content.style.cssText = `
			background: var(--background-primary);
			padding: 20px;
			border-radius: 8px;
			min-width: 400px;
			max-width: 600px;
		`;

		const title = document.createElement('h3');
		title.textContent = 'Ask AI to Clarify';
		title.style.marginTop = '0';

		const label = document.createElement('label');
		label.textContent = 'What is your question?';
		label.style.display = 'block';
		label.style.marginBottom = '8px';

		this.inputEl = document.createElement('input');
		this.inputEl.type = 'text';
		this.inputEl.placeholder = 'Enter your question here...';
		this.inputEl.style.cssText = `
			width: 100%;
			padding: 8px;
			margin-bottom: 16px;
			border: 1px solid var(--background-modifier-border);
			border-radius: 4px;
			background: var(--background-primary);
			color: var(--text-normal);
		`;

		const buttonContainer = document.createElement('div');
		buttonContainer.style.cssText = `
			display: flex;
			gap: 8px;
			justify-content: flex-end;
		`;

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.onclick = () => {
			this.close();
			this.onResolve(null);
		};

		const submitBtn = document.createElement('button');
		submitBtn.textContent = 'Ask';
		submitBtn.onclick = () => {
			const question = this.inputEl.value.trim();
			this.close();
			this.onResolve(question || null);
		};

		buttonContainer.appendChild(cancelBtn);
		buttonContainer.appendChild(submitBtn);

		content.appendChild(title);
		content.appendChild(label);
		content.appendChild(this.inputEl);
		content.appendChild(buttonContainer);

		this.modalEl.appendChild(content);
		document.body.appendChild(this.modalEl);

		// Focus the input
		setTimeout(() => this.inputEl.focus(), 100);

		// Handle Enter key
		this.inputEl.onkeydown = (e) => {
			if (e.key === 'Enter') {
				submitBtn.click();
			} else if (e.key === 'Escape') {
				cancelBtn.click();
			}
		};

		// Handle clicking outside modal
		this.modalEl.onclick = (e) => {
			if (e.target === this.modalEl) {
				cancelBtn.click();
			}
		};
	}

	private close(): void {
		if (this.modalEl && this.modalEl.parentNode) {
			this.modalEl.parentNode.removeChild(this.modalEl);
		}
	}
}