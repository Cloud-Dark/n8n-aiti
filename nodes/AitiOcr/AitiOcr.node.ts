import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export class AitiOcr implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AITI OCR',
		name: 'aitiOcr',
		icon: 'file:aiti.svg',
		group: ['transform'],
		version: 1,
		description: 'Extract text from images and optionally clean with AI (AITI AI)',
		defaults: {
			name: 'AITI OCR',
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
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property which contains the image for OCR',
			},
			{
				displayName: 'Clean with AI',
				name: 'cleanWithAi',
				type: 'boolean',
				default: false,
				description: 'Whether to use an AI model to clean up/format the OCR result',
			},
			{
				displayName: 'AI Model',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				displayOptions: {
					show: {
						cleanWithAi: [true],
					},
				},
				default: '',
				description: 'The AI model to use for cleaning up the text',
			},
			{
				displayName: 'Custom Cleanup Prompt',
				name: 'cleanupPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						cleanWithAi: [true],
					},
				},
				default: 'Clean up the following OCR text, fix typos, and format it nicely. Keep the original meaning and language.',
				description: 'Instructions for the AI on how to clean the text',
			},
		],
	};

	methods = {
		loadOptions: {
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
				if (response.models) {
					if (response.models.chat) {
						response.models.chat.forEach((model: string) => {
							returnData.push({ name: `Chat: ${model}`, value: model });
						});
					}
					if (response.models.coder) {
						response.models.coder.forEach((model: string) => {
							returnData.push({ name: `Coder: ${model}`, value: model });
						});
					}
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('aitiApi');
				const baseUrl = credentials.baseUrl as string;
				const apiKey = credentials.apiKey as string;

				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				const cleanWithAi = this.getNodeParameter('cleanWithAi', i) as boolean;

				if (items[i].binary === undefined || items[i].binary![binaryPropertyName] === undefined) {
					throw new Error(`Binary property "${binaryPropertyName}" not found on item.`);
				}

				const binaryData = items[i].binary![binaryPropertyName];
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

				// 1. OCR Step
				const ocrResponse = await this.helpers.request({
					method: 'POST',
					url: `${baseUrl}/api/ocr/extract`,
					headers: {
						'X-API-KEY': apiKey,
						'Authorization': `Bearer ${apiKey}`,
					},
					formData: {
						file: {
							value: buffer,
							options: {
								filename: binaryData.fileName || 'image.png',
								contentType: binaryData.mimeType,
							},
						},
					},
					json: true,
				});

				let finalResult = ocrResponse;

				// 2. AI Cleanup Step (Optional)
				if (cleanWithAi) {
					const model = this.getNodeParameter('model', i) as string;
					const cleanupPrompt = this.getNodeParameter('cleanupPrompt', i) as string;
					const ocrText = ocrResponse.text || ocrResponse.result || JSON.stringify(ocrResponse);

					const chatResponse = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/api/chat`,
						headers: {
							'X-API-KEY': apiKey,
							'Authorization': `Bearer ${apiKey}`,
						},
						body: {
							model,
							prompt: `${cleanupPrompt}

TEXT TO CLEAN:
${ocrText}`,
							stream: false,
						},
						json: true,
					});

					finalResult = {
						original: ocrResponse,
						cleaned: chatResponse,
						text: chatResponse.response || chatResponse.content,
					};
				}

				returnData.push({
					json: finalResult,
					pairedItem: i,
				});
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
