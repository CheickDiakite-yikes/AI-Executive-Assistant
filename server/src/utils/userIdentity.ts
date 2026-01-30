import type { Request } from 'express';

export const getRequestUserId = (req: Request) => {
  const headerUser = req.headers['x-user-id'];
  const headerVisitor = req.headers['x-visitor-id'];
  const queryUser = req.query.userId;

  if (typeof headerUser === 'string' && headerUser.trim()) {
    return headerUser.trim();
  }
  if (typeof headerVisitor === 'string' && headerVisitor.trim()) {
    return headerVisitor.trim();
  }
  if (typeof queryUser === 'string' && queryUser.trim()) {
    return queryUser.trim();
  }
  return 'default';
};
