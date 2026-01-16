---
outline: deep
---

# Common NestJS Issues and How to Fix Them

Building production-grade applications with NestJS is powerful, but the framework's dependency injection system, decorator-based architecture, and TypeScript integration can introduce subtle issues that are hard to debug. This guide covers **real-world NestJS problems** drawn from GitHub issues, Stack Overflow, and production experience.

We'll explore:

- **Dependency injection errors**
- **Module configuration pitfalls**
- **Request lifecycle gotchas**
- **Database integration issues**
- **Authentication and guard problems**
- **Testing challenges**
- **Production performance issues**

For each issue, we'll show **how to detect it**, **why it happens**, and **how to fix it**.

---

## 1. Dependency Injection Issues

### 1.1 "Nest can't resolve dependencies of the [Service] (?)"

- **Frequency**: Highest (500+ GitHub issues reported)

This is the **most common NestJS error**. The cryptic `(?)` indicates a missing dependency.

#### Example Error

```bash
Error: Nest can't resolve dependencies of the UserService (?). 
Please make sure that the argument at index [0] is available in the UserModule context.
```

#### Common Causes of Dependency Errors

1. **Provider not in module's providers array**

```ts
// ❌ WRONG
@Module({
  controllers: [UserController],
  // Missing UserRepository in providers!
})
export class UserModule {}
```

2. **Missing export when crossing module boundaries**

```ts
// ❌ WRONG - AuthModule uses UserService but it's not exported
@Module({
  providers: [UserService],
  // Missing exports!
})
export class UserModule {}
```

#### Fixing Dependency Resolution

::: tip Detection Strategy

1. Count constructor parameters to find which is `(?)`
2. Check if that service is in `providers` array
3. If crossing modules, verify it's in `exports` array
4. Ensure service has `@Injectable()` decorator
:::

**Solution:**

```ts
// ✅ CORRECT
@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService], // Export for other modules
})
export class UserModule {}
```

---

### 1.2 Circular Dependency Detected

- **Frequency**: High | **Complexity**: High

Circular dependencies occur when Module A imports Module B, and Module B imports Module A.

#### Circular Dependency Error

```bash
Error: A circular dependency has been detected (UserService -> AuthService -> UserService).
Please make sure that each side of a bidirectional relationship is decorated with "forwardRef()".
```

#### Why It Happens

```ts
// user.service.ts
@Injectable()
export class UserService {
  constructor(private authService: AuthService) {} // depends on AuthService
}

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(private userService: UserService) {} // depends on UserService
}
```

#### Solutions (Ranked by Quality)

##### Option 1: Extract shared logic (BEST)

```ts
// Create a third service for shared logic
@Injectable()
export class UserAuthSharedService {
  validateUser(user: User) {
    // shared logic
  }
}

// Both services depend on the shared service
@Injectable()
export class UserService {
  constructor(private shared: UserAuthSharedService) {}
}

@Injectable()
export class AuthService {
  constructor(private shared: UserAuthSharedService) {}
}
```

##### Option 2: Use forwardRef (TEMPORARY FIX)

```ts
// Use forwardRef on BOTH sides
@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}
}
```

::: warning
`forwardRef()` is a code smell. It often indicates a design flaw. Use it temporarily while refactoring to Option 1.
:::

---

### 1.3 Provider Scope Mismatches

- **Frequency**: Medium | **Complexity**: Medium

NestJS providers can be `DEFAULT` (singleton), `REQUEST`, or `TRANSIENT` scoped. Mixing scopes causes issues.

#### Problem Example

```ts
// ❌ WRONG - REQUEST-scoped service injecting DEFAULT-scoped service
@Injectable({ scope: Scope.REQUEST })
export class UserService {
  constructor(private cacheService: CacheService) {} // DEFAULT scope
}
```

#### Fixing Scope Mismatches

::: tip Scope Rules

- **DEFAULT** (singleton): Shared across entire app
- **REQUEST**: New instance per HTTP request
- **TRANSIENT**: New instance every time injected

**Rule**: A REQUEST-scoped provider can inject DEFAULT or REQUEST, but DEFAULT cannot inject REQUEST.
:::

```ts
// ✅ CORRECT - Match scopes or use DEFAULT
@Injectable({ scope: Scope.REQUEST })
export class UserService {
  constructor(
    @Inject(REQUEST) private request: Request,
    private cacheService: CacheService, // DEFAULT is fine
  ) {}
}
```

