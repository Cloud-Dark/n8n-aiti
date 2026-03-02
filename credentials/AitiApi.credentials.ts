import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AitiApi implements ICredentialType {
	name = 'aitiApi';
	displayName = 'AITI API';
	documentationUrl = 'https://github.com/syahdan/aiti';
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:3001',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];
}
