import '@testing-library/jest-dom'

// Mock CSS modules
const mockCSS = {}
const mockModule = new Proxy(mockCSS, {
  get: () => 'mocked-class'
})

// Mock all CSS modules
jest.mock('*.module.css', () => mockModule)


process.env.NEXT_PUBLIC_API_BASE = 'http://localhost:3000/';

// // global mock react-oidc-context
// jest.mock('react-oidc-context', () => ({
//   useAuth: jest.fn(() => ({
//     isAuthenticated: true,
//     isLoading: false,
//     error: null,
//     user: {
//       sub: 'test-user-id',
//       email: 'test@example.com',
//       name: 'Test User',
//       given_name: 'Test',
//       family_name: 'User',
//       id_token: 'fake-id-token',
//       access_token: 'fake-access-token',
//       // continue to add other user properties ...
//     },
//     signinRedirect: jest.fn(),
//     signoutRedirect: jest.fn(),
//     removeUser: jest.fn(),
//     settings: {},
//     events: {}
//   })),
//   // AuthProvider: ({ children }) => children,
//   hasAuthParams: jest.fn(() => false),
//   useAuthCallback: jest.fn(() => ({
//     isLoading: false,
//     error: null
//   }))
// }));

// jest.mock('./src/lib/upload/uploadService', () => ({
//   getPresignedUploadUrl: jest.fn().mockResolvedValue({
//     uploadUrl: 'https://fake-upload-url.com',
//     key: 'fake-upload-key'
//   }),
//   uploadToPresignedUrl: jest.fn().mockResolvedValue(true)
// }));