import { randomUUID } from 'crypto';

/**
 * In-memory stand-in for PrismaService used by the HTTP E2E suite (no Postgres/Docker needed).
 * It implements only the query surface the services use: where filters (equality, in, lt/gt,
 * contains/insensitive, OR/AND/NOT, `some` and to-one relation filters), include/select with
 * nested relations, orderBy, skip/take, nested step creation, `increment`, and transactions that
 * roll back on error like the real database.
 */

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;
type ModelName =
  'user' | 'item' | 'want' | 'swapRoute' | 'swapRouteStep' | 'notification';

interface Relation {
  model: ModelName;
  kind: 'one' | 'many';
  /** For `one`: FK on this row. For `many`: FK on the related rows pointing back here. */
  key: string;
}

const RELATIONS: Record<ModelName, Record<string, Relation>> = {
  user: {
    items: { model: 'item', kind: 'many', key: 'ownerId' },
    wants: { model: 'want', kind: 'many', key: 'userId' },
    steps: { model: 'swapRouteStep', kind: 'many', key: 'userId' },
    notifications: { model: 'notification', kind: 'many', key: 'userId' },
  },
  item: {
    owner: { model: 'user', kind: 'one', key: 'ownerId' },
    wants: { model: 'want', kind: 'many', key: 'itemId' },
  },
  want: {
    user: { model: 'user', kind: 'one', key: 'userId' },
    item: { model: 'item', kind: 'one', key: 'itemId' },
  },
  swapRoute: {
    initiator: { model: 'user', kind: 'one', key: 'initiatorId' },
    steps: { model: 'swapRouteStep', kind: 'many', key: 'routeId' },
  },
  swapRouteStep: {
    route: { model: 'swapRoute', kind: 'one', key: 'routeId' },
    user: { model: 'user', kind: 'one', key: 'userId' },
    givesItem: { model: 'item', kind: 'one', key: 'givesItemId' },
    receivesItem: { model: 'item', kind: 'one', key: 'receivesItemId' },
  },
  notification: {
    user: { model: 'user', kind: 'one', key: 'userId' },
    route: { model: 'swapRoute', kind: 'one', key: 'routeId' },
  },
};

const DEFAULTS: Record<ModelName, () => Row> = {
  user: () => ({
    avatarUrl: null,
    location: null,
    level: 1,
    rating: 5,
    tradesCompleted: 0,
    co2SavedKg: 0,
  }),
  item: () => ({
    condition: 'GOOD',
    description: null,
    estimatedValue: null,
    location: null,
    status: 'AVAILABLE',
    images: [],
    aiTags: [],
    embedding: [],
  }),
  want: () => ({
    itemId: null,
    category: null,
    minValue: null,
    maxValue: null,
    embedding: [],
  }),
  swapRoute: () => ({
    status: 'SUGGESTED',
    aiExplanation: null,
    co2SavedKg: 0,
    expiresAt: null,
  }),
  swapRouteStep: () => ({
    acceptance: 'PENDING',
    respondedAt: null,
    deliveryConfirmed: false,
  }),
  notification: () => ({ read: false, routeId: null }),
};

const HAS_UPDATED_AT = new Set<ModelName>([
  'user',
  'item',
  'swapRoute',
  'swapRouteStep',
]);

type Tables = Record<ModelName, Row[]>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date);

const comparable = (value: unknown): number | string => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' || typeof value === 'string') return value;
  return String(value);
};

const SCALAR_OPERATORS = new Set([
  'equals',
  'in',
  'notIn',
  'lt',
  'lte',
  'gt',
  'gte',
  'contains',
  'startsWith',
  'not',
  'mode',
]);

export class InMemoryPrisma {
  private tables: Tables = {
    user: [],
    item: [],
    want: [],
    swapRoute: [],
    swapRouteStep: [],
    notification: [],
  };

  private clock = 0;

