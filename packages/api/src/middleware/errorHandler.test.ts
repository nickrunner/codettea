import { Request, Response, NextFunction } from 'express';
import { ValidateError } from 'tsoa';
import { errorHandler } from './errorHandler';

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should handle ValidateError', () => {
    const validateError = new ValidateError(
      { field1: { message: 'Invalid value' } },
      'Validation failed'
    );

    errorHandler(
      validateError,
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(422);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Validation Failed',
      details: { field1: { message: 'Invalid value' } }
    });
  });

  it('should handle generic Error', () => {
    const error = new Error('Something went wrong');
    error.stack = 'Error stack trace';

    errorHandler(
      error,
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Something went wrong',
      stack: 'Error stack trace'
    });
  });

  it('should not include stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Production error');
    error.stack = 'Error stack trace';

    errorHandler(
      error,
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Production error'
    });
  });

  it('should handle unknown error types', () => {
    const unknownError = { strange: 'error' };

    errorHandler(
      unknownError,
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'An unknown error occurred'
    });
  });
});