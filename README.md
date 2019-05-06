# SNPKG-SNAPI-Connections :diamond_shape_with_a_dot_inside:

## Install

Install by referencing the github location and the release number:

```
npm install --save social-native/snpkg-snapi-connections#v2.0.0
```

## About

`SNPKG-SNAPI-Connections` helps handle the traversal of edges between nodes. 

In a graph, nodes connect to other nodes via edges. In the relay graphql spec, multiple edges can be represented as a single `Connection` type, which has the signature:

```typescript
type Connection {
  pageInfo: {
    hasNextPage: string
    hasPreviousPage: string
    startCursor: string
    endCursor: string
  },
  edges:  Array<{cursor: string; node: Node}>
}
```

A connection object is returned to a user when a `query request` asks for multiple child nodes connected to a parent node. 
For example, a music artist has multiple songs. In order to get all the `songs` for an `artist` you would write the graphql query request:

```graphql
query {
  artist(id: 1) {
    songs {
      songName
      songLength
    }
  }
}

```

However, sometimes you may only want a portion of the songs returned to you. To allow for this scenario, a `connection` is used to represent the response type of a `song`. 

```graphql
query {
  artist(id: 1) {
    songs {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          songName
          songLength
        }
      }
    }
  }
}

```

You can use the `cursors` (`startCursor`, `endCursor`, or `cursor`) to get the next set of edges.

```graphql
query {
  artist(id: 1) {
    songs(next: 10, after: <endCursor>) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          songName
          songLength
        }
      }
    }
  }
}

```

The above logic is controlled by the `connectionManager`. It can be added to a resolver to:

1. Create a cursor for paging through a node's edges
2. Handle movement through a node's edges using an existing cursor.
3. Support multiple input types that can sort, group, limit, and filter the edges in a connection
 

## Run locally

