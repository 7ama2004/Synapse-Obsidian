import { Plugin, TFile, Notice } from 'obsidian';

export interface CanvasNode {
	id: string;
	type: 'text' | 'file' | 'link';
	text?: string;
	file?: string;
	url?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	livingCanvas?: {
		blockType: string;
		status: 'idle' | 'processing' | 'complete' | 'error';
		config: Record<string, any>;
		error?: string;
	};
}

export interface CanvasEdge {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide?: 'top' | 'right' | 'bottom' | 'left';
	toSide?: 'top' | 'right' | 'bottom' | 'left';
	color?: string;
	label?: string;
}

export interface CanvasData {
	nodes: CanvasNode[];
	edges: CanvasEdge[];
}

export class CanvasManager {
	private plugin: Plugin;
	private currentCanvasFile: TFile | null = null;
	private canvasData: CanvasData | null = null;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	async initialize(): Promise<void> {
		// Listen for canvas file changes
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('active-leaf-change', () => {
				this.updateCurrentCanvas();
			})
		);
		
		// Initial update
		await this.updateCurrentCanvas();
	}

	private async updateCurrentCanvas(): Promise<void> {
		const activeLeaf = this.plugin.app.workspace.activeLeaf;
		if (!activeLeaf) return;

		const view = activeLeaf.view;
		if (view.getViewType() === 'canvas') {
			// Get the canvas file
			const file = (view as any).file;
			if (file && file.extension === 'canvas') {
				this.currentCanvasFile = file;
				await this.loadCanvasData();
			}
		}
	}

	private async loadCanvasData(): Promise<void> {
		if (!this.currentCanvasFile) return;

		try {
			const content = await this.plugin.app.vault.read(this.currentCanvasFile);
			this.canvasData = JSON.parse(content);
		} catch (error) {
			console.error('Living Canvas: Error loading canvas data:', error);
			this.canvasData = null;
		}
	}

	// Read-only operations
	getNode(nodeId: string): CanvasNode | undefined {
		if (!this.canvasData) return undefined;
		return this.canvasData.nodes.find(node => node.id === nodeId);
	}

	getSourceNodes(nodeId: string): CanvasNode[] {
		if (!this.canvasData) return [];
		
		// Find all edges that point to this node
		const incomingEdges = this.canvasData.edges.filter(edge => edge.toNode === nodeId);
		
		// Get the source nodes
		const sourceNodeIds = incomingEdges.map(edge => edge.fromNode);
		return this.canvasData.nodes.filter(node => sourceNodeIds.includes(node.id));
	}

	getTargetNodes(nodeId: string): CanvasNode[] {
		if (!this.canvasData) return [];
		
		// Find all edges that start from this node
		const outgoingEdges = this.canvasData.edges.filter(edge => edge.fromNode === nodeId);
		
		// Get the target nodes
		const targetNodeIds = outgoingEdges.map(edge => edge.toNode);
		return this.canvasData.nodes.filter(node => targetNodeIds.includes(node.id));
	}

	getLivingCanvasNodes(): CanvasNode[] {
		if (!this.canvasData) return [];
		return this.canvasData.nodes.filter(node => node.livingCanvas);
	}

	getConnectedText(nodeId: string): string {
		const sourceNodes = this.getSourceNodes(nodeId);
		return sourceNodes
			.filter(node => node.type === 'text' && node.text)
			.map(node => node.text!)
			.join('\n\n');
	}

	// Write operations (will be implemented later)
	async updateNodeData(nodeId: string, data: Partial<CanvasNode>): Promise<void> {
		if (!this.canvasData || !this.currentCanvasFile) {
			throw new Error('No active canvas file');
		}

		const nodeIndex = this.canvasData.nodes.findIndex(node => node.id === nodeId);
		if (nodeIndex === -1) {
			throw new Error(`Node ${nodeId} not found`);
		}

		// Update the node
		this.canvasData.nodes[nodeIndex] = { ...this.canvasData.nodes[nodeIndex], ...data };

		// Save to file
		await this.saveCanvasData();
	}

	async createNode(nodeData: Omit<CanvasNode, 'id'>): Promise<string> {
		if (!this.canvasData || !this.currentCanvasFile) {
			throw new Error('No active canvas file');
		}

		// Generate unique ID
		const nodeId = this.generateNodeId();
		
		const newNode: CanvasNode = {
			...nodeData,
			id: nodeId
		};

		this.canvasData.nodes.push(newNode);
		await this.saveCanvasData();
		
		return nodeId;
	}

	async createEdge(edgeData: Omit<CanvasEdge, 'id'>): Promise<string> {
		if (!this.canvasData || !this.currentCanvasFile) {
			throw new Error('No active canvas file');
		}

		// Generate unique ID
		const edgeId = this.generateEdgeId();
		
		const newEdge: CanvasEdge = {
			...edgeData,
			id: edgeId
		};

		this.canvasData.edges.push(newEdge);
		await this.saveCanvasData();
		
		return edgeId;
	}

	async deleteNode(nodeId: string): Promise<void> {
		if (!this.canvasData || !this.currentCanvasFile) {
			throw new Error('No active canvas file');
		}

		// Remove the node
		this.canvasData.nodes = this.canvasData.nodes.filter(node => node.id !== nodeId);
		
		// Remove all edges connected to this node
		this.canvasData.edges = this.canvasData.edges.filter(
			edge => edge.fromNode !== nodeId && edge.toNode !== nodeId
		);

		await this.saveCanvasData();
	}

	async deleteEdge(edgeId: string): Promise<void> {
		if (!this.canvasData || !this.currentCanvasFile) {
			throw new Error('No active canvas file');
		}

		this.canvasData.edges = this.canvasData.edges.filter(edge => edge.id !== edgeId);
		await this.saveCanvasData();
	}

	private async saveCanvasData(): Promise<void> {
		if (!this.canvasData || !this.currentCanvasFile) return;

		try {
			const content = JSON.stringify(this.canvasData, null, 2);
			await this.plugin.app.vault.modify(this.currentCanvasFile, content);
		} catch (error) {
			console.error('Living Canvas: Error saving canvas data:', error);
			new Notice('Failed to save canvas changes');
		}
	}

	private generateNodeId(): string {
		if (!this.canvasData) return 'node_' + Date.now();
		
		let counter = 1;
		let nodeId = `node_${counter}`;
		
		while (this.canvasData.nodes.some(node => node.id === nodeId)) {
			counter++;
			nodeId = `node_${counter}`;
		}
		
		return nodeId;
	}

	private generateEdgeId(): string {
		if (!this.canvasData) return 'edge_' + Date.now();
		
		let counter = 1;
		let edgeId = `edge_${counter}`;
		
		while (this.canvasData.edges.some(edge => edge.id === edgeId)) {
			counter++;
			edgeId = `edge_${counter}`;
		}
		
		return edgeId;
	}

	// Utility methods
	getCurrentCanvasFile(): TFile | null {
		return this.currentCanvasFile;
	}

	isCanvasActive(): boolean {
		return this.currentCanvasFile !== null;
	}

	// Smart positioning for new nodes
	getSmartPosition(referenceNodeId?: string): { x: number; y: number } {
		if (!this.canvasData) return { x: 100, y: 100 };

		if (referenceNodeId) {
			const referenceNode = this.getNode(referenceNodeId);
			if (referenceNode) {
				// Place new node to the right of the reference node
				return {
					x: referenceNode.x + referenceNode.width + 50,
					y: referenceNode.y
				};
			}
		}

		// Find a good position based on existing nodes
		if (this.canvasData.nodes.length === 0) {
			return { x: 100, y: 100 };
		}

		// Find the rightmost node and place new node to its right
		const rightmostNode = this.canvasData.nodes.reduce((rightmost, node) => 
			node.x > rightmost.x ? node : rightmost
		);

		return {
			x: rightmostNode.x + rightmostNode.width + 50,
			y: rightmostNode.y
		};
	}
}