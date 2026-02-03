export const mockValidateAnthropicApiKey = jest.fn()
export const mockEncryptApiKey = jest.fn()
export const mockDecryptApiKey = jest.fn()

export const validateAnthropicApiKey = mockValidateAnthropicApiKey
export const encryptApiKey = mockEncryptApiKey
export const decryptApiKey = mockDecryptApiKey

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
}
