// Azure Cache for Redis
param name string
param location string
param sku string = 'Basic'

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: sku
      family: sku == 'Premium' ? 'P' : 'C'
      capacity: sku == 'Premium' ? 1 : 1 // C1 for Basic/Standard (1GB), P1 for Premium (6GB)
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

output hostName string = redis.properties.hostName
output sslPort int = redis.properties.sslPort
output name string = redis.name
output id string = redis.id
