param location string = resourceGroup().location
param acrName string = 'acr${uniqueString(resourceGroup().id)}'
param environmentName string = 'env-${uniqueString(resourceGroup().id)}'
param logAnalyticsWorkspaceName string = 'log-${uniqueString(resourceGroup().id)}'
param frontendAppName string = 'frontend-app'
param backendAppName string = 'backend-app'

@description('The container image for the frontend app. Defaults to a hello-world image. Replace with your actual ACR image after build (e.g., acrName.azurecr.io/frontend:latest)')
param frontendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('The container image for the backend app. Defaults to a hello-world image. Replace with your actual ACR image after build (e.g., acrName.azurecr.io/new-backend:latest)')
param backendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

param cosmosDbAccountName string = 'cosmos-${uniqueString(resourceGroup().id)}'

@secure()
@description('Resend API Key for the backend app')
param resendApiKey string

// 1. Azure Container Registry (ACR)
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// 2. Log Analytics Workspace for Container Apps Environment
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

// 3. Container Apps Environment
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

// 4. Azure Cosmos DB (MongoDB API - Serverless)
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosDbAccountName
  location: location
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    apiProperties: {
      serverVersion: '4.2'
    }
  }
}

// 5. Backend Container App (Internal Only)
resource backendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: backendAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: false // Exposes port strictly to internal environment traffic
        targetPort: 5000
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.name
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'mongodb-uri'
          value: cosmosDb.listConnectionStrings().connectionStrings[0].connectionString
        }
        {
          name: 'resend-api-key'
          value: resendApiKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: backendAppName
          image: backendImage
          env: [
            {
              name: 'MONGODB_URI'
              secretRef: 'mongodb-uri'
            }
            {
              name: 'RESEND_API_KEY'
              secretRef: 'resend-api-key'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
    }
  }
}

// 6. Frontend Container App (External)
resource frontendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: frontendAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true // Exposes port 3000 to external public traffic
        targetPort: 3000
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.name
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: frontendAppName
          image: frontendImage
          env: [
            {
              name: 'BACKEND_URL'
              value: 'http://${backendApp.properties.configuration.ingress.fqdn}'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
    }
  }
}

output frontendFqdn string = frontendApp.properties.configuration.ingress.fqdn
output backendFqdn string = backendApp.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
