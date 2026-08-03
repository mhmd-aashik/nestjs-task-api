import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import * as schema from '../database/schema/tasks.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { PaginatedResult } from 'src/lib/common/interfaces/api-response.interface';
import { paginateResult } from 'src/lib/common/utils/pagination.util';

@Injectable()
export class TasksService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async create(createDto: CreateTaskDto) {
    const [createdTask] = await this.database
      .insert(schema.tasks)
      .values({
        title: createDto.title,
        description: createDto.description,
        completed: createDto.completed,
      })
      .returning();

    return createdTask;
  }

  async findAll(
    queryDto: QueryTasksDto,
  ): Promise<PaginatedResult<schema.Task>> {
    const { page, limit, search, completed, sortBy, sortOrder } = queryDto;

    const filters = and(
      search
        ? or(
            ilike(schema.tasks.title, `%${search.trim()}%`),
            ilike(schema.tasks.description, `%${search.trim()}%`),
          )
        : undefined,

      completed !== undefined
        ? eq(schema.tasks.completed, completed === 'true')
        : undefined,
    );

    const sortColumns = {
      createdAt: schema.tasks.createdAt,
      updatedAt: schema.tasks.updatedAt,
      title: schema.tasks.title,
    };

    const orderBy =
      sortOrder === 'asc'
        ? asc(sortColumns[sortBy])
        : desc(sortColumns[sortBy]);

    const [items, [{ total }]] = await Promise.all([
      this.database
        .select()
        .from(schema.tasks)
        .where(filters)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),

      this.database
        .select({ total: count() })
        .from(schema.tasks)
        .where(filters),
    ]);

    return paginateResult(items, Number(total), page, limit);
  }

  async findOne(id: string) {
    const [task] = await this.database
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .limit(1);

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" was not found`);
    }

    return task;
  }

  async update(id: string, updateDto: UpdateTaskDto) {
    const [updateTask] = await this.database
      .update(schema.tasks)
      .set({
        ...updateDto,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, id))
      .returning();

    if (!updateTask) {
      throw new NotFoundException(`Task with ID "${id}" was not found`);
    }

    return updateTask;
  }

  async remove(id: string) {
    const [deletedTask] = await this.database
      .delete(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .returning();

    if (!deletedTask) {
      throw new NotFoundException(`Task with ID "${id}" was not found`);
    }

    return deletedTask;
  }
}
