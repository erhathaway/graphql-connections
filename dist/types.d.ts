export interface IFilter {
    value: string;
    operator: string;
    field: string;
}
export interface ICompoundFilter {
    and?: IInputFilter[];
    or?: IInputFilter[];
    not?: IInputFilter[];
}
export declare type IInputFilter = IFilter | ICompoundFilter;
export interface ICursorObj<PublicAttributes> {
    initialSort: 'asc' | 'desc';
    orderBy: PublicAttributes;
    position: number;
    filters: IInputFilter;
}
export interface IInputArgs {
    cursor?: {
        before?: string;
        after?: string;
    };
    page?: {
        first?: number;
        last?: number;
    };
    order?: {
        orderBy?: string;
    };
    filter?: IInputFilter;
}
export interface IInAttributeMap {
    [nodeField: string]: string;
}
export interface IFilterMap {
    [nodeField: string]: string;
}
export interface IQueryContext {
    limit: number;
    orderDirection: 'asc' | 'desc';
    orderBy: string;
    filters: IInputFilter;
    offset: number;
    inputArgs: IInputArgs;
    previousCursor?: string;
    indexPosition: number;
    isPagingBackwards: boolean;
}
export interface IQueryContextOptions<CursorObj> {
    defaultLimit?: number;
    cursorEncoder?: ICursorEncoder<CursorObj>;
}
export interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
export interface IQueryBuilder<Builder> {
    createQuery: (queryBuilder: Builder) => Builder;
}
export interface IQueryBuilderOptions {
    filterMap?: {
        [operator: string]: string;
    };
}
export interface IQueryResult<Node> {
    nodes: Node[];
    edges: Array<{
        cursor: string;
        node: Node;
    }>;
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string;
        endCursor: string;
    };
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startCursor: string;
    endCursor: string;
}
export declare type NodeTransformer<Node> = (node: any) => Node;
export interface IQueryResultOptions<CursorObj, Node> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    nodeTransformer?: NodeTransformer<Node>;
}
