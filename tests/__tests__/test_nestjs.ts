import { initializeTransactionalContext, patchTypeORMRepositoryWithBaseRepository } from '../../src'
import { Post } from '../entity/Post'
import { AppService } from '../nestjs/app.service'
import { Test, TestingModule } from '@nestjs/testing'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm'
import { INestApplication } from '@nestjs/common'

dotenv.config({
  path: './tests/.env',
});

describe('NestJS', () => {
  let module: TestingModule
  let app: INestApplication
  let service: AppService
  let dataSource: DataSource;
  const successMessage = 'NestJS - A successful post'
  const failureMessage = 'NestJS - An unsuccessful post'

  beforeAll(async () => {
    initializeTransactionalContext()
    patchTypeORMRepositoryWithBaseRepository()
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT as string, 10),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          entities: [Post],
          synchronize: true,
          logging: 'all',
        }),
        TypeOrmModule.forFeature([Post]),
      ],
      exports: [],
      providers: [AppService],
    }).compile()

    app = module.createNestApplication();
    service = app.get<AppService>(AppService)

    await app.init();

    dataSource = app.get<DataSource>(DataSource);
  })

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  })

  it('Creates a post using service', async () => {
    const post = await service.createPost(successMessage)
    expect(post.id).toBeGreaterThan(0)
  })

  it('Verifies that creating the post had correct side effects', done => {
    setTimeout(async () => {
      expect(service.success).toEqual('true')
      const dbPost = await service.getPostByMessage(successMessage)
      console.log(`dbPost: ${dbPost}`)
      expect(dbPost).toBeTruthy()
      done()
    }, 300)
  })

  it('Fails creating a post using service', async () => {
    await expect(service.createPost(failureMessage, true)).rejects.toThrow()
  })

  it('Verifies that failing to create a post using service had correct side effects', async done => {
    setTimeout(async () => {
      expect(service.success).toEqual('false')
      const dbPost = await service.getPostByMessage(failureMessage)
      console.log(`dbPost: ${dbPost}`)
      expect(dbPost).toBeFalsy()
      done()
    }, 300)
  })
})
