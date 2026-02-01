# Postman Collection

Postman collection for testing the Azure RAG Backend API.

## Import Steps

1. **Open Postman** (download from [postman.com](https://www.postman.com/downloads/))

2. **Import Collection**:
   - Click "Import" in top-left
   - Drag `collection.json` or click "Upload Files"
   - Select `postman/collection.json`

3. **Configure Variables**:
   - Click collection name → "Variables" tab
   - Set `baseUrl`: `http://localhost:3000` (local) or your Azure URL
   - Set `apiKey`: Your ingest API key from `.env.local`

4. **Send Requests**:
   - Expand collection
   - Click request (e.g., "Health Check")
   - Click "Send"

## Requests

### 1. Health Check
- **Method**: GET
- **Endpoint**: `/health`
- **Auth**: None
- **Purpose**: Verify service is running

### 2. Form Query
- **Method**: POST
- **Endpoint**: `/api/form-query`
- **Auth**: None
- **Body**:
  ```json
  {
    "formQuestion": "What is the customer's email address?",
    "customerId": "customer-123"
  }
  ```

### 3. Ingest Customer Data
- **Method**: POST
- **Endpoint**: `/api/ingest`
- **Auth**: API Key (header `X-API-Key`)
- **Body**:
  ```json
  {
    "customerId": "customer-123",
    "forceReindex": false
  }
  ```

## Environment Setup

For production testing, create a Postman environment:
- `baseUrl`: `https://your-app.azurecontainerapps.io`
- `apiKey`: Your production API key

---

**Last updated**: 2026-02-01T15:48:00Z
