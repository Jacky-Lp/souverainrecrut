const model = () => ({
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

export const prisma = {
  user: model(),
  candidate: model(),
  job: model(),
  application: model(),
  $queryRaw: jest.fn(),
};