---

## 2. Module Configuration Problems

### 2.1 Import vs Export Confusion

- **Frequency**: High | **Complexity**: Low

Understanding `imports`, `providers`, `exports`, and `controllers` is critical.

#### Module Anatomy

```ts
@Module({
  imports: [OtherModule], // Modules this module depends on
  controllers: [MyController], // HTTP route handlers
  providers: [MyService], // Services available in THIS module
  exports: [MyService], // Services OTHER modules can use
})
export class MyModule {}
```

#### Common Mistake: Exporting the Module Instead of Service

```ts
// ❌ WRONG
@Module({
  providers: [ActorService],
  exports: [ActorModule], // Exporting the module itself!
})
export class ActorModule {}

// ✅ CORRECT
@Module({
  providers: [ActorService],
  exports: [ActorService], // Export the service
})
export class ActorModule {}
```

---

### 2.2 Global vs Feature Modules

- **Frequency**: Medium | **Complexity**: Low

Use `@Global()` sparingly for truly shared services like logging or configuration.

#### When to Use Global Modules

```ts
// ✅ CORRECT - Global module for shared utilities
@Global()
@Module({
  providers: [LoggerService, ConfigService],
  exports: [LoggerService, ConfigService],
})
export class CoreModule {}
```

::: warning
**Don't overuse `@Global()`**. It makes dependency tracking harder. Prefer explicit imports.
:::

---

### 2.3 Dynamic Module Registration

- **Frequency**: Medium | **Complexity**: High

Dynamic modules allow runtime configuration (e.g., `JwtModule.register()`).

#### Pattern

```ts
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}

// Usage
@Module({
  imports: [
    DatabaseModule.forRoot({
      host: 'localhost',
      port: 5432,
    }),
  ],
})
export class AppModule {}
```

---

## 3. Request Lifecycle & Middleware

### 3.1 Execution Order

- **Frequency**: High | **Complexity**: Medium

Understanding the request lifecycle prevents bugs with guards, interceptors, and pipes.

#### Execution Order

```text
Incoming Request
    ↓
1. Middleware
    ↓
2. Guards
    ↓
3. Interceptors (before)
    ↓
4. Pipes
    ↓
5. Route Handler
    ↓
6. Interceptors (after)
    ↓
7. Exception Filters (if error)
    ↓
Response
```

#### Common Mistake: Expecting Guard to Run Before Middleware

```ts
// ❌ WRONG - Middleware runs BEFORE guards
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // This runs FIRST
    req.user = validateToken(req.headers.authorization);
    next();
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // This runs SECOND
    const request = context.switchToHttp().getRequest();
    return !!request.user; // user was set by middleware
  }
}
```

---

### 3.2 Guard vs Interceptor Timing

**When to Use What:**

| Use Case                     | Use                  |
| ---------------------------- | -------------------- |
| Authentication/Authorization | **Guard**            |
| Logging, caching             | **Interceptor**      |
| Input validation             | **Pipe**             |
| Error transformation         | **Exception Filter** |

---

### 3.3 Exception Filter Priority

- **Frequency**: Medium | **Complexity**: Low

Exception filters can be applied at different levels. More specific filters take precedence.

#### Priority Order (Highest to Lowest)

```ts
// 1. Method-level (highest priority)
@Post()
@UseFilters(MethodExceptionFilter)
createUser() {}

// 2. Controller-level
@Controller('users')
@UseFilters(ControllerExceptionFilter)
export class UserController {}

// 3. Global-level (lowest priority)
app.useGlobalFilters(new GlobalExceptionFilter());
```

---

## 4. Database Integration Issues

### 4.1 TypeORM Connection Errors

- **Frequency**: High | **Complexity**: High

The error `"Unable to connect to the database"` is often **misleading**.

#### Real Cause: Entity Syntax Errors

```ts
// ❌ WRONG - This shows as "connection error"
@Entity()
export class User {
  @Column('description') // Wrong syntax!
  name: string;
}

// ✅ CORRECT
@Entity()
export class User {
  @Column()
  name: string;

  @Column({ type: 'text' }) // If you need to specify type
  description: string;
}
```

#### How to Debug Connection Errors

::: tip Detection Steps

