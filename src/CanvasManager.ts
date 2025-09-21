import { TFile } from 'obsidian';
import { LivingCanvasPlugin } from '../main';

export interface CanvasNode {
	id: string;
	type: string;
	text?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	livingCanvas?: {
		blockType: string;
		status: 'idle' | 'processing' | 'complete' | 'error';
		config: any;
		error?: string;
	};
}

export interface CanvasEdge {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide?: string;
	toSide?: string;
}

export interface CanvasData {
	nodes: { [key: string]: CanvasNode };
	edges: { [key: string]: CanvasEdge };
}

export class CanvasManager {
	private plugin: LivingCanvasPlugin;
	private currentCanvasFile: TFile | null = null;

	constructor(plugin: LivingCanvasPlugin) {
		this.plugin = plugin;
	}

	async initialize(): Promise<void> {
		this.plugin.debug('Initializing CanvasManager');
	}

	// Set the current canvas file
	setCurrentCanvas(canvasFile: TFile): void {
		this.currentCanvasFile = canvasFile;
		this.plugin.debug(`Set current canvas: ${canvasFile.path}`);
	}

	// Get the current canvas file
	getCurrentCanvas(): TFile | null {
		return this.currentCanvasFile;
	}

	// Read canvas data from file
	async readCanvasData(canvasFile?: TFile): Promise<CanvasData | null> {
		const file = canvasFile || this.currentCanvasFile;
		if (!file) {
			this.plugin.debug('No canvas file specified');
			return null;
		}

		try {
			const content = await this.plugin.app.vault.read(file);
			const data = JSON.parse(content);
			
			// Ensure the data has the expected structure
			if (!data.nodes || !data.edges) {
				this.plugin.debug('Invalid canvas data structure');
				return null;
			}

			return data as CanvasData;
		} catch (error) {
			console.error('Error reading canvas data:', error);
			return null;
		}
	}

	// Write canvas data to file
	async writeCanvasData(data: CanvasData, canvasFile?: TFile): Promise<boolean> {
		const file = canvasFile || this.currentCanvasFile;
		if (!file) {
			this.plugin.debug('No canvas file specified for writing');
			return false;
		}

		try {
			await this.plugin.app.vault.modify(file, JSON.stringify(data, null, 2));
			this.plugin.debug('Canvas data written successfully');
			return true;
		} catch (error) {
			console.error('Error writing canvas data:', error);
			return false;
		}
	}

	// Get a specific node by ID
	async getNode(nodeId: string, canvasFile?: TFile): Promise<CanvasNode | null> {
		const data = await this.readCanvasData(canvasFile);
		if (!data) return null;

		return data.nodes[nodeId] || null;
	}

	// Get all nodes that have edges connecting TO the given node
	async getSourceNodes(nodeId: string, canvasFile?: TFile): Promise<CanvasNode[]> {
		const data = await this.readCanvasData(canvasFile);
		if (!data) return [];

		const sourceNodeIds = new Set<string>();
		
		// Find all edges that point to this node
		for (const edge of Object.values(data.edges)) {
			if (edge.toNode === nodeId) {
				sourceNodeIds.add(edge.fromNode);
			}
		}

		// Get the actual nodes
		const sourceNodes: CanvasNode[] = [];
		for (const sourceId of sourceNodeIds) {
			const node = data.nodes[sourceId];
			if (node) {
				sourceNodes.push(node);
			}
		}

		return sourceNodes;
	}

	// Update node data
	async updateNodeData(nodeId: string, updates: Partial<CanvasNode>, canvasFile?: TFile): Promise<boolean> {
		const data = await this.readCanvasData(canvasFile);
		if (!data) return false;

		const node = data.nodes[nodeId];
		if (!node) {
			this.plugin.debug(`Node ${nodeId} not found`);
			return false;
		}

		// Update the node
		Object.assign(node, updates);
		data.nodes[nodeId] = node;

		return await this.writeCanvasData(data, canvasFile);
	}

	// Create a new node
	async createNode(nodeData: Omit<CanvasNode, 'id'>, canvasFile?: TFile): Promise<string | null> {
		const data = await this.readCanvasData(canvasFile);
		if (!data) return null;

		// Generate a unique ID
		const nodeId = this.generateNodeId();
		
		// Create the node
		const newNode: CanvasNode = {
			id: nodeId,
			...nodeData
		};

		data.nodes[nodeId] = newNode;

		const success = await this.writeCanvasData(data, canvasFile);
		return success ? nodeId : null;
	}

	// Create an edge between two nodes
	async createEdge(fromNodeId: string, toNodeId: string, canvasFile?: TFile): Promise<string | null> {
		const data = await this.readCanvasData(canvasFile);
		if (!data) return null;

		// Check if both nodes exist
		if (!data.nodes[fromNodeId] || !data.nodes[toNodeId]) {
			this.plugin.debug('One or both nodes do not exist');
			return null;
		}

		// Generate a unique edge ID
		const edgeId = this.generateEdgeId();
		
		// Create the edge
		const newEdge: CanvasEdge = {
			id: edgeId,
			fromNode: fromNodeId,
			toNode: toNodeId
		};

		data.edges[edgeId] = newEdge;

		const success = await this.writeCanvasData(data, canvasFile);
		return success ? edgeId : null;
	}

	// Get all living canvas nodes
	async getLivingCanvasNodes(canvasFile?: TFile): Promise<CanvasNode[]> {
		const data = await this.readCanvasData(canvasFile);
		if (!data) return [];

		return Object.values(data.nodes).filter(node => node.livingCanvas);
	}

	// Get nodes by block type
	async getNodesByBlockType(blockType: string, canvasFile?: TFile): Promise<CanvasNode[]> {
		const livingNodes = await this.getLivingCanvasNodes(canvasFile);
		return livingNodes.filter(node => node.livingCanvas?.blockType === blockType);
	}

	// Utility methods
	private generateNodeId(): string {
		return 'node_' + Math.random().toString(36).substr(2, 9);
	}

	private generateEdgeId(): string {
		return 'edge_' + Math.random().toString(36).substr(2, 9);
	}

	// Calculate position for new node near parent
	calculateNewNodePosition(parentNode: CanvasNode, offset: number = 300): { x: number; y: number } {
		return {
			x: parentNode.x + parentNode.width + offset,
			y: parentNode.y
		};
	}

	// Get concatenated text from source nodes
	async getSourceText(nodeId: string, canvasFile?: TFile): Promise<string> {
		const sourceNodes = await this.getSourceNodes(nodeId, canvasFile);
		return sourceNodes
			.map(node => node.text || '')
			.filter(text => text.trim().length > 0)
			.join('\n\n');
	}
}