import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  ContainerClient,
} from '@azure/storage-blob';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

class BlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor() {
    const credential = new StorageSharedKeyCredential(
      config.azureStorage.accountName,
      config.azureStorage.accountKey
    );

    this.blobServiceClient = new BlobServiceClient(
      `https://${config.azureStorage.accountName}.blob.core.windows.net`,
      credential
    );

    this.containerClient = this.blobServiceClient.getContainerClient(
      config.azureStorage.containerName
    );

    logger.info('Azure Blob Storage client initialized');
  }

  /**
   * Ensure container exists
   */
  async ensureContainer(): Promise<void> {
    try {
      const exists = await this.containerClient.exists();
      if (!exists) {
        await this.containerClient.create();
        logger.info(`Created container: ${config.azureStorage.containerName}`);
      }
    } catch (error) {
      logger.error('Error ensuring container exists', { error });
      throw error;
    }
  }

  /**
   * Upload blob data
   */
  async uploadBlob(blobName: string, data: string | Buffer): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(data, Buffer.byteLength(data));
      logger.info(`Uploaded blob: ${blobName}`);
    } catch (error) {
      logger.error('Error uploading blob', { error, blobName });
      throw new Error('Failed to upload blob');
    }
  }

  /**
   * Download blob data
   */
  async downloadBlob(blobName: string): Promise<string> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const downloadResponse = await blockBlobClient.download(0);
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No stream body in download response');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks).toString('utf-8');
    } catch (error) {
      logger.error('Error downloading blob', { error, blobName });
      throw new Error('Failed to download blob');
    }
  }

  /**
   * Download blob as JSON
   */
  async downloadBlobAsJson<T>(blobName: string): Promise<T> {
    const content = await this.downloadBlob(blobName);
    return JSON.parse(content) as T;
  }

  /**
   * List blobs with prefix
   */
  async listBlobs(prefix?: string): Promise<string[]> {
    try {
      const blobNames: string[] = [];
      const options = prefix ? { prefix } : undefined;

      for await (const blob of this.containerClient.listBlobsFlat(options)) {
        blobNames.push(blob.name);
      }

      return blobNames;
    } catch (error) {
      logger.error('Error listing blobs', { error, prefix });
      throw new Error('Failed to list blobs');
    }
  }

  /**
   * Delete blob
   */
  async deleteBlob(blobName: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      logger.info(`Deleted blob: ${blobName}`);
    } catch (error) {
      logger.error('Error deleting blob', { error, blobName });
      throw new Error('Failed to delete blob');
    }
  }

  /**
   * Check if blob exists
   */
  async blobExists(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      return await blockBlobClient.exists();
    } catch (error) {
      logger.error('Error checking blob existence', { error, blobName });
      return false;
    }
  }

  /**
   * Get customer data by ID
   */
  async getCustomerData(customerId: string): Promise<unknown> {
    const blobName = `customers/${customerId}/data.json`;
    return await this.downloadBlobAsJson(blobName);
  }
}

// Singleton instance
let blobService: BlobStorageService | null = null;

export function getBlobClient(): BlobStorageService {
  if (!blobService) {
    blobService = new BlobStorageService();
  }
  return blobService;
}

export default getBlobClient;
