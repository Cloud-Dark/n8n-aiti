# @cloud-dark/n8n-nodes-aiti-ai

This is an n8n community node that allows you to interact with the AITI AI Backend. It provides a suite of nodes for Chat, RAG (Retrieval Augmented Generation), OCR, and Training.

[AITI AI](https://github.com/syahdan/aiti) is a powerful local-first AI orchestration backend.

## Features

### 1. AITI Core
- **Chat**: Chat with various AI models (Chat, Coder, Reasoning).
- **RAG Support**: Seamlessly integrate your knowledge base by selecting multiple Training IDs.
- **Session Management**: Clear chat history directly from your workflow.
- **Advanced Parameters**: Control temperature, top_p, max_tokens, and system prompts.

### 2. AITI OCR
- **Extraction**: Extract text from images (PNG, JPG, WEBP).
- **AI Cleanup**: Automatically clean up and format OCR results using an AI model of your choice with a custom cleanup prompt.

### 3. AITI Training
- **Ingestion**: Train your AI by ingesting text data into the RAG system.
- **Model Selection**: Choose specific embedding models for different datasets.
- **Management**: List and delete training data entries.

## Installation

### For n8n UI users
1. Go to **Settings > Community Nodes**.
2. Click **Install a node**.
3. Enter `@cloud-dark/n8n-nodes-aiti-ai`.
4. Click **Install**.

### For manual installation
In your n8n root directory:
```bash
npm install @cloud-dark/n8n-nodes-aiti-ai
```

## Credentials

To use these nodes, you need to set up the **AITI API** credentials in n8n:
- **Base URL**: The URL of your AITI Backend (e.g., `http://localhost:3001`).
- **API Key**: Your unified API key from the AITI Backend.

## License

[MIT](LICENSE)
