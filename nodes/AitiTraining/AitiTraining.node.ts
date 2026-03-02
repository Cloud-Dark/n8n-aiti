import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export class AitiTraining implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AITI Training',
		name: 'aitiTraining',
		icon: 'file:aiti.svg',
		group: ['transform'],
		version: 1,
		description: 'Ingest data for RAG (AITI AI)',
		defaults: {
			name: 'AITI Training',
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
						name: 'Create Training',
						value: 'create',
						description: 'Ingest text for RAG',
						action: 'Create training',
					},
					{
						name: 'List Training',
						value: 'list',
						description: 'List all training data',
						action: 'List training',
					},
					{
						name: 'Delete Training',
						value: 'delete',
						description: 'Delete a specific training result',
						action: 'Delete training',
					},
				],
				default: 'create',
			},
			// Create Operation Properties
			{
				displayName: 'Embedding Model',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEmbeddingModels',
				},
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				default: '',
				required: true,
				description: 'The embedding model to use for training',
			},
			{
				displayName: 'Text Content',
				name: 'text',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				default: '',
				required: true,
				description: 'The text content to ingest for RAG',
			},
			{
				displayName: 'Additional Parameters',
				name: 'additionalParameters',
				type: 'collection',
				placeholder: 'Add Parameter',
				default: {},
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Source Name',
						name: 'source',
						type: 'string',
						default: '',
						description: 'Source of the text (e.g. filename or URL)',
					},
					{
						displayName: 'Max Chars per Chunk',
						name: 'maxChars',
						type: 'number',
						default: 500,
						description: 'Maximum characters per chunk for splitting',
					},
				],
			},
			// Delete Operation Properties
			{
				displayName: 'Training ID',
				name: 'trainingId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				default: '',
				required: true,
				description: 'The ID of the training to delete',
			},
		],
	};

	methods = {
		loadOptions: {
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
				if (response.models && response.models.embed) {
					response.models.embed.forEach((model: string) => {
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

				if (operation === 'create') {
					const model = this.getNodeParameter('model', i) as string;
					const text = this.getNodeParameter('text', i) as string;
					const additionalParameters = this.getNodeParameter('additionalParameters', i) as any;

					const query: any = {
						model,
						...additionalParameters,
					};

					const response = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/api/training`,
						qs: query,
						headers: {
							'X-API-KEY': apiKey,
							'Authorization': `Bearer ${apiKey}`,
							'Content-Type': 'text/plain',
						},
						body: text,
						json: true,
					});

					returnData.push({
						json: response,
						pairedItem: i,
					});
				} else if (operation === 'list') {
					const response = await this.helpers.request({
						method: 'GET',
						url: `${baseUrl}/api/training`,
						headers: {
							'X-API-KEY': apiKey,
							'Authorization': `Bearer ${apiKey}`,
						},
						json: true,
					});

					if (Array.isArray(response)) {
						response.forEach((item) => {
							returnData.push({
								json: item,
								pairedItem: i,
							});
						});
					} else {
						returnData.push({
							json: response,
							pairedItem: i,
						});
					}
				} else if (operation === 'delete') {
					const trainingId = this.getNodeParameter('trainingId', i) as string;
					const response = await this.helpers.request({
						method: 'DELETE',
						url: `${baseUrl}/api/training/${trainingId}`,
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
			} catch (error) {
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