1. Check entity files for decorator syntax errors
2. Verify all entities are in `TypeOrmModule.forFeature([Entity])`
3. Check database credentials in `.env`
4. Enable logging: `logging: true` in TypeORM config
   :::

---

### 4.2 Prisma Client Injection

- **Frequency**: Medium | **Complexity**: Low

Prisma requires a custom provider setup in NestJS.

#### Setup

```ts
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// app.module.ts
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

// Usage
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany();
  }
}
```

---

### 4.3 Multiple Database Connections

- **Frequency**: Medium | **Complexity**: Medium

Use **named connections** for multiple databases.

```ts
// app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'default',
      type: 'postgres',
      host: 'localhost',
      database: 'main_db',
      entities: [User],
    }),
    TypeOrmModule.forRoot({
      name: 'analytics',
      type: 'postgres',
      host: 'localhost',
      database: 'analytics_db',
      entities: [Event],
    }),
  ],
})
export class AppModule {}

// Usage
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User, 'default')
    private userRepo: Repository<User>,
    @InjectRepository(Event, 'analytics')
    private eventRepo: Repository<Event>,
  ) {}
}
```

---

## 5. Authentication & Authorization

### 5.1 "Unknown authentication strategy 'jwt'"

- **Frequency**: High | **Complexity**: Low

This error means Passport can't find the JWT strategy.

#### Common Causes of Strategy Errors

1. **Wrong import**

```ts
// ❌ WRONG
import { Strategy } from 'passport-local'; // Wrong strategy!

// ✅ CORRECT
import { Strategy, ExtractJwt } from 'passport-jwt';
```

1. **Missing strategy registration**

```ts
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}

// auth.module.ts
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, JwtStrategy], // Must include strategy!
})
export class AuthModule {}
```

---

### 5.2 "secretOrPrivateKey must have a value"

- **Frequency**: High | **Complexity**: Low

JWT secret is missing or undefined.

#### Fixing Missing Secrets

```ts
// ❌ WRONG - Environment variable not loaded
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // undefined!
    }),
  ],
})
export class AuthModule {}

// ✅ CORRECT - Use ConfigModule
@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
})
export class AuthModule {}
```

---

### 5.3 Guard Execution Context

- **Frequency**: Medium | **Complexity**: Medium

Guards receive an `ExecutionContext` that works differently for HTTP, WebSocket, and GraphQL.

#### HTTP Guard Example

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Usage
@Post()
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
createUser() {}
```

---

## 6. Testing Challenges

### 6.1 Mocking Dependencies

- **Frequency**: High | **Complexity**: Medium

Testing requires proper mocking of all dependencies.

#### Unit Test Pattern

```ts
describe('UserService', () => {
  let service: UserService;
  let mockUserRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should find user by id', async () => {
    const user = { id: 1, name: 'Alice' };
    mockUserRepo.findOne.mockResolvedValue(user);

    const result = await service.findById(1);

    expect(result).toEqual(user);
    expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
```

---

### 6.2 E2E Test Setup

- **Frequency**: High | **Complexity**: High

E2E tests require a full application context.

#### E2E Test Pattern

```ts
describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(2);
      });
  });
});
```

---

### 6.3 Testing Custom Decorators

- **Frequency**: Medium | **Complexity**: Medium

Custom decorators need special testing approaches.

```ts
// Custom decorator
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Test
it('should extract user from request', () => {
  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 1, name: 'Alice' } }),
    }),
  } as ExecutionContext;

  const result = CurrentUser(null, mockContext);

  expect(result).toEqual({ id: 1, name: 'Alice' });
});
```

---

## 7. Production Performance Issues

### 7.1 Memory Leaks

- **Frequency**: Low | **Complexity**: High

Memory leaks often come from unclosed connections or event listeners.

#### Common Causes of Leaks

```ts
// ❌ WRONG - Event listener never removed
@Injectable()
export class NotificationService implements OnModuleInit {
  onModuleInit() {
    eventEmitter.on('user.created', this.sendEmail);
    // Never removed!
  }
}