  readonly user = this.delegate('user');
  readonly item = this.delegate('item');
  readonly want = this.delegate('want');
  readonly swapRoute = this.delegate('swapRoute');
  readonly swapRouteStep = this.delegate('swapRouteStep');
  readonly notification = this.delegate('notification');

  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
  async onModuleInit(): Promise<void> {}
  async onModuleDestroy(): Promise<void> {}
  async isHealthy(): Promise<boolean> {
    return true;
  }
  async $queryRawUnsafe(): Promise<number[]> {
    return [1];
  }

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    const snapshot = this.snapshot();
    try {
      return await callback(this);
    } catch (error) {
      this.tables = snapshot;
      throw error;
    }
  }

  /** Direct access for test setup and assertions. */
  rows(model: ModelName): Row[] {
    return this.tables[model];
  }

  /** Moves a route's expiry into the past (simulates 48h passing). */
  expireRoute(routeId: string): void {
    const route = this.tables.swapRoute.find((r) => r.id === routeId);
    if (route) route.expiresAt = new Date(Date.now() - 60_000);
  }

  private snapshot(): Tables {
    const copy = {} as Tables;
    for (const model of Object.keys(this.tables) as ModelName[]) {
      copy[model] = this.tables[model].map((row) => ({ ...row }));
    }
    return copy;
  }

  /** Strictly increasing timestamps keep `orderBy createdAt` deterministic. */
  private now(): Date {
    this.clock = Math.max(this.clock + 1, Date.now());
    return new Date(this.clock);
  }

  private delegate(model: ModelName) {
    return {
      findMany: async (args: Row = {}) => this.findMany(model, args),
      findFirst: async (args: Row = {}) =>
        (await this.findMany(model, args))[0] ?? null,
      findUnique: async (args: Row) =>
        (await this.findMany(model, args))[0] ?? null,
      findUniqueOrThrow: async (args: Row) => {
        const found = (await this.findMany(model, args))[0];
        if (!found) throw new Error(`${model} not found`);
        return found;
      },
      count: async (args: Row = {}) =>
        this.filter(model, args.where as Where | undefined).length,
      create: async (args: Row) => {
        const row = this.insert(model, args.data as Row);
        return this.shape(model, row, args);
      },
      createMany: async (args: Row) => {
        const data = args.data as Row[];
        data.forEach((entry) => this.insert(model, entry));
        return { count: data.length };
      },
      update: async (args: Row) => {
        const row = this.filter(model, args.where as Where)[0];
        if (!row) throw new Error(`${model} to update not found`);
        this.applyUpdate(model, row, args.data as Row);
        return this.shape(model, row, args);
      },
      updateMany: async (args: Row) => {
        const rows = this.filter(model, args.where as Where | undefined);
        rows.forEach((row) => this.applyUpdate(model, row, args.data as Row));
        return { count: rows.length };
      },
      delete: async (args: Row) => {
        const row = this.filter(model, args.where as Where)[0];
        if (!row) throw new Error(`${model} to delete not found`);
        this.tables[model] = this.tables[model].filter((r) => r !== row);
        return { ...row };
      },
      deleteMany: async (args: Row = {}) => {
        const rows = new Set(
          this.filter(model, args.where as Where | undefined),
        );
        this.tables[model] = this.tables[model].filter((r) => !rows.has(r));
        return { count: rows.size };
      },
    };
  }

  private insert(model: ModelName, data: Row): Row {
    const timestamp = this.now();
    const row: Row = {
      ...DEFAULTS[model](),
      id: randomUUID(),
      createdAt: timestamp,
      ...(HAS_UPDATED_AT.has(model) ? { updatedAt: timestamp } : {}),
    };
    const nested: Array<[string, Row]> = [];

    for (const [key, value] of Object.entries(data)) {
      const relation = RELATIONS[model][key];
      if (relation && isPlainObject(value)) {
        nested.push([key, value]);
      } else if (value !== undefined) {
        row[key] = value;
      }
    }
    this.tables[model].push(row);

    for (const [key, value] of nested) {
      const relation = RELATIONS[model][key];
      const creates = value.create;
      const list = Array.isArray(creates) ? creates : creates ? [creates] : [];
      for (const child of list as Row[]) {
        this.insert(relation.model, { ...child, [relation.key]: row.id });
      }
    }
    return row;
  }

  private applyUpdate(model: ModelName, row: Row, data: Row): void {
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (isPlainObject(value) && 'increment' in value) {
        row[key] = Number(row[key] ?? 0) + Number(value.increment);
      } else if (isPlainObject(value) && 'set' in value) {
        row[key] = value.set;
      } else {
        row[key] = value;
      }
    }
    if (HAS_UPDATED_AT.has(model) && !('updatedAt' in data)) {
      row.updatedAt = this.now();
    }
  }

  private async findMany(model: ModelName, args: Row): Promise<Row[]> {
    let rows = this.filter(model, args.where as Where | undefined);
    rows = this.sort(rows, args.orderBy);
    const skip = typeof args.skip === 'number' ? args.skip : 0;
    const take = typeof args.take === 'number' ? args.take : undefined;
    rows = rows.slice(skip, take !== undefined ? skip + take : undefined);
    return rows.map((row) => this.shape(model, row, args));
  }

  private filter(model: ModelName, where?: Where): Row[] {
    if (!where) return [...this.tables[model]];
    return this.tables[model].filter((row) => this.matches(model, row, where));
  }

  private matches(model: ModelName, row: Row, where: Where): boolean {
    return Object.entries(where).every(([key, condition]) => {
      if (condition === undefined) return true;
      if (key === 'OR') {
        return (condition as Where[]).some((w) => this.matches(model, row, w));
      }
      if (key === 'AND') {
        return (condition as Where[]).every((w) => this.matches(model, row, w));
      }
      if (key === 'NOT') {
        return !this.matches(model, row, condition as Where);
      }

      const relation = RELATIONS[model][key];
      if (relation) {
        const related = this.related(model, row, key);
        const filter = condition as Where;
        if (relation.kind === 'many') {
          const list = related as Row[];
          if ('some' in filter)
            return list.some((r) =>
              this.matches(relation.model, r, filter.some as Where),
            );
          if ('every' in filter)
            return list.every((r) =>
              this.matches(relation.model, r, filter.every as Where),
            );
          if ('none' in filter)
            return !list.some((r) =>
              this.matches(relation.model, r, filter.none as Where),
            );
          return false;
        }
        const target = related as Row | null;
        if (filter.is === null || condition === null) return target === null;
        return (
          target !== null &&
          this.matches(relation.model, target, (filter.is as Where) ?? filter)
        );
      }

      return this.matchScalar(row[key], condition);
    });
  }

  private matchScalar(value: unknown, condition: unknown): boolean {
    const isOperatorObject =
      isPlainObject(condition) &&
      Object.keys(condition).every((k) => SCALAR_OPERATORS.has(k));
    if (!isOperatorObject) {
      if (condition instanceof Date && value instanceof Date) {
        return condition.getTime() === value.getTime();
      }
      return value === condition;
    }

    const ops = condition as Record<string, unknown>;
    const insensitive = ops.mode === 'insensitive';
    const norm = (v: unknown) =>
      insensitive && typeof v === 'string' ? v.toLowerCase() : v;

    if ('equals' in ops && norm(value) !== norm(ops.equals)) return false;
    if ('in' in ops && !(ops.in as unknown[]).map(norm).includes(norm(value)))
      return false;
    if (
      'notIn' in ops &&
      (ops.notIn as unknown[]).map(norm).includes(norm(value))
    )
      return false;
    if ('not' in ops && this.matchScalar(value, ops.not)) return false;
    if ('contains' in ops) {
      if (typeof value !== 'string') return false;
      if (!String(norm(value)).includes(String(norm(ops.contains))))
        return false;
    }
    if ('startsWith' in ops) {
      if (typeof value !== 'string') return false;
      if (!String(norm(value)).startsWith(String(norm(ops.startsWith))))
        return false;
    }
    if (value === null || value === undefined) {
      return !('lt' in ops || 'lte' in ops || 'gt' in ops || 'gte' in ops);
    }
    const v = comparable(value);
    if ('lt' in ops && !(v < comparable(ops.lt))) return false;
    if ('lte' in ops && !(v <= comparable(ops.lte))) return false;
    if ('gt' in ops && !(v > comparable(ops.gt))) return false;
    if ('gte' in ops && !(v >= comparable(ops.gte))) return false;
    return true;
  }

  private related(model: ModelName, row: Row, key: string): Row | Row[] | null {
    const relation = RELATIONS[model][key];
    if (relation.kind === 'one') {
      const fk = row[relation.key];
      return this.tables[relation.model].find((r) => r.id === fk) ?? null;
    }
    return this.tables[relation.model].filter(
      (r) => r[relation.key] === row.id,
    );
  }

  private sort(rows: Row[], orderBy: unknown): Row[] {
    if (!orderBy) return rows;
    const clauses = (Array.isArray(orderBy) ? orderBy : [orderBy]) as Array<
      Record<string, 'asc' | 'desc'>
    >;
    return [...rows].sort((a, b) => {
      for (const clause of clauses) {
        const [field, direction] = Object.entries(clause)[0];
        const av = comparable(a[field]);
        const bv = comparable(b[field]);
        if (av === bv) continue;
        const result = av < bv ? -1 : 1;
        return direction === 'desc' ? -result : result;
      }
      return 0;
    });
  }

  /** Applies `select` / `include` (recursively) to a stored row, returning a detached copy. */
  private shape(model: ModelName, row: Row, args: Row): Row {
    const select = args.select as Record<string, unknown> | undefined;
    const include = args.include as Record<string, unknown> | undefined;

    const base: Row = {};
    if (select) {
      for (const [key, spec] of Object.entries(select)) {
        if (!spec) continue;
        if (RELATIONS[model][key]) {
          base[key] = this.shapeRelation(model, row, key, spec);
        } else {
          base[key] = Array.isArray(row[key])
            ? [...(row[key] as unknown[])]
            : row[key];
        }
      }
      return base;
    }

    for (const [key, value] of Object.entries(row)) {
      base[key] = Array.isArray(value) ? [...value] : value;
    }
    if (include) {
      for (const [key, spec] of Object.entries(include)) {
        if (spec && RELATIONS[model][key]) {
          base[key] = this.shapeRelation(model, row, key, spec);
        }
      }
    }
    return base;
  }

  private shapeRelation(
    model: ModelName,
    row: Row,
    key: string,
    spec: unknown,
  ): Row | Row[] | null {
    const relation = RELATIONS[model][key];
    const nestedArgs = isPlainObject(spec) ? spec : {};
    const related = this.related(model, row, key);
    if (relation.kind === 'one') {
      return related
        ? this.shape(relation.model, related as Row, nestedArgs)
        : null;
    }
    let list = related as Row[];
    if (nestedArgs.where) {
      list = list.filter((r) =>
        this.matches(relation.model, r, nestedArgs.where as Where),
      );
    }
    list = this.sort(list, nestedArgs.orderBy);
    return list.map((r) => this.shape(relation.model, r, nestedArgs));
  }
}
