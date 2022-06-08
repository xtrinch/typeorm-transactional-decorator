import delay from 'delay'
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  initializeTransactionalContext,
  patchTypeORMRepositoryWithBaseRepository,
  runInTransaction,
  runOnTransactionCommit,
  runOnTransactionRollback,
  wrapInTransaction,
} from '../../src'
import { Post } from '../entity/Post'
import { SimpleService } from '../simple/simple.service'

describe('Simple', () => {
  let dataSource: DataSource

  beforeAll(async () => {
    initializeTransactionalContext()
    patchTypeORMRepositoryWithBaseRepository()
    dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1Qazxsw2',
      entities: [Post],
      synchronize: true,
      logging: 'all',
    })
  })

  afterAll(async () => await dataSource.destroy())

  it('Creates a post using service', async () => {
    const repository = dataSource.getRepository(Post)
    const service = new SimpleService(repository)
    const message = 'simple - A successful post'
    const post = await service.createPost(message)

    await delay(100)

    expect(post.id).toBeGreaterThan(0)
    expect(service.success).toEqual('true')
    const dbPost = await service.getPostByMessage(message)
    // tslint:disable-next-line: no-console
    console.log(`dbPost: ${dbPost}`)
    expect(dbPost).toBeTruthy()
  })

  it('Fails creating a post using service', async () => {
    const repository = dataSource.getRepository(Post)
    const service = new SimpleService(repository)
    const message = 'simple - An unsuccessful post'
    expect(service.createPost(message, true)).rejects.toThrow()

    await delay(100)

    expect(service.success).toEqual('false')
    const dbPost = await service.getPostByMessage(message)
    // tslint:disable-next-line: no-console
    console.log(`dbPost: ${dbPost}`)
    expect(dbPost).toBeFalsy()
  })

  it('Create a post using wrapInTransaction', async () => {
    const repository = dataSource.getRepository(Post)
    const post = new Post()
    const message = 'simple - An successful post using wrapInTransaction'
    post.message = message
    let commitHookCalled = false

    const result = await wrapInTransaction(
      async () => {
        const createdPost = await repository.save(post)
        runOnTransactionCommit(() => {
          commitHookCalled = true
        })
        return createdPost
      },
      { dataSource }
    )()

    await delay(10)

    expect(post.id).toBeGreaterThan(0)
    expect(commitHookCalled).toBeTruthy()
    expect(repository.findOne({ where: { message } })).resolves.toBeTruthy()
  })

  it('Fails creating a post using using wrapInTransaction', async () => {
    const repository = dataSource.getRepository(Post)
    const post = new Post()
    const message = 'simple - An failed post using wrapInTransaction'
    post.message = message
    let rollbackHookCalled = false

    expect(
      wrapInTransaction(
        async () => {
          const createdPost = await repository.save(post)
          runOnTransactionRollback(() => {
            rollbackHookCalled = true
          })
          throw new Error('failing')
        },
        { dataSource }
      )()
    ).rejects.toThrow()

    await delay(100)

    expect(rollbackHookCalled).toBeTruthy()
    expect(repository.findOne({ where: { message } })).resolves.toBeUndefined()
  })

  it('Create a post using runInTransaction', async () => {
    const repository = dataSource.getRepository(Post)
    const post = new Post()
    const message = 'simple - An successful post using runInTransaction'
    post.message = message
    let commitHookCalled = false

    const result = await runInTransaction(
      async () => {
        const createdPost = await repository.save(post)
        runOnTransactionCommit(() => {
          commitHookCalled = true
        })
        return createdPost
      },
      { dataSource }
    )

    await delay(100)

    expect(post.id).toBeGreaterThan(0)
    expect(commitHookCalled).toBeTruthy()
    expect(repository.findOne({ where: { message } })).resolves.toBeTruthy()
  })

  it('Fails creating a post using using runInTransaction', async () => {
    const repository = dataSource.getRepository(Post)
    const post = new Post()
    const message = 'simple - An failed post using runInTransaction'
    post.message = message
    let rollbackHookCalled = false

    expect(
      runInTransaction(
        async () => {
          const createdPost = await repository.save(post)
          runOnTransactionRollback(() => {
            rollbackHookCalled = true
          })
          throw new Error('failing')
        },
        { dataSource }
      )
    ).rejects.toThrow()

    await delay(100)

    expect(rollbackHookCalled).toBeTruthy()
    expect(repository.findOne({ where: { message } })).resolves.toBeUndefined()
  })
})