1. Run the migrations `NODE_ENV=development npm run migrate:latest`
2. Seed the database `NODE_ENV=development npm run seed:run`
3. Run the dev server `npm run dev`
4. Visit the GraphQL playground [http://localhost:4000/graphql](http://localhost:4000/graphql)
5. Run some queries!

```graphql
query {
  users(
      first: 100,
      orderBy: "haircolor",
      filter: { and: [
        {field: "id", operator: ">", value: "19990"},
        {field: "age", operator: "<", value: "90"},
      ]}
  ) {
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    edges {
      cursor
      node {
        username
        lastname
        id
        haircolor
        bio
      }
    }
  }
}
```

```graphql
query {
  users(
    first: 10,
    after: "eyJmaXJzdFJlc3VsdElkIjoxOTk5MiwibGFzdFJlc3VsdE"
  ) {
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
    edges {
      cursor
      node {
        username
        lastname
        id
        haircolor
        bio
      }
    }
  }
}
```

## How to use

### Short Tutorial

In short, this is what a resolver using the `connectionManager` will look like:

```typescript
// import the manager and relevant types
import {ConnectionManager, INode} from 'snpkg-snapi-connections';

const resolver = async (obj, inputArgs) => {
    // create a new node connection instance
    const nodeConnection = new ConnectionManager<
        INode,
    >(inputArgs, attributeMap);

    // apply the connection to the queryBuilder
    const appliedQuery = nodeConnection.createQuery(queryBuilder.clone());

    // run the query
    const result = await appliedQuery.select()

    // add the result to the nodeConnection
    nodeConnection.addResult(result);

    // return the relevant connection information from the resolver
    return {
        pageInfo: nodeConnection.pageInfo,
        edges: nodeConnection.edges
    };
}
```

types:

```typescript
// the type of each returned node
interface INode {
  [nodeField: string]: any
}

// input types to control the edges returned
interface IInputArgs {
  before?: string;
  after?: string;
  first?: number;
  last?: number;
  orderBy?: string;
  orderDir?: keyof typeof ORDER_DIRECTION;
  filter?: IInputFilter;
}

// map of node field to sql column name
interface IInAttributeMap {
  [nodeField: string]: string;
}

// the nodeConnection class type
interface INodeConnection {
  createQuery: (KnexQueryBuilder) => KnexQueryBuilder
  addResult: (KnexQueryResult) => void
  pageInfo?: IPageInfo 
  edges?: IEdge[]

interface IPageInfo: {
  hasNextPage: string
  hasPreviousPage: string
  startCursor: string
  endCursor: string
}
  
interface IEdge {
  cursor: string; 
  node: INode
}
```

All types can be found in [src/types.ts](./src/types.ts)

### Detailed Tutorial

A `nodeConnection` is used to handle connections.

To use a `nodeConnection` you will have to:
 1. initialize the nodeConnection
 2. build the connection query
 3.  build the connection from the executed query


#### 1. Initialize the `nodeConnection`

To correctly initialize, you will need to supply a `Node` type, the `inputArgs` args, and an `attributeMap` map:

##### A. set the `Node` type

The nodes that are part of a connection need a type. The returned edges will contain nodes of this type.

 For example, in this case we create an `IUserNode`

```typescript
interface IUserNode extends INode {
    id: number;
    createdAt: string;
}
```

##### B. add inputArgs

InputArgs supports `before`, `after`, `first`, `last`, `orderBy`, `orderDir`, and `filter`:

```typescript
interface IInputArgs {
    before?: string; // cursor
    after?: string; // cursor
    first?: number; // page size
    last?: number; // page size
    orderBy?: string; // order by a node field
    orderDir: 'asc' | 'desc'
    filter?: IOperationFilter;
}

interface IFilter {
    value: string;
    operator: string;
    field: string; // node field
}

interface IOperationFilter {
    and?: Array<IOperationFilter & IFilter>;
    or?: Array<IOperationFilter & IFilter>;
    not?: Array<IOperationFilter & IFilter>;
}
```

Note: The default filter operators are the normal SQL comparison operators: `>`, `<`, `=`, `>=`, `<=`, and `<>`

An example query with a filter could look like:

```graphql
query {
  users(filter:  { 
      or: [
        { field: "age", operator: "=", value: "40"},
        { field: "age", operator: "<", value: "30"},
        { and: [
          { field: "haircolor", operator: "=", value: "blue"},
          { field: "age", operator: "=", value: "70"},
          { or: [
            { field: "username", operator: "=", value: "Ellie86"},
            { field: "username", operator: "=", value: "Euna_Oberbrunner"},
          ]}
        ]},
      ],
    }) {
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
    edges {
      cursor
      node {
        id
        age
        haircolor
        lastname
        username
      }
    }
  }
}
```

This would yield a sql query equivalent to:

```sql
  SELECT * 
    FROM `mock` 
   WHERE `age` = '40' OR `age` < '30' OR (`haircolor` = 'blue' AND `age` = '70' AND (`username` = 'Ellie86' OR `username` = 'Euna_Oberbrunner')) 
ORDER BY `id` 
     ASC 
   LIMIT 1001
```

##### C. specify an attributeMap

`attributeMap` is a map of GraphQL field names to SQL column names

Only fields defined in the attribute map can be `orderBy` or `filtered` on. An error will be thrown if you try to filter on fields that don't exist in the map.

 ex:

 ```typescript
const attributeMap = {
    id: 'id',
    createdAt: 'created_at'
};
```

#### 2. build the query query

```typescript
// import the manager and relevant types
import {ConnectionManager, INode} from 'snpkg-snapi-connections';

const resolver = async (obj, inputArgs) => {
    // create a new node connection instance
    const nodeConnection = new ConnectionManager<
        IUserNode,
    >(inputArgs, attributeMap);

    // apply the connection to the queryBuilder
    const appliedQuery = nodeConnection.createQuery(queryBuilder.clone());

    ....
}
```

#### 3. execute the query and build the `connection`

A connection type has the signature:

```typescript
type Connection {
  pageInfo: {
    hasNextPage: string
    hasPreviousPage: string
    startCursor: string
    endCursor: string
  },
  edges:  Array<{cursor: string; node: Node}>
}
```

This type is constructed by taking the `result` of executing the query and adding it to the `connectionManager` instance via the `addResult` method.

```typescript
// import the manager and relevant types
import {ConnectionManager, INode} from 'snpkg-snapi-connections';

const resolver = async (obj, inputArgs) => {
    ...

    // run the query
    const result = await appliedQuery

    // add the result to the nodeConnection
    nodeConnection.addResult(result);

    // return the relevant connection information from the resolver
    return {
        pageInfo: nodeConnection.pageInfo,
        edges: nodeConnection.edges
    };
```

### Options

You can supply options to the `ConnectionManager` via the third parameter. Options are used to customize the `QueryContext`, the `QueryBuilder`, and the `QueryResult` classes.

```typescript
    const options = { 
      contextOptions: { ... }
      resultOptions: { ... }
      builderOptions: { ... }
    }
    const nodeConnection = new ConnectionManager(inputArgs, attributeMap, options);
```

Currently, the options are:

#### contextOptions

##### defaultLimit

```typescript
number
```

The default limit (page size) if none is specified in the `page` input params

##### cursorEncoder

```typescript
interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
```

#### builderOptions

##### filterMap

```typescript
interface IFilterMap {
  [operator: string]: string
}
```

The filter operators that can be specified in the `filter` input params.

If no map is specified, the default one is used:

```typescript
const defaultFilterMap = {
    '>': '>',
    '>=': '>=',
    '=': '=',
    '<': '<',
    '<=': '<=',
    '<>': '<>'
};
```

#### resultOptions

##### nodeTransformer

```typescript
type NodeTransformer<Node> = (node: any) => Node;
```

A function that is will be called during the creation of each node. This can be used to map the query result to a `Node` type that matches the graphql Node for the resolver.

##### cursorEncoder

```typescript
interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
```

## Extensions

To extend the connection to a new datastore or to use an adapter besides `Knex`, you will need to create a new `QueryBuilder`. See `src/KnexQueryBuilder` for an example of what a query builder looks like. It should have the type signature:

```typescript
interface IQueryBuilder<Builder> {
    createQuery: (queryBuilder: Builder) => Builder;
}
```

### Architecture

Internally, the `ConnectionManager` manages the orchestration of the `QueryContext`, `QueryBuilder`, and `QueryResult`. 

The orchestration follows the steps:

1. The `QueryContext` extracts the connection attributes from the input connection arguments. 
2. The `QueryBuilder` (or `KnexQueryBuilder` in the default case) consumes the connection attributes and builds a query. The query is submitted to the database by the user and the result is sent to the `QueryResult`. 
3. The `QueryResult` uses the result to build the `edges` (which contain a `cursor` and `node`) and extract the `page info`.

This can be visualized as such:

![Image of Architecture](https://docs.google.com/drawings/d/e/2PACX-1vRwtC2UiFwLXFDbmBNoq_6bD1YTyACV49SWHxfj2ce_K5T_XEZYlgGP7ntbcskoMVWqXp5C2Uj-K7Jj/pub?w=1163&amp;h=719)

