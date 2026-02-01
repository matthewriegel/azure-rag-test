#!/bin/bash
# Deploy Azure infrastructure using Bicep

set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-rag-backend}"
LOCATION="${LOCATION:-eastus}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

echo "🚀 Deploying Azure infrastructure..."
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Environment: $ENVIRONMENT"

# Create resource group if it doesn't exist
echo "📦 Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

# Deploy Bicep template
echo "🔧 Deploying resources..."
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infra/bicep/main.bicep \
  --parameters environment="$ENVIRONMENT" \
  --name "rag-backend-$(date +%Y%m%d-%H%M%S)"

# Get outputs
echo "📋 Deployment outputs:"
az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$(az deployment group list --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv)" \
  --query properties.outputs

echo "✅ Deployment complete!"
