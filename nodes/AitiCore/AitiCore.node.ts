import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export class AitiCore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AITI Core',
		name: 'aitiCore',
		icon: 'file:aiti.svg',
		group: ['transform'],
		version: 1,
		description: 'Interact with AITI AI Backend',
		defaults: {
			name: 'AITI AI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aitiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat',
						description: 'Chat with the AI model',
						action: 'Chat with the AI model',
					},
					{
						name: 'Clear History',
						value: 'clearHistory',
						description: 'Clear the chat history/session',
						action: 'Clear the chat history',
					},
				],
				default: 'chat',
			},
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				displayOptions: {
					show: {
						operation: ['chat'],
					},
				},
				default: '',
				required: true,
				description: 'The model to use for chatting',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['chat'],
					},
				},
				default: '',
				required: true,
				description: 'The prompt to send to the model',
			},
			{
				displayName: 'System Prompt',
				name: 'systemPrompt',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['chat'],
					},
				},
				default: '',
				description: 'System prompt to override default',
			},
			{
				displayName: 'Additional Parameters',
				name: 'additionalParameters',
				type: 'collection',
				placeholder: 'Add Parameter',
				default: {},
				displayOptions: {
					show: {
						operation: ['chat'],
					},
				},
				options: [
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 2,
						},
						default: 0.7,
						description: 'Temperature for sampling',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
						},
						default: 0.95,
						description: 'Top P for sampling',
					},
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 1024,
						description: 'Max tokens to generate',
					},
					{
						displayName: 'Training ID(s) for RAG',
						name: 'trainingId',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getTrainingIds',
						},
						default: [],
						description: 'Select training data for RAG (Retrieval Augmented Generation)',
					},
					{
						displayName: 'Embedding Model',
						name: 'embeddingModel',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getEmbeddingModels',
						},
						default: '',
						description: 'Embedding model to use for RAG. Required if Training IDs are selected.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getTrainingIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('aitiApi');
				const baseUrl = credentials.baseUrl as string;
				const apiKey = credentials.apiKey as string;

				const response = await this.helpers.request({
					method: 'GET',
					url: `${baseUrl}/api/training`,
					headers: {
						'X-API-KEY': apiKey,
						'Authorization': `Bearer ${apiKey}`,
					},
					json: true,
				});

				const returnData: INodePropertyOptions[] = [];
				if (Array.isArray(response)) {
					response.forEach((item: any) => {
						returnData.push({
							name: `${item.source || 'Manual'} (${item.id})`,
							value: item.id,
						});
					});
				}
				return returnData;
			},
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('aitiApi');
				const baseUrl = credentials.baseUrl as string;
				const apiKey = credentials.apiKey as string;

				const response = await this.helpers.request({
					method: 'GET',
					url: `${baseUrl}/api/models`,
					headers: {
						'X-API-KEY': apiKey,
						'Authorization': `Bearer ${apiKey}`,
					},
					json: true,
				});

				const returnData: INodePropertyOptions[] = [];
				const models = response.models;

				if (models.chat) {
					models.chat.forEach((model: string) => {
						returnData.push({
							name: `Chat: ${model}`,
							value: model,
						});
					});
				}
				if (models.coder) {
					models.coder.forEach((model: string) => {
						returnData.push({
							name: `Coder: ${model}`,
							value: model,
						});
					});
				}

				return returnData;
			},
			async getEmbeddingModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('aitiApi');
				const baseUrl = credentials.baseUrl as string;
				const apiKey = credentials.apiKey as string;

				const response = await this.helpers.request({
					method: 'GET',
					url: `${baseUrl}/api/models`,
					headers: {
						'X-API-KEY': apiKey,
						'Authorization': `Bearer ${apiKey}`,
					},
					json: true,
				});

				const returnData: INodePropertyOptions[] = [];
				const models = response.models;

				if (models.embed) {
					models.embed.forEach((model: string) => {
						returnData.push({
							name: model,
							value: model,
						});
					});
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('aitiApi');
				const baseUrl = credentials.baseUrl as string;
				const apiKey = credentials.apiKey as string;

				if (operation === 'chat') {
					const model = this.getNodeParameter('model', i) as string;
					const prompt = this.getNodeParameter('prompt', i) as string;
					const systemPrompt = this.getNodeParameter('systemPrompt', i) as string;
					const additionalParameters = this.getNodeParameter('additionalParameters', i) as any;

					const body: any = {
						model,
						prompt,
						systemPrompt,
						stream: false,
						...additionalParameters,
					};

					const response = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/api/chat`,
						headers: {
							'X-API-KEY': apiKey,
							'Authorization': `Bearer ${apiKey}`,
						},
						body,
						json: true,
					});

					returnData.push({
						json: response,
						pairedItem: i,
					});
				} else if (operation === 'clearHistory') {
					const response = await this.helpers.request({
						method: 'DELETE',
						url: `${baseUrl}/api/chat/history`,
						headers: {
							'X-API-KEY': apiKey,
							'Authorization': `Bearer ${apiKey}`,
						},
						json: true,
					});

					returnData.push({
						json: response,
						pairedItem: i,
					});
				}
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: i,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

}
