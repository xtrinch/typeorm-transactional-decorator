import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Transactional, runOnTransactionCommit, runOnTransactionRollback } from '../../src'
import { Post } from '../entity/Post'
import { DataSource, Repository } from 'typeorm'

@Injectable()
export class AppService {
  private _success = ''
  get success(): string {
    return this._success
  }
  set success(value: string) {
    this._success = value
  }

  constructor(
    @InjectRepository(Post)
    readonly repository: Repository<Post>
  ) {}

  @Transactional()
  async createPost(message: string, fail: boolean = false): Promise<Post> {
    const post = new Post()
    post.message = message
    await this.repository.save(post)
    runOnTransactionCommit(() => (this.success = 'true'))
    runOnTransactionRollback(() => (this.success = 'false'))
    if (fail) {
      throw Error('fail = true, so failing')
    }
    return post
  }

  async getPostByMessage(message: string): Promise<Post | null> {
    return this.repository.findOne({ where: { message } })
  }
}
