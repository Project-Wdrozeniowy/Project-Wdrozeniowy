export default {
  orbita: {
    input: '../backend/openapi.json',
    output: {
      target: './src/shared/api/generated/orbita.api.ts',
      schemas: './src/shared/api/generated/models',
      mode: 'split',
      client: 'react-query',
      httpClient: 'axios',
      tsconfig: './tsconfig.json',
      baseUrl: '',
      schemaFileExtension: '.dto.ts',
      indexFiles: false,
      urlEncodeParameters: true,
      override: {
        mutator: { path: '@/shared/api/client/orvalTransport', name: 'orvalTransport' },
        query: {
          version: 5,
          signal: true,
          useInvalidate: true,
          mutationInvalidates: [{ onMutations: ['createPost'], invalidates: ['listPosts'] }],
        },
      },
    },
  },
};
