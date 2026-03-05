export const mockValidateAnthropicApiKey = jest.fn()
export const mockEncryptApiKey = jest.fn()
export const mockDecryptApiKey = jest.fn()
export const mockMigrateApiKeyIfLegacy = jest.fn(async (_userId: any, data: any) => data)

export const validateAnthropicApiKey = mockValidateAnthropicApiKey
export const encryptApiKey = mockEncryptApiKey
export const decryptApiKey = mockDecryptApiKey
export const migrateApiKeyIfLegacy = mockMigrateApiKeyIfLegacy

export function setMockValidation(valid: boolean, error?: string) {
  mockValidateAnthropicApiKey.mockResolvedValue({ valid, error })
}

export function setMockEncryption(encrypted: any) {
  mockEncryptApiKey.mockReturnValue(encrypted)
}

export function resetEncryptionMocks() {
  mockValidateAnthropicApiKey.mockReset()
  mockEncryptApiKey.mockReset()
  mockDecryptApiKey.mockReset()
  mockMigrateApiKeyIfLegacy.mockReset()
  mockMigrateApiKeyIfLegacy.mockImplementation(async (_userId: any, data: any) => data)
}
