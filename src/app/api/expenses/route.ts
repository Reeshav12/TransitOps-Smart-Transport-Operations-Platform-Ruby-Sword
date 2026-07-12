import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { expenseCreateSchema, expenseQuerySchema } from '@/lib/validation';
import * as expenseService from '@/lib/services/expense.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('expense:read');
  const query = expenseQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const result = await expenseService.getAllExpenses(query);
  return Response.json(result);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRoleAction('expense:create');
  const body = await request.json();
  const data = expenseCreateSchema.parse(body);
  const expense = await expenseService.createExpense(data, user.id);
  return Response.json(expense, { status: 201 });
});
