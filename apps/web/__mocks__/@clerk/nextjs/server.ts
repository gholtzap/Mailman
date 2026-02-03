export const mockAuth = jest.fn()
export const mockCurrentUser = jest.fn()

export const auth = mockAuth
export const currentUser = mockCurrentUser

export function setMockUserId(userId: string | null) {
  mockAuth.mockResolvedValue({ userId })
}

export function setMockUser(user: any) {
  mockCurrentUser.mockResolvedValue(user)
}

export function resetAuthMocks() {
  mockAuth.mockReset()
  mockCurrentUser.mockReset()
}