// ✅ CORRECT - Clean up in onModuleDestroy
@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    eventEmitter.on('user.created', this.sendEmail);
  }

  onModuleDestroy() {
    eventEmitter.off('user.created', this.sendEmail);
  }
}
```

---

### 7.2 Blocking the Event Loop

- **Frequency**: Medium | **Complexity**: High

CPU-intensive operations block Node.js event loop.

#### Fixing Blocking Loops

```ts
// ❌ WRONG - Blocking operation
@Get('report')
async generateReport() {
  const data = await this.getData();
  // This blocks the event loop!
  return this.processLargeDataset(data);
}

// ✅ CORRECT - Offload to worker thread or queue
@Get('report')
async generateReport() {
  const jobId = await this.queue.add('generate-report', { userId: 123 });
  return { jobId, status: 'processing' };
}
```

---

### 7.3 Graceful Shutdown

- **Frequency**: Low | **Complexity**: Medium

Ensure clean shutdown to prevent data loss.

```ts
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  await app.listen(3000);
}

// In services
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.connection.close();
    console.log('Database connection closed');
  }
}
```

---

## 8. Best Practices Checklist

::: tip NestJS Best Practices

### Module Architecture

- [ ] All services have `@Injectable()` decorator
- [ ] Providers are in `providers` array and `exports` when needed
- [ ] No circular dependencies (or use `forwardRef` temporarily)
- [ ] Module boundaries follow domain/feature separation

### Database Integration

- [ ] Entity decorators use correct syntax (`@Column()` not `@Column('name')`)
- [ ] Connection errors don't crash the app (use retry logic)
- [ ] Multiple databases use named connections
- [ ] Repositories use `getRepositoryToken(Entity)` for testing

### Authentication

- [ ] JWT Strategy imports from `passport-jwt`
- [ ] JWT secret loaded from environment via `ConfigService`
- [ ] Authorization header format: `Bearer [token]`
- [ ] Guards properly protect routes

### Testing

- [ ] Unit tests mock all dependencies
- [ ] E2E tests use `Test.createTestingModule()`
- [ ] TypeORM repositories mocked with `getRepositoryToken()`
- [ ] All async operations are properly awaited

### Production

- [ ] Event listeners cleaned up in `onModuleDestroy()`
- [ ] CPU-intensive work offloaded to queues/workers
- [ ] Graceful shutdown enabled
- [ ] Health checks implemented
  :::

---

## 9. Debugging Checklist

When you encounter a NestJS issue, follow this systematic approach:

```text
1. Dependency Injection Error?
   - Check providers array
   - Verify exports if crossing modules
   - Look for typos in constructor parameters
   - Ensure @Injectable() decorator exists

2. Module Configuration Issue?
   - Review imports, providers, exports
   - Check for circular dependencies
   - Verify dynamic module registration

3. Request Lifecycle Problem?
   - Understand execution order: Middleware → Guards → Interceptors → Pipes
   - Check guard return values (boolean or throw exception)
   - Verify interceptor async handling

4. Database Connection Error?
   - Check entity decorator syntax FIRST
   - Verify database credentials
   - Enable TypeORM logging
   - Test connection independently

5. Authentication Failure?
   - Verify strategy import (passport-jwt vs passport-local)
   - Check JWT_SECRET is loaded
   - Test token format (Bearer [token])
   - Validate strategy registration in module

6. Test Failing?
   - Mock all dependencies
   - Use getRepositoryToken() for TypeORM
   - Check async/await in tests
   - Verify test module imports
```

---

## 10. Conclusion

NestJS issues often stem from its powerful but complex dependency injection system, decorator-based architecture, and TypeScript integration. The most common problems are:

1. **Missing providers or exports** (dependency injection errors)
2. **Circular dependencies** (design issues)
3. **Misleading database errors** (actually entity syntax issues)
4. **Authentication configuration** (wrong imports or missing secrets)
5. **Testing setup** (improper mocking)

By understanding these patterns and following the debugging checklist, you can:

- **Diagnose issues faster** with systematic approaches
- **Prevent common mistakes** during development
- **Build production-ready** NestJS applications
- **Debug with confidence** using proper tools and techniques

Make this guide part of your code review process and onboarding documentation. Future developers (and your on-call team) will thank you.

---

## Additional Resources

- [NestJS Official Documentation](https://docs.nestjs.com)
- [NestJS GitHub Issues](https://github.com/nestjs/nest/issues)
- [TypeORM Documentation](https://typeorm.io)
- [Passport.js Strategies](http://www.passportjs.org)
- [Jest Testing Guide](https://jestjs.io/docs/getting-started)
