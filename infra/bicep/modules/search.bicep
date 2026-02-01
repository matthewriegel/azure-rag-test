// Azure AI Search Service
param name string
param location string
param sku string = 'basic'

resource search 'Microsoft.Search/searchServices@2023-11-01' = {
  name: name
  location: location
  sku: {
    name: sku
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    publicNetworkAccess: 'enabled'
    semanticSearch: 'free'
  }
}

output endpoint string = 'https://${search.name}.search.windows.net'
output name string = search.name
output id string = search.id
