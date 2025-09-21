import { Plugin, Notice, Modal, TextComponent } from 'obsidian';
import { BlockDefinition } from './BlockManager';
import { CanvasNode } from './CanvasManager';

interface LivingCanvasPlugin extends Plugin {
	blockManager: any;
	canvasManager: any;
	uiManager: any;
	actionHandler: any;
	blockExecutor: any;
	settings: any;
}

export class ActionHandler {
	private plugin: LivingCanvasPlugin;

	constructor(plugin: LivingCanvasPlugin) {
		this.plugin = plugin;
	}

	async initialize(): Promise<void> {
		// ActionHandler is initialized and ready
		console.log('Living Canvas: ActionHandler initialized');
	}

	async handleRunBlock(nodeId: string): Promise<void> {
		try {
			// Get the node
			const node = this.plugin.canvasManager.getNode(nodeId);
			if (!node || !node.livingCanvas) {
				throw new Error('Node not found or not a Living Canvas block');
			}

			// Update status to processing
			await this.plugin.canvasManager.updateNodeData(nodeId, {
				livingCanvas: {
					...node.livingCanvas,
					status: 'processing'
				}
			});

			// Get the block definition
			const blockDefinition = this.plugin.blockManager.getBlockDefinition(node.livingCanvas.blockType);
			if (!blockDefinition) {
				throw new Error(`Block definition not found: ${node.livingCanvas.blockType}`);
			}

			// Get input text from connected nodes
			const inputText = this.plugin.canvasManager.getConnectedText(nodeId);
			if (!inputText.trim()) {
				throw new Error('No input text found. Connect text nodes to this block.');
			}

			// Execute the block
			const result = await this.plugin.blockExecutor.executeBlock(
				blockDefinition,
				inputText,
				node.livingCanvas.config
			);

			// Create output node
			const outputNodeId = await this.createOutputNode(result, nodeId);

			// Create edge from block to output
			await this.plugin.canvasManager.createEdge({
				fromNode: nodeId,
				toNode: outputNodeId,
				fromSide: 'right',
				toSide: 'left',
				color: '#4CAF50',
				label: 'output'
			});

			// Update block status to complete
			await this.plugin.canvasManager.updateNodeData(nodeId, {
				livingCanvas: {
					...node.livingCanvas,
					status: 'complete'
				}
			});

			new Notice(`Block executed successfully!`);

		} catch (error) {
			console.error('Living Canvas: Error running block:', error);
			
			// Update block status to error
			const node = this.plugin.canvasManager.getNode(nodeId);
			if (node && node.livingCanvas) {
				await this.plugin.canvasManager.updateNodeData(nodeId, {
					livingCanvas: {
						...node.livingCanvas,
						status: 'error',
						error: error.message
					}
				});
			}

			new Notice(`Block execution failed: ${error.message}`);
		}
	}

	async handleClarifyText(selectedText: string, question: string, view: any): Promise<void> {
		try {
			// Create a clarification block
			const clarificationConfig = {
				systemPrompt: 'You are a helpful assistant that provides clear, accurate explanations and clarifications.',
				tone: 'helpful and educational',
				outputFormat: 'paragraph'
			};

			// Create a temporary clarification block
			const clarificationBlockId = await this.plugin.canvasManager.createNode({
				type: 'text',
				text: '🤔 AI Clarification',
				x: 100,
				y: 100,
				width: 200,
				height: 50,
				livingCanvas: {
					blockType: 'core/clarifier',
					status: 'processing',
					config: clarificationConfig
				}
			});

			// Create input node with the selected text and question
			const inputNodeId = await this.plugin.canvasManager.createNode({
				type: 'text',
				text: `Question: ${question}\n\nText: ${selectedText}`,
				x: 50,
				y: 50,
				width: 300,
				height: 100
			});

			// Create edge from input to clarification block
			await this.plugin.canvasManager.createEdge({
				fromNode: inputNodeId,
				toNode: clarificationBlockId,
				fromSide: 'right',
				toSide: 'left'
			});

			// Execute the clarification
			const result = await this.plugin.blockExecutor.executeBlock(
				{
					id: 'core/clarifier',
					name: 'AI Clarifier',
					description: 'Provides clarifications and explanations',
					author: 'Living Canvas',
					version: '1.0.0',
					settings: [],
					executorPath: ''
				},
				`Question: ${question}\n\nText to clarify: ${selectedText}`,
				clarificationConfig
			);

			// Create output node
			const outputNodeId = await this.createOutputNode(result, clarificationBlockId);

			// Create edge from clarification block to output
			await this.plugin.canvasManager.createEdge({
				fromNode: clarificationBlockId,
				toNode: outputNodeId,
				fromSide: 'right',
				toSide: 'left',
				color: '#2196F3',
				label: 'clarification'
			});

			// Update clarification block status
			await this.plugin.canvasManager.updateNodeData(clarificationBlockId, {
				livingCanvas: {
					blockType: 'core/clarifier',
					status: 'complete',
					config: clarificationConfig
				}
			});

		} catch (error) {
			console.error('Living Canvas: Error handling clarify text:', error);
			new Notice(`Clarification failed: ${error.message}`);
		}
	}

	private async createOutputNode(result: string, sourceNodeId: string): Promise<string> {
		// Get smart position for output node
		const position = this.plugin.canvasManager.getSmartPosition(sourceNodeId);
		
		// Create output node
		const outputNodeId = await this.plugin.canvasManager.createNode({
			type: 'text',
			text: result,
			x: position.x,
			y: position.y,
			width: 300,
			height: Math.max(100, result.split('\n').length * 20 + 40) // Dynamic height based on content
		});

		return outputNodeId;
	}

	cleanup(): void {
		// Cleanup any resources
	}
}