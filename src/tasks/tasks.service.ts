import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import * as schema from '../database/schema/tasks.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { desc, eq } from 'drizzle-orm';
import { UpdateTaskDto } from './dto/update-task.dto';

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

  async findAll() {
    return await this.database
      .select()
      .from(schema.tasks)
      .orderBy(desc(schema.tasks.createdAt));
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
