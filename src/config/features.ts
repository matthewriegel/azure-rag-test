import config from './env.js';

export const featureFlags = {
  queryCache: config.features.queryCache,
  customerDataCache: config.features.customerDataCache,
  telemetry: config.features.telemetry,
  piiRedaction: config.features.piiRedaction,
};

export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature];
}

export default featureFlags;
