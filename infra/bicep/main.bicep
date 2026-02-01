// Main Bicep template for Azure RAG Backend
targetScope = 'resourceGroup'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Unique suffix for resource names')
param suffix string = uniqueString(resourceGroup().id)

// Variables
var resourcePrefix = 'rag-${environment}'

// Azure OpenAI
module openai 'modules/openai.bicep' = {
  name: 'openai-deployment'
  params: {
    name: '${resourcePrefix}-openai-${suffix}'
    location: location
  }
}

// Azure AI Search
module search 'modules/search.bicep' = {
  name: 'search-deployment'
  params: {
    name: '${resourcePrefix}-search-${suffix}'
    location: location
    sku: environment == 'prod' ? 'standard' : 'basic'
  }
}

// Azure Cache for Redis
module redis 'modules/redis.bicep' = {
  name: 'redis-deployment'
  params: {
    name: '${resourcePrefix}-redis-${suffix}'
    location: location
    sku: environment == 'prod' ? 'Premium' : 'Basic'
  }
}

// Azure Blob Storage
module storage 'modules/storage.bicep' = {
  name: 'storage-deployment'
  params: {
    name: '${resourcePrefix}storage${suffix}'
    location: location
  }
}

// Azure Key Vault
module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault-deployment'
  params: {
    name: '${resourcePrefix}-kv-${suffix}'
    location: location
  }
}

// Application Insights
module appInsights 'modules/appinsights.bicep' = {
  name: 'appinsights-deployment'
  params: {
    name: '${resourcePrefix}-insights-${suffix}'
    location: location
  }
}

// Outputs
output openaiEndpoint string = openai.outputs.endpoint
output searchEndpoint string = search.outputs.endpoint
output redisHostName string = redis.outputs.hostName
output storageAccountName string = storage.outputs.name
output keyVaultUrl string = keyVault.outputs.vaultUri
output appInsightsConnectionString string = appInsights.outputs.connectionString
