# Azure RAG Backend Infrastructure

This directory contains Azure infrastructure as code using Bicep templates.

## Prerequisites

- Azure CLI installed
- Azure subscription
- Appropriate permissions to create resources

## Deployment

### Create Resource Group

```bash
az group create --name rg-rag-backend --location eastus
```

### Deploy Infrastructure

```bash
az deployment group create \
  --resource-group rg-rag-backend \
  --template-file bicep/main.bicep \
  --parameters environment=dev
```

### Get Outputs

```bash
az deployment group show \
  --resource-group rg-rag-backend \
  --name main \
  --query properties.outputs
```

## Resources Created

- **Azure OpenAI**: Chat and embedding model deployments
- **Azure AI Search**: Vector search enabled search service
- **Azure Cache for Redis**: Query and data caching
- **Azure Blob Storage**: Customer document storage
- **Azure Key Vault**: Secrets management
- **Application Insights**: Monitoring and logging

## Cost Considerations

- **Development**: ~$100-200/month
  - Basic tier for most services
  - Minimal compute resources
  
- **Production**: ~$500-1000/month
  - Standard/Premium tiers
  - Auto-scaling enabled
  - High availability

## Clean Up

```bash
az group delete --name rg-rag-backend --yes
```
